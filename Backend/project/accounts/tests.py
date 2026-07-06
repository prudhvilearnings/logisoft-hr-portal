from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from accounts.models import Team
from chat.models import ChatSession, ChatMessage

User = get_user_model()

class AuthenticationAndRBACTests(APITestCase):

    def setUp(self):
        # Create a Manager
        self.manager = User.objects.create_user(
            username='manager_user', 
            email='manager@example.com', 
            password='Password123!', 
            role='MANAGER'
        )
        # Create a Team
        self.team = Team.objects.create(name='Eng Team', leader=None)
        
        # Create a TeamLead
        self.team_lead = User.objects.create_user(
            username='lead_user', 
            email='lead@example.com', 
            password='Password123!', 
            role='TEAM_LEAD'
        )
        self.team.leader = self.team_lead
        self.team.save()

        # Create an Employee in the team
        self.employee = User.objects.create_user(
            username='emp_user', 
            email='emp@example.com', 
            password='Password123!', 
            role='EMPLOYEE',
            team=self.team
        )

        # Create an independent Employee (no team)
        self.other_employee = User.objects.create_user(
            username='other_emp_user', 
            email='other_emp@example.com', 
            password='Password123!', 
            role='EMPLOYEE'
        )

    def test_user_registration(self):
        url = reverse('register')
        data = {
            'username': 'new_user',
            'email': 'new@example.com',
            'password': 'NewPassword123!',
            'role': 'EMPLOYEE'
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['username'], 'new_user')
        self.assertEqual(response.data['role'], 'EMPLOYEE')

    def test_jwt_login(self):
        url = reverse('login')
        data = {
            'username': 'emp_user',
            'password': 'Password123!'
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['role'], 'EMPLOYEE')

    def test_profile_retrieval(self):
        self.client.force_authenticate(user=self.employee)
        url = reverse('user_profile')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'emp_user')

    def test_manager_can_list_all_users(self):
        self.client.force_authenticate(user=self.manager)
        url = reverse('user_list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should return all 4 users created in setUp
        self.assertEqual(len(response.data), 4)

    def test_team_lead_can_only_see_assigned_employees(self):
        self.client.force_authenticate(user=self.team_lead)
        url = reverse('user_list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should return 1 user (emp_user, who is in lead_user's team).
        # other_emp_user is not in their team, lead_user is excluded from results.
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['username'], 'emp_user')

    def test_employee_cannot_list_users(self):
        self.client.force_authenticate(user=self.employee)
        url = reverse('user_list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_manager_assign_role_and_team(self):
        self.client.force_authenticate(user=self.manager)
        url = reverse('assign_role', kwargs={'pk': self.other_employee.id})
        data = {
            'role': 'TEAM_LEAD',
            'team_id': self.team.id
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.other_employee.refresh_from_db()
        self.assertEqual(self.other_employee.role, 'TEAM_LEAD')
        self.assertEqual(self.other_employee.team, self.team)


class ChatbotAPITests(APITestCase):

    def setUp(self):
        self.manager = User.objects.create_user(
            username='manager_user', email='manager@example.com', password='Password123!', role='MANAGER'
        )
        self.team = Team.objects.create(name='Design Team')
        self.team_lead = User.objects.create_user(
            username='lead_user', email='lead@example.com', password='Password123!', role='TEAM_LEAD'
        )
        self.team.leader = self.team_lead
        self.team.save()

        self.employee = User.objects.create_user(
            username='emp_user', email='emp@example.com', password='Password123!', role='EMPLOYEE', team=self.team
        )
        self.other_employee = User.objects.create_user(
            username='other_emp_user', email='other_emp@example.com', password='Password123!', role='EMPLOYEE'
        )

        # Create sessions
        self.emp_session = ChatSession.objects.create(user=self.employee, title="Employee Chat")
        self.other_emp_session = ChatSession.objects.create(user=self.other_employee, title="Other Employee Chat")

        # Save some messages
        ChatMessage.objects.create(session=self.emp_session, sender='USER', content="Hello Bot")
        ChatMessage.objects.create(session=self.emp_session, sender='AI', content="Hello Employee")

    def test_send_message_creates_session_and_saves_dialogue(self):
        self.client.force_authenticate(user=self.employee)
        url = reverse('chat_send')
        data = {
            'content': 'How does RAG work?',
            'title': 'RAG Discussion'
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('session_id', response.data)
        self.assertEqual(response.data['session_title'], 'RAG Discussion')
        self.assertEqual(response.data['user_message']['content'], 'How does RAG work?')
        self.assertIn('placeholder response', response.data['ai_message']['content'])

    def test_employee_can_only_view_own_chat_history(self):
        self.client.force_authenticate(user=self.employee)
        url = reverse('chat_history')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should only see their session
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], 'Employee Chat')

    def test_team_lead_can_view_assigned_employees_chat_history(self):
        self.client.force_authenticate(user=self.team_lead)
        url = reverse('chat_history')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should see their own (if any) and self.employee's chat history
        # (emp_user is in the team led by lead_user, other_emp_user is not).
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], 'Employee Chat')

    def test_manager_can_view_all_chat_history(self):
        self.client.force_authenticate(user=self.manager)
        url = reverse('chat_history')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should see both sessions
        self.assertEqual(len(response.data), 2)
