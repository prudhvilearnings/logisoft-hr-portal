from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, Team

class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = ['username', 'email', 'role', 'team', 'is_staff', 'is_active']
    fieldsets = UserAdmin.fieldsets + (
        ('Custom Roles & Teams', {'fields': ('role', 'team')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Custom Roles & Teams', {'fields': ('role', 'team')}),
    )

class TeamAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'leader']
    search_fields = ['name']

admin.site.register(CustomUser, CustomUserAdmin)
admin.site.register(Team, TeamAdmin)
