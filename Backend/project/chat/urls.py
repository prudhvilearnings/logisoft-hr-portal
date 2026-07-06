from django.urls import path
from .views import SendMessageView, ChatHistoryView

urlpatterns = [
    path('send/', SendMessageView.as_view(), name='chat_send'),
    path('history/', ChatHistoryView.as_view(), name='chat_history'),
]
