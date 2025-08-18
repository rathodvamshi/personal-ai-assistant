# backend/app/database.py

from pymongo import MongoClient
from pymongo.collection import Collection
from app.config import settings

class Database:
    """
    Handles the connection to the MongoDB database and provides access to collections.
    """
    def __init__(self):
        # The MongoClient is initialized only once.
        self.client = MongoClient(settings.DATABASE_URL)
        # We explicitly select the database named "assistant_db".
        # You can change "assistant_db" to whatever you named it in your .env file.
        self.db = self.client["assistant_db"] 

    def get_user_collection(self) -> Collection:
        """Returns a reference to the 'users' collection."""
        return self.db.users

# Create a single instance of the Database class to be used across the application.
# This pattern ensures we don't open multiple connections unnecessarily.
db_client = Database()

# A dependency function to be used with FastAPI's dependency injection system.
# This makes it easy to get a collection object in our route handlers.
def get_user_collection() -> Collection:
    return db_client.get_user_collection()
