# backend/app/services/nlu.py

from app.services import ai_service 
import json

def get_intent(user_message: str) -> dict:
    """
    Uses the unified AI service to perform NLU on the user's message.
    """
    prompt = f"""
Analyze the user's message to identify the intent and extract entities.
The possible intents are:
1.  `save_fact`: The user is stating a fact about themselves (e.g., "My name is...", "My favorite movie is...").
2.  `schedule_task`: The user wants to set a reminder or schedule a task.
3.  `general_chat`: The user is asking a question, making a statement, or having a normal conversation.

For `save_fact`, extract `key` and `value`.
For `schedule_task`, extract `task_content` and `due_date`.

Respond ONLY with a single, raw JSON object.

User's message: "{user_message}"
JSON Response:
"""
    try:
        response_text = ai_service.generate_ai_response(prompt)
        cleaned_response = response_text.strip().replace('```json', '').replace('```', '').strip()
        result = json.loads(cleaned_response)
        return result
    except (json.JSONDecodeError, Exception) as e:
        print(f"NLU Error: Could not parse AI response. Defaulting to general_chat. Error: {e}")
        return {"intent": "general_chat", "entities": {}}
