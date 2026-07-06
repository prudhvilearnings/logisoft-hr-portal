from rest_framework import status, generics
from rest_framework.exceptions import PermissionDenied
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.db.models import Q

from .serializers import (
    CustomTokenObtainPairSerializer,
    UserRegisterSerializer,
    UserSerializer,
    AssignRoleSerializer,
    TeamSerializer,
    TaskSerializer
)
from .permissions import IsManager, IsTeamLead, IsEmployee
from .services import create_user_service, assign_role_and_team_service
from .models import Team, Task

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    """
    Public endpoint for registering a user.
    """
    permission_classes = [AllowAny]
    serializer_class = UserRegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = create_user_service(
            username=serializer.validated_data['username'],
            email=serializer.validated_data['email'],
            password=serializer.validated_data['password'],
            role=serializer.validated_data.get('role', 'EMPLOYEE'),
            team_id=serializer.validated_data.get('team').id if serializer.validated_data.get('team') else None,
            first_name=serializer.validated_data.get('first_name', ''),
            last_name=serializer.validated_data.get('last_name', '')
        )
        
        response_serializer = UserSerializer(user)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class LoginView(TokenObtainPairView):
    """
    Public endpoint for logging in. Returns access + refresh tokens and custom user payload.
    """
    permission_classes = [AllowAny]
    serializer_class = CustomTokenObtainPairSerializer


class LogoutView(APIView):
    """
    Authenticated endpoint to blacklist refresh token on logout.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if not refresh_token:
                return Response({"detail": "Refresh token is required."}, status=status.HTTP_400_BAD_REQUEST)
            
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"detail": "Successfully logged out."}, status=status.HTTP_205_RESET_CONTENT)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class UserProfileView(generics.RetrieveAPIView):
    """
    Returns the authenticated user's profile.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class UserListView(generics.ListAPIView):
    """
    Lists users based on RBAC requirements:
    - Manager: Can view all employees and team leads.
    - TeamLead: Can view assigned employees only.
    - Employee: Cannot access (handled by permission_classes).
    """
    permission_classes = [IsTeamLead]
    serializer_class = UserSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'MANAGER':
            return User.objects.all().order_by('-date_joined')
        elif user.role == 'TEAM_LEAD':
            # View employees that are in teams where this user is the leader, OR unassigned employees
            return User.objects.filter(
                Q(team__leader=user) | Q(team__isnull=True),
                role='EMPLOYEE'
            ).exclude(id=user.id).order_by('-date_joined')
        return User.objects.none()


class AssignRoleView(APIView):
    """
    Manager/TeamLead endpoint to assign roles and teams to users.
    - Managers can assign any role and team.
    - Team Leads can only assign employees to the team they lead.
    """
    permission_classes = [IsTeamLead]

    def post(self, request, pk):
        try:
            target_user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = AssignRoleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        role = serializer.validated_data.get('role')
        team_id = serializer.validated_data.get('team_id')

        requesting_user = request.user
        if requesting_user.role == 'TEAM_LEAD':
            # 1. Team Leads can only modify employees
            if target_user.role != 'EMPLOYEE':
                return Response({"detail": "Team Leads can only modify employees."}, status=status.HTTP_403_FORBIDDEN)
            # 2. Team Leads cannot change the role of the employee
            if role and role != 'EMPLOYEE':
                return Response({"detail": "Team Leads cannot change employee roles."}, status=status.HTTP_403_FORBIDDEN)
            # 3. Team Leads can only assign employees to the team they lead (or unassign them)
            led_team = Team.objects.filter(leader=requesting_user).first()
            if not led_team:
                return Response({"detail": "You do not lead any teams, so you cannot assign employees."}, status=status.HTTP_403_FORBIDDEN)
            if team_id is not None and team_id != led_team.id:
                return Response({"detail": f"You can only assign employees to your team ({led_team.name})."}, status=status.HTTP_403_FORBIDDEN)

        updated_user = assign_role_and_team_service(target_user, role=role, team_id=team_id)
        
        return Response(UserSerializer(updated_user).data, status=status.HTTP_200_OK)


class TeamListCreateView(generics.ListCreateAPIView):
    """
    Endpoint for Managers to create/list teams.
    """
    permission_classes = [IsManager]
    queryset = Team.objects.all()
    serializer_class = TeamSerializer


class TaskListCreateView(generics.ListCreateAPIView):
    """
    Endpoint to list and create tasks.
    """
    permission_classes = [IsEmployee]
    serializer_class = TaskSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'MANAGER':
            return Task.objects.all().order_by('-created_at')
        elif user.role == 'TEAM_LEAD':
            # See tasks created by them, assigned to them, or assigned to members of teams they lead
            return Task.objects.filter(
                Q(created_by=user) | Q(assignee=user) | Q(assignee__team__leader=user)
            ).distinct().order_by('-created_at')
        
        # Employees see only their assigned tasks
        return Task.objects.filter(assignee=user).order_by('-created_at')

    def perform_create(self, serializer):
        user = self.request.user
        # Enforce that only Team Leads and Managers can create tasks
        if user.role not in ['MANAGER', 'TEAM_LEAD']:
            raise PermissionDenied("Only Team Leads and Managers can create tasks.")
        serializer.save(created_by=user)


class TaskRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    """
    Endpoint to retrieve, update, or delete a task.
    """
    permission_classes = [IsEmployee]
    serializer_class = TaskSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'MANAGER':
            return Task.objects.all()
        elif user.role == 'TEAM_LEAD':
            return Task.objects.filter(
                Q(created_by=user) | Q(assignee=user) | Q(assignee__team__leader=user)
            ).distinct()
        return Task.objects.filter(assignee=user)

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        user = request.user
        # Write operations (PUT, PATCH, DELETE)
        if request.method in ['PUT', 'PATCH', 'DELETE']:
            if user.role == 'EMPLOYEE':
                # Allow employees to update status of their own assigned tasks
                if request.method == 'PATCH' and set(request.data.keys()) == {'status'} and obj.assignee == user:
                    pass
                else:
                    self.permission_denied(request, message="Employees can only update the status of their assigned tasks.")
            elif user.role == 'TEAM_LEAD':
                # Team Leads can only modify tasks they created
                if obj.created_by != user:
                    self.permission_denied(request, message="Team Leads can only modify tasks they created.")
