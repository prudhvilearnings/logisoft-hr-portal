import os
import django
import sys

# Setup Django environment
sys_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(sys_path)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "project.settings")
django.setup()

from accounts.models import Task

print("All Tasks in Database:")
for task in Task.objects.all():
    print(f"ID: {task.id}, Title: {task.title}, Status: {task.status}, Assignee: {task.assignee.username}")
