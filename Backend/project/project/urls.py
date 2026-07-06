"""
URL configuration for project project.
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Accounts & Authentication Endpoints
    path('api/', include('accounts.urls')),
    
    # Chat & Bot Endpoints
    path('api/chat/', include('chat.urls')),
]
