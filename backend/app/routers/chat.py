# backend/app/routers/chat.py

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app import security
from app.services import gemini # Import the new gemini service
from fastapi.security import OAuth2PasswordBearer

router = APIRouter(
    prefix="/chat",
    tags=["Chat"]
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

class ChatMessage(BaseModel):
    message: str

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    return security.verify_token(token, credentials_exception)


@router.post("/")
async def handle_chat_message(
    chat_message: ChatMessage, 
    current_user: security.TokenData = Depends(get_current_user)
):
    """
    Handles incoming chat messages and gets an intelligent response from Gemini.
    """
    user_message = chat_message.message
    
    # Call our new AI service to get a real response
    ai_response = gemini.generate_ai_response(prompt=user_message)
    
    return {"response": ai_response}
