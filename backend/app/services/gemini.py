# backend/app/services/gemini.py

import google.generativeai as genai
from google.api_core import exceptions
from app.config import settings

# A global variable to keep track of which API key we are currently using.
current_key_index = 0
api_keys = settings.GEMINI_API_KEYS

def generate_ai_response(prompt: str) -> str:
    """
    Generates a response from the Gemini AI model.
    If the current API key is rate-limited, it automatically switches to the next available key.
    """
    global current_key_index
    if not api_keys:
        return "Error: No Gemini API keys are configured."

    # We will try each key once per request, starting from the current index.
    start_index = current_key_index
    
    while True:
        try:
            # Select the key and configure the API
            key_to_try = api_keys[current_key_index]
            genai.configure(api_key=key_to_try)
            model = genai.GenerativeModel('gemini-1.5-flash-latest')
            
            # Attempt to generate content
            response = model.generate_content(prompt)
            return response.text

        except exceptions.ResourceExhausted as e:
            print(f"API key at index {current_key_index} is rate-limited. Trying next key.")
            
            # Move to the next key in the list, wrapping around if necessary
            current_key_index = (current_key_index + 1) % len(api_keys)
            
            # If we have tried all keys and are back where we started, all keys are exhausted.
            if current_key_index == start_index:
                print("All available API keys are rate-limited.")
                return "I'm experiencing a high volume of requests across all channels. Please try again in a little while."
        
        except Exception as e:
            print(f"An error occurred while generating AI response: {e}")
            return "Sorry, I'm having trouble connecting to my brain right now. Please try again later."
