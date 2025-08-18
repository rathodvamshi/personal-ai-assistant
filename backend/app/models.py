# backend/app/models.py

from pydantic import BaseModel, EmailStr
from typing import Optional

# --- User Models ---

class UserCreate(BaseModel):
    """Model for creating a new user. Expects email and password."""
    email: EmailStr
    password: str

class UserInDB(BaseModel):
    """Model representing a user as stored in the database."""
    email: EmailStr
    hashed_password: str

class UserPublic(BaseModel):
    """Model for user data that is safe to be sent to the client."""
    id: str
    email: EmailStr

# --- Token Models ---

class Token(BaseModel):
    """Model for the response when a user logs in."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenRefresh(BaseModel):
    """Model for the request to refresh an access token."""
    refresh_token: str
