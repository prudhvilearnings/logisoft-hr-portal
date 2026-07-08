# 🔗 React-Vite & Django Backend Integration Guide

This guide describes how to connect this React-Vite TypeScript application to the Django backend endpoints.

---

## 🛠️ Step 1: Create an API client (`src/api.ts`)

Create an API client helper using `axios` (or standard `fetch`) to centralize all backend request logic, handle JSON serialization, and automatically inject JWT tokens.

```typescript
import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically inject Bearer Token into protected requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh token if it expires (returns 401)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/token/refresh/`, {
            refresh: refreshToken,
          });
          const newAccessToken = res.data.access;
          localStorage.setItem('accessToken', newAccessToken);
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }
          return api(originalRequest);
        } catch (refreshError) {
          // Clear credentials and redirect to login if refresh fails
          localStorage.clear();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }
    return Promise.reject(error);
  }
);
```

---

## 🔐 Step 2: Authentication Handlers (`src/services/auth.ts`)

Create a service file to manage registering, logging in, logging out, and fetching the user profile.

```typescript
import { api } from '../api';

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'MANAGER' | 'TEAM_LEAD' | 'EMPLOYEE';
  team: number | null;
}

export const authService = {
  // 1. Register User
  async register(data: any) {
    const response = await api.post('/register/', data);
    return response.data;
  },

  // 2. Login User
  async login(credentials: any) {
    const response = await api.post('/login/', credentials);
    const { access, refresh, user } = response.data;
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
    localStorage.setItem('userRole', user.role);
    return user;
  },

  // 3. Logout User
  async logout() {
    const refresh = localStorage.getItem('refreshToken');
    if (refresh) {
      await api.post('/logout/', { refresh });
    }
    localStorage.clear();
  },

  // 4. Fetch User Profile
  async getProfile(): Promise<UserProfile> {
    const response = await api.get('/profile/');
    return response.data;
  }
};
```

---

## 💬 Step 3: Chat Integration (`src/services/chat.ts`)

Create a chat service file to send messages to the chatbot and retrieve historical conversations.

```typescript
import { api } from '../api';

export interface ChatMessage {
  id: number;
  session: number;
  sender: 'USER' | 'AI';
  content: string;
  timestamp: string;
}

export interface ChatSession {
  id: number;
  user: number;
  title: string;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
}

export const chatService = {
  // 1. Send message to AI
  async sendMessage(
    sessionId: number | null,
    content: string,
    title: string | null = null
  ) {
    const response = await api.post('/chat/send/', {
      session_id: sessionId,
      content,
      title,
    });
    return response.data; // Returns: { session_id, session_title, user_message, ai_message }
  },

  // 2. Retrieve history list
  async getHistory(): Promise<ChatSession[]> {
    const response = await api.get('/chat/history/');
    return response.data;
  }
};
```

---

## 🖥️ Step 4: Simple React Chat Component Example (`src/components/ChatWindow.tsx`)

Here is an example of how you can build a chat window using these services in React:

```tsx
import React, { useState, useEffect } from 'react';
import { chatService, ChatMessage, ChatSession } from '../services/chat';

export const ChatWindow: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Load history list on mount
  useEffect(() => {
    loadChatHistory();
  }, []);

  const loadChatHistory = async () => {
    try {
      const history = await chatService.getHistory();
      setSessions(history);
    } catch (err) {
      console.error("Error loading chat history", err);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userQuery = input;
    setInput('');
    setLoading(true);

    // Optimistically add user message to UI
    const tempUserMsg: ChatMessage = {
      id: Date.now(),
      session: currentSessionId || 0,
      sender: 'USER',
      content: userQuery,
      timestamp: new Date().toISOString()
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const title = currentSessionId ? null : userQuery.substring(0, 30);
      const res = await chatService.sendMessage(currentSessionId, userQuery, title);
      
      // Update with new session id and AI response message
      if (!currentSessionId) {
        setCurrentSessionId(res.session_id);
      }
      setMessages((prev) => [...prev, res.ai_message]);
      
      // Reload history sidebar list
      loadChatHistory();
    } catch (err) {
      console.error("Error sending message", err);
    } finally {
      setLoading(false);
    }
  };

  const selectSession = (session: ChatSession) => {
    setCurrentSessionId(session.id);
    setMessages(session.messages);
  };

  return (
    <div style={{ display: 'flex', height: '80vh' }}>
      {/* Sidebar for History */}
      <div style={{ width: '250px', borderRight: '1px solid #ccc', padding: '10px' }}>
        <h3>Chat History</h3>
        {sessions.map((session) => (
          <div 
            key={session.id} 
            onClick={() => selectSession(session)}
            style={{ 
              padding: '8px', 
              cursor: 'pointer', 
              backgroundColor: currentSessionId === session.id ? '#e0e0e0' : 'transparent' 
            }}
          >
            {session.title}
          </div>
        ))}
        <button onClick={() => { setCurrentSessionId(null); setMessages([]); }}>New Chat</button>
      </div>

      {/* Main Chat Panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '10px' }}>
        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #ccc', padding: '10px', marginBottom: '10px' }}>
          {messages.map((msg) => (
            <div key={msg.id} style={{ textAlign: msg.sender === 'USER' ? 'right' : 'left', margin: '5px' }}>
              <strong>{msg.sender}:</strong> {msg.content}
            </div>
          ))}
          {loading && <div>AI is thinking...</div>}
        </div>
        <form onSubmit={handleSend} style={{ display: 'flex' }}>
          <input 
            type="text" 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            placeholder="Type your message..." 
            style={{ flex: 1, marginRight: '5px' }}
          />
          <button type="submit">Send</button>
        </form>
      </div>
    </div>
  );
};
```
