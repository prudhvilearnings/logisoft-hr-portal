import os
import django
import sys

# Setup Django environment
sys_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(sys_path)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "project.settings")
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()
print("All Users in Database:")
for user in User.objects.all():
    print(f"Username: {user.username}, Email: {user.email}, Role: {user.role}, IsActive: {user.is_active}, HasPassword: {user.has_usable_password()}")
