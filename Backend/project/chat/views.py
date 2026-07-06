from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from django.core.exceptions import PermissionDenied

from .models import ChatSession, ChatMessage
from .serializers import SendMessageSerializer, ChatSessionSerializer, ChatMessageSerializer
from .services import get_mock_ai_response, create_or_get_session, save_message
from accounts.permissions import IsEmployee

class SendMessageView(APIView):
    """
    Endpoint: POST /api/chat/send/
    Sends a message to a session, invokes the mock AI service, and returns the chatbot's reply.
    """
    permission_classes = [IsAuthenticated, IsEmployee]

    def post(self, request):
        serializer = SendMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        session_id = serializer.validated_data.get('session_id')
        user_message_content = serializer.validated_data.get('content')
        title = serializer.validated_data.get('title')

        try:
            # 1. Fetch or create the session
            session = create_or_get_session(request.user, session_id=session_id, title=title)
        except PermissionDenied as e:
            return Response({"detail": str(e)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # 2. Save user message
        user_message = save_message(session, sender='USER', content=user_message_content)

        # 3. Generate mock AI response
        ai_reply_content = get_mock_ai_response(user_message_content, request.user)

        # 4. Save AI message
        ai_message = save_message(session, sender='AI', content=ai_reply_content)

        # Update session timestamp
        session.save()

        # Return session info along with user and AI messages
        return Response({
            "session_id": session.id,
            "session_title": session.title,
            "user_message": ChatMessageSerializer(user_message).data,
            "ai_message": ChatMessageSerializer(ai_message).data
        }, status=status.HTTP_201_CREATED)


class ChatHistoryView(generics.ListAPIView):
    """
    Endpoint: GET /api/chat/history/
    Retrieves the list of chat sessions based on user roles:
    - Manager: Can view all chat logs.
    - TeamLead: Can view their own chat logs AND those of assigned employees.
    - Employee: Can view only their own chat logs.
    """
    permission_classes = [IsAuthenticated, IsEmployee]
    serializer_class = ChatSessionSerializer

    def get_queryset(self):
        user = self.request.user

        if user.role == 'MANAGER':
            return ChatSession.objects.all().order_by('-updated_at')
        
        elif user.role == 'TEAM_LEAD':
            # TeamLead's own sessions or sessions from members of teams led by this lead
            return ChatSession.objects.filter(
                Q(user=user) | Q(user__team__leader=user)
            ).distinct().order_by('-updated_at')
        
        # Default: Employee role sees only own sessions
        return ChatSession.objects.filter(user=user).order_by('-updated_at')
