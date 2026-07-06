import os
import django

# Setup Django environment
sys_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
import sys
sys.path.append(sys_path)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "project.settings")
django.setup()

from django.contrib.auth import get_user_model
from chat.services import get_mock_ai_response

User = get_user_model()
user = User.objects.filter(is_superuser=False).first()
if not user:
    user = User.objects.first()

print(f"Testing with user: {user.username if user else 'None'}")
try:
    response = get_mock_ai_response("tasks", user)
    print("RESPONSE:")
    print(response)
except Exception as e:
    print("ERROR:", str(e))
