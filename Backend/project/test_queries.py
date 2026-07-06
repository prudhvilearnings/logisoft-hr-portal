import os
import django
import sys

# Setup Django environment
sys_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(sys_path)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "project.settings")
django.setup()

from django.contrib.auth import get_user_model
from chat.services import get_mock_ai_response

User = get_user_model()
user = User.objects.filter(is_superuser=False).first()
if not user:
    user = User.objects.first()

queries = [
    "what is my team?",
    "who is Sujith?",
    "tell me about Logisoft",
    "tasks",
    "what is the capital of France?"
]

print(f"Testing queries for user: {user.username if user else 'None'}")
for q in queries:
    print(f"\nQUERY: '{q}'")
    try:
        response = get_mock_ai_response(q, user)
        print("RESPONSE:")
        print(response)
    except Exception as e:
        print("ERROR:", str(e))
