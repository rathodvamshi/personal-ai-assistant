# backend/app/services/nlu.py

from app.services import ai_service 
import json
from datetime import datetime

def get_structured_intent(user_message: str) -> dict:
    """
    Uses the unified AI service to perform advanced NLU on the user's message,
    returning structured JSON for task management.
    """
    # Provide the current time to the AI for accurate date/time parsing.
    current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    prompt = f"""
You are a highly intelligent NLU (Natural Language Understanding) engine for a personal productivity app.
Your only job is to analyze the user's message and convert it into a structured, machine-readable JSON object.
**You must respond ONLY with the raw JSON object and nothing else.**

Current Time for reference: {current_time}

Analyze the user's message based on the following actions:

1.  **create_task**: If the user wants to create a reminder or task (e.g., "Remind me to...", "Schedule...", "Add task...").
    - **Crucially, you MUST convert all relative dates and times (like "in 3 minutes", "tomorrow at 5pm", or "next Monday") into the absolute "YYYY-MM-DD HH:MM" format based on the current time provided.**
    - Infer priority (high, medium, low) if mentioned, otherwise default to "medium".
    - Infer category (work, personal, general) if possible, otherwise default to "general".
    - The JSON format MUST be:
      {{"action": "create_task", "data": {{"title": "...", "datetime": "YYYY-MM-DD HH:MM", "priority": "...", "category": "...", "notes": "..."}}}}

2.  **fetch_tasks**: If the user asks to see their tasks (e.g., "What are my tasks?").
    - The JSON format MUST be:
      {{"action": "fetch_tasks"}}

3.  **save_fact**: If the user is stating a fact to be remembered (e.g., "My name is...").
    - The JSON format MUST be:
      {{"action": "save_fact", "data": {{"key": "...", "value": "..."}}}}

4.  **general_chat**: If the message does not fit any of the above categories.
    - The JSON format MUST be:
      {{"action": "general_chat"}}


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
        return {"action": "general_chat"}
