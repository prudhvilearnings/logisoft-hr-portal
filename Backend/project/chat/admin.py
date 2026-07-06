from django.contrib import admin
from .models import ChatSession, ChatMessage

class ChatMessageInline(admin.TabularInline):
    model = ChatMessage
    extra = 0
    readonly_fields = ['sender', 'content', 'timestamp']

class ChatSessionAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'title', 'created_at', 'updated_at']
    search_fields = ['title', 'user__username']
    list_filter = ['created_at']
    inlines = [ChatMessageInline]

class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ['id', 'session', 'sender', 'content_snippet', 'timestamp']
    search_fields = ['content', 'session__title', 'session__user__username']
    list_filter = ['sender', 'timestamp']

    def content_snippet(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_snippet.short_description = 'Content'

admin.site.register(ChatSession, ChatSessionAdmin)
admin.site.register(ChatMessage, ChatMessageAdmin)
