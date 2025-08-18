# backend/app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, chat

app = FastAPI(title="Personal AI Assistant API")

# --- CORS Configuration ---
# This is the crucial part to fix the "Network Error".
# It explicitly gives permission to your frontend (running on http://localhost:3000)
# to make requests to this backend.

origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Allows your React app's origin
    allow_credentials=True, # Allows cookies/tokens to be sent
    allow_methods=["*"],    # Allows all request methods (POST, GET, etc.)
    allow_headers=["*"],    # Allows all request headers
)


# Include the application routers
app.include_router(auth.router)
app.include_router(chat.router)

@app.get("/", tags=["Root"])
def read_root():
    """A simple endpoint to confirm the API is running."""
    return {"status": "API is running"}
