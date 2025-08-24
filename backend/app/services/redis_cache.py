# backend/app/services/redis_cache.py

import redis
import json
from typing import List, Dict, Optional

# In a local setup without Docker, Redis typically runs on this host and port.
REDIS_HOST = "localhost"
REDIS_PORT = 6379
CONTEXT_EXPIRATION_SECONDS = 3600 # 1 hour

_redis_client: Optional[redis.Redis] = None


def get_redis_client() -> Optional[redis.Redis]:
	global _redis_client
	if _redis_client is not None:
		return _redis_client
	try:
		client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0, decode_responses=True)
		# Only cache the client if the ping succeeds
		client.ping()
		_redis_client = client
		return _redis_client
	except Exception:
		# Return None if Redis is unavailable; callers should handle gracefully
		return None


def get_conversation_context(session_id: str) -> List[Dict[str, str]]:
	"""Retrieves the recent conversation history for a given session ID."""
	client = get_redis_client()
	if not client:
		return []
	try:
		context_json = client.get(session_id)
		if context_json:
			return json.loads(context_json)
		return []
	except Exception:
		return []


def set_conversation_context(session_id: str, new_message: Dict[str, str]):
	"""Adds a new message to the conversation history and resets the expiration time."""
	client = get_redis_client()
	if not client:
		return
	try:
		current_context = get_conversation_context(session_id)
		current_context.append(new_message)
		# Keep only the last 10 messages to prevent the context from growing too large
		updated_context = current_context[-10:]
		client.set(session_id, json.dumps(updated_context), ex=CONTEXT_EXPIRATION_SECONDS)
	except Exception:
		return

