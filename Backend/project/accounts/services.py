from django.contrib.auth import get_user_model
from .models import Team

User = get_user_model()

def create_user_service(username, email, password, role='EMPLOYEE', team_id=None, first_name='', last_name=''):
    """
    Handles business logic for creating a new user with role and optional team mapping.
    """
    team = None
    if team_id:
        try:
            team = Team.objects.get(id=team_id)
        except Team.DoesNotExist:
            pass

    user = User(
        username=username,
        email=email,
        role=role,
        team=team,
        first_name=first_name,
        last_name=last_name
    )
    user.set_password(password)
    user.save()
    return user


def assign_role_and_team_service(user, role=None, team_id=None):
    """
    Handles assigning roles and updating team membership for a user.
    """
    old_role = user.role
    if role:
        user.role = role
    
    # If the user is no longer a TEAM_LEAD, remove them as leader from any teams they led
    if old_role == 'TEAM_LEAD' and user.role != 'TEAM_LEAD':
        Team.objects.filter(leader=user).update(leader=None)

    if team_id is not None:
        try:
            team = Team.objects.get(id=team_id)
            user.team = team
            # If user is a TEAM_LEAD, make them the leader of this team
            if user.role == 'TEAM_LEAD':
                team.leader = user
                team.save()
        except Team.DoesNotExist:
            user.team = None
    elif team_id == '' or team_id is None:
        # If user is unassigned from team, clear them as leader of that team if they led it
        if user.role == 'TEAM_LEAD':
            Team.objects.filter(leader=user).update(leader=None)
        user.team = None

    user.save()
    return user
