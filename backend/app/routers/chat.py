# backend/app/routers/chat.py

from fastapi import APIRouter, Depends, status, Response
from pydantic import BaseModel
from pymongo.collection import Collection
from bson import ObjectId, errors
from app import security
from app.services import ai_service, redis_cache, nlu
from app.database import get_user_profile_collection, get_chat_log_collection, get_tasks_collection
from fastapi.security import OAuth2PasswordBearer
from datetime import datetime
from app.celery_worker import celery_app
import dateparser
from typing import Optional

router = APIRouter(prefix="/chat", tags=["Chat"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

class ChatMessage(BaseModel):
    message: str

class TaskFullUpdate(BaseModel):
    content: Optional[str] = None
    due_date: Optional[str] = None

class TaskCreate(BaseModel):
    content: str
    due_date: str

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
    # ... (This logic is unchanged)
    user_email = current_user.username
    user_message = chat_message.message
    ai_response = ""
    nlu_result = nlu.get_structured_intent(user_message)
    action = nlu_result.get("action")
    if action == "create_task":
        task_data = nlu_result.get("data", {})
        task_title = task_data.get("title")
        task_datetime_str = task_data.get("datetime")
        if not task_title or not task_datetime_str:
            ai_response = "I'm sorry, I couldn't understand all the details for that task. Could you please try rephrasing it?"
        else:
            due_date = dateparser.parse(task_datetime_str)
            if due_date:
                formatted_due_date = due_date.strftime('%Y-%m-%d %H:%M')
                tasks.insert_one({"email": user_email, "content": task_title, "due_date_str": formatted_due_date, "status": "pending", "created_at": datetime.utcnow()})
                delay = (due_date - datetime.now()).total_seconds()
                if delay > 0:
                    celery_app.send_task("send_reminder_email", args=[user_email, task_title], countdown=delay)
                    ai_response = f"Okay, I've scheduled it: '{task_title}' for {formatted_due_date}. I will send you an email reminder then."
                else:
                    ai_response = f"Okay, I've scheduled it: '{task_title}' for {formatted_due_date}. Since that time is in the past, I won't send an email reminder."
            else:
                ai_response = f"Okay, I've scheduled the task '{task_title}', but I couldn't set an email reminder due to an issue with the date format."
    elif action == "fetch_tasks":
        task_cursor = tasks.find({"email": user_email, "status": "pending"}).sort("created_at", 1)
        task_list = [f"- {t['content']} (Due: {t['due_date_str']})" for t in task_cursor]
        ai_response = "Here are your upcoming tasks:\n" + "\n".join(task_list) if task_list else "You have no pending tasks."
    elif action == "save_fact":
        fact_data = nlu_result.get("data", {})
        fact_key = fact_data.get("key", "").lower().replace("_", " ")
        fact_value = fact_data.get("value")
        if fact_key and fact_value:
            user_profiles.update_one({"email": user_email, "facts.key": fact_key}, {"$set": {"facts.$.value": fact_value}}, upsert=False)
            if user_profiles.find_one({"email": user_email, "facts.key": fact_key}) is None:
                 user_profiles.update_one({"email": user_email}, {"$push": {"facts": {"key": fact_key, "value": fact_value}}, "$setOnInsert": {"email": user_email}}, upsert=True)
            ai_response = f"Got it. I'll remember that your {fact_key} is {fact_value}."
        else:
            ai_response = "I couldn't quite understand that fact. Could you try rephrasing?"
    else:
        profile = user_profiles.find_one({"email": user_email})
        user_facts = "\n".join([f"- {fact['key']}: {fact['value']}" for fact in profile.get("facts", [])]) if profile else ""
        conversation_history = redis_cache.get_conversation_context(user_email)
        history_formatted = "\n".join([f"{msg['role']}: {msg['content']}" for msg in conversation_history])
        prompt = f"""You are a helpful and friendly personal assistant named Maya. <user_facts>{user_facts if user_facts else "You do not yet know any facts about the user."}</user_facts> <conversation_history>{history_formatted if history_formatted else "This is the beginning of the conversation."}</conversation_history> Based on all the information above, respond to the user's message. User Message: "{user_message}" Your Response:"""
        ai_response = ai_service.generate_ai_response(prompt=prompt)
    chat_logs.insert_one({"email": user_email, "sender": "user", "text": user_message, "timestamp": datetime.utcnow()})
    chat_logs.insert_one({"email": user_email, "sender": "assistant", "text": ai_response, "timestamp": datetime.utcnow()})
    redis_cache.set_conversation_context(user_email, {"role": "user", "content": user_message})
    redis_cache.set_conversation_context(user_email, {"role": "assistant", "content": ai_response})
    return {"response": ai_response}

@router.get("/history")
async def get_chat_history(current_user: security.TokenData = Depends(get_current_user), chat_logs: Collection = Depends(get_chat_log_collection)):
    user_email = current_user.username
    history_cursor = chat_logs.find({"email": user_email}).sort("timestamp", 1).limit(50)
    history = [{"sender": msg["sender"], "text": msg["text"]} for msg in history_cursor]
    return history

@router.get("/tasks")
async def get_tasks(current_user: security.TokenData = Depends(get_current_user), tasks: Collection = Depends(get_tasks_collection)):
    user_email = current_user.username
    task_cursor = tasks.find({"email": user_email, "status": "pending"}).sort("created_at", -1)
    task_list = [{"id": str(task["_id"]), "content": task.get("content"), "due_date": task.get("due_date_str")} for task in task_cursor]
    return task_list

@router.get("/tasks/history")
async def get_task_history(current_user: security.TokenData = Depends(get_current_user), tasks: Collection = Depends(get_tasks_collection)):
    user_email = current_user.username
    task_cursor = tasks.find({"email": user_email, "status": "done"}).sort("created_at", -1).limit(10)
    task_list = [{"id": str(task["_id"]), "content": task.get("content"), "due_date": task.get("due_date_str")} for task in task_cursor]
    return task_list

@router.post("/tasks")
async def create_task(task_create: TaskCreate, current_user: security.TokenData = Depends(get_current_user), tasks: Collection = Depends(get_tasks_collection)):
    user_email = current_user.username
    new_task = {"email": user_email, "content": task_create.content, "due_date_str": task_create.due_date, "status": "pending", "created_at": datetime.utcnow()}
    result = tasks.insert_one(new_task)
    return {"status": "success", "message": "Task created.", "task_id": str(result.inserted_id)}

@router.put("/tasks/{task_id}")
async def update_task(
    task_id: str,
    task_update: TaskFullUpdate, # Use the new, more flexible model
    current_user: security.TokenData = Depends(get_current_user),
    tasks: Collection = Depends(get_tasks_collection)
):
    """Endpoint to edit all details of a specific task."""
    user_email = current_user.username
    update_data = {}
    if task_update.content is not None:
        update_data["content"] = task_update.content
    if task_update.due_date is not None:
        update_data["due_date_str"] = task_update.due_date
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided.")

    try:
        result = tasks.update_one(
            {"_id": ObjectId(task_id), "email": user_email},
            {"$set": update_data}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Task not found.")
        return {"status": "success"}
    except errors.InvalidId:
        raise HTTPException(status_code=400, detail="Invalid task ID.")

@router.put("/tasks/{task_id}/done")
async def mark_task_as_done(task_id: str, current_user: security.TokenData = Depends(get_current_user), tasks: Collection = Depends(get_tasks_collection)):
    user_email = current_user.username
    try:
        result = tasks.update_one({"_id": ObjectId(task_id), "email": user_email}, {"$set": {"status": "done"}})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Task not found.")
        return {"status": "success"}
    except errors.InvalidId:
        raise HTTPException(status_code=400, detail="Invalid task ID.")

@router.delete("/history/clear")
async def clear_chat_history(current_user: security.TokenData = Depends(get_current_user), chat_logs: Collection = Depends(get_chat_log_collection)):
    user_email = current_user.username
    result = chat_logs.delete_many({"email": user_email})
    if redis_cache.redis_client:
        redis_cache.redis_client.delete(user_email)
    return {"status": "success", "message": f"Deleted {result.deleted_count} messages."}
