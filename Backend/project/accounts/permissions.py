from rest_framework.permissions import BasePermission

class IsManager(BasePermission):
    """
    Allows access only to users with the MANAGER role or superusers.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            (request.user.role == 'MANAGER' or request.user.is_superuser)
        )


class IsTeamLead(BasePermission):
    """
    Allows access to users with the TEAM_LEAD/MANAGER role or superusers.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            (request.user.role in ['TEAM_LEAD', 'MANAGER'] or request.user.is_superuser)
        )


class IsEmployee(BasePermission):
    """
    Allows access to all authenticated users with valid roles or superusers.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            (request.user.role in ['EMPLOYEE', 'TEAM_LEAD', 'MANAGER'] or request.user.is_superuser)
        )
