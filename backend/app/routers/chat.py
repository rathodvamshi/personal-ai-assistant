# backend/app/routers/chat.py

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from pymongo.collection import Collection
from app import security
from app.services import ai_service, redis_cache, nlu
from app.database import get_user_profile_collection, get_chat_log_collection, get_tasks_collection
from fastapi.security import OAuth2PasswordBearer
from datetime import datetime

router = APIRouter(prefix="/chat", tags=["Chat"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

class ChatMessage(BaseModel):
    message: str

async def get_current_user(token: str = Depends(oauth2_scheme)):
    from fastapi import HTTPException
    credentials_exception = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials", headers={"WWW-Authenticate": "Bearer"})
    return security.verify_token(token, credentials_exception)

@router.post("/")
async def handle_chat_message(
    chat_message: ChatMessage, 
    current_user: security.TokenData = Depends(get_current_user),
    user_profiles: Collection = Depends(get_user_profile_collection),
    chat_logs: Collection = Depends(get_chat_log_collection),
    tasks: Collection = Depends(get_tasks_collection)
):
    user_email = current_user.username
    user_message = chat_message.message
    ai_response = ""

    intent_data = nlu.get_intent(user_message)
    intent = intent_data.get("intent")
    entities = intent_data.get("entities", {})
    profile = user_profiles.find_one({"email": user_email})

    if intent == "save_fact" and "key" in entities and "value" in entities:
        fact_key = entities["key"].lower().replace("_", " ")
        fact_value = entities["value"]
        fact_exists = user_profiles.find_one({"email": user_email, "facts.key": fact_key})
        if fact_exists:
            user_profiles.update_one({"email": user_email, "facts.key": fact_key}, {"$set": {"facts.$.value": fact_value}})
        else:
            user_profiles.update_one({"email": user_email}, {"$push": {"facts": {"key": fact_key, "value": fact_value}}, "$setOnInsert": {"email": user_email}}, upsert=True)
        ai_response = f"Got it. I'll remember that your {fact_key} is {fact_value}."

    elif intent == "schedule_task" and "task_content" in entities and "due_date" in entities:
        task_content = entities["task_content"]
        due_date = entities["due_date"]
        tasks.insert_one({"email": user_email, "content": task_content, "due_date_str": due_date, "status": "pending", "created_at": datetime.utcnow()})
        ai_response = f"Okay, I've scheduled a reminder for you to '{task_content}' on {due_date}."

    else: # Default to general_chat
        user_facts = ""
        if profile and profile.get("facts"):
            facts_list = [f"- {fact['key']}: {fact['value']}" for fact in profile["facts"]]
            user_facts = "\n".join(facts_list)
        conversation_history = redis_cache.get_conversation_context(user_email)
        history_formatted = "\n".join([f"{msg['role']}: {msg['content']}" for msg in conversation_history])
        
        # --- PERFECTED PROMPT V2 ---
        # This more structured prompt helps the AI differentiate context from instructions.
        prompt = f"""
You are a helpful and friendly personal assistant named Maya.

You have access to the following information to inform your response:
<user_facts>
{user_facts if user_facts else "You do not yet know any facts about the user."}
</user_facts>

<conversation_history>
{history_formatted if history_formatted else "This is the beginning of the conversation."}
</conversation_history>

Based on all the information above, provide a helpful and conversational response to the user's latest message.
- When the user asks a question about themselves (like "what is my favorite movie?"), you MUST find the answer in the <user_facts> section and state it directly.
- When the user uses a pronoun (like "it"), you MUST use the <conversation_history> to understand the context.

User Message: "{user_message}"
Your Response:
"""
        ai_response = ai_service.generate_ai_response(prompt=prompt)

    # Save messages to database
    chat_logs.insert_one({"email": user_email, "sender": "user", "text": user_message, "timestamp": datetime.utcnow()})
    chat_logs.insert_one({"email": user_email, "sender": "assistant", "text": ai_response, "timestamp": datetime.utcnow()})

    # Update short-term memory in Redis
    redis_cache.set_conversation_context(user_email, {"role": "user", "content": user_message})
    redis_cache.set_conversation_context(user_email, {"role": "assistant", "content": ai_response})
    
    return {"response": ai_response}
