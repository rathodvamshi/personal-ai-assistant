# backend/app/services/gemini.py

import google.generativeai as genai
from app.config import settings

# Configure the generative AI model with the API key
try:
    genai.configure(api_key=settings.GEMINI_API_KEY)
    # --- UPDATED MODEL NAME ---
    # We are using a newer, recommended model name.
    model = genai.GenerativeModel('gemini-1.5-flash-latest') 
except Exception as e:
    print(f"Error configuring Gemini AI: {e}")
    model = None

def generate_ai_response(prompt: str) -> str:
    """
    Generates a response from the Gemini AI model based on a given prompt.
    Includes basic error handling.
    """
    if not model:
        return "Error: The AI model is not configured correctly. Please check the API key."

    try:
        # The main call to the Gemini API
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        # Handle potential API errors (e.g., network issues, invalid key)
        print(f"An error occurred while generating AI response: {e}")
        return "Sorry, I'm having trouble connecting to my brain right now. Please try again later."
