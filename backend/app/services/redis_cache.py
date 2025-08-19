# backend/app/services/redis_cache.py

import redis
import json
from typing import List, Dict

# In a local setup without Docker, Redis typically runs on this host and port.
REDIS_HOST = "localhost"
REDIS_PORT = 6379
CONTEXT_EXPIRATION_SECONDS = 3600 # 1 hour

try:
    # Connect to the local Redis instance
    redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0, decode_responses=True)
    # Check if the connection is successful
    redis_client.ping()
    print("Successfully connected to Redis.")
except redis.exceptions.ConnectionError as e:
    print(f"Error connecting to Redis: {e}")
    redis_client = None

def get_conversation_context(session_id: str) -> List[Dict[str, str]]:
    """Retrieves the recent conversation history for a given session ID."""
    if not redis_client:
        return []
    try:
        context_json = redis_client.get(session_id)
        if context_json:
            return json.loads(context_json)
        return []
    except Exception as e:
        print(f"Error retrieving context from Redis: {e}")
        return []

def set_conversation_context(session_id: str, new_message: Dict[str, str]):
    """Adds a new message to the conversation history and resets the expiration time."""
    if not redis_client:
        return
    try:
        current_context = get_conversation_context(session_id)
        current_context.append(new_message)
        
        # Keep only the last 10 messages to prevent the context from growing too large
        updated_context = current_context[-10:]
        
        redis_client.set(session_id, json.dumps(updated_context), ex=CONTEXT_EXPIRATION_SECONDS)
    except Exception as e:
        print(f"Error setting context in Redis: {e}")

