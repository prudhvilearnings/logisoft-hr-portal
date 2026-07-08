import google.generativeai as genai
import sys

import os
from dotenv import load_dotenv

# Load env variables from Backend/project/.env if it exists
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

api_key = os.environ.get("GEMINI_API_KEY")

# Fallback: check api_key.txt in root directory
if not api_key:
    root_api_key_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'api_key.txt')
    if os.path.exists(root_api_key_path):
        with open(root_api_key_path, 'r') as f:
            api_key = f.read().strip()

if not api_key:
    print("ERROR: GEMINI_API_KEY environment variable is not set and api_key.txt was not found.")
    sys.exit(1)

genai.configure(api_key=api_key)


try:
    print("Testing gemini-2.0-flash...")
    model = genai.GenerativeModel(
        model_name="gemini-2.0-flash",
        system_instruction="You are a helpful assistant."
    )
    response = model.generate_content("hello")
    print("SUCCESS with 2.0-flash:", response.text)
except Exception as e:
    print("FAILED with 2.0-flash:", str(e))
    sys.exit(1)
