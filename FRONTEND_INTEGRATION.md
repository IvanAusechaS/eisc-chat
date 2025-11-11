# Frontend Integration Guide - EISC Chat

## Table of Contents
1. [Server Connection](#server-connection)
2. [Authentication with Google](#authentication-with-google)
3. [WebSocket Events](#websocket-events)
4. [HTTP Endpoints](#http-endpoints)
5. [Complete Implementation Examples](#complete-implementation-examples)
6. [Error Handling](#error-handling)
7. [Data Structures](#data-structures)

---

## Server Connection

### Installation

```bash
npm install socket.io-client firebase
```

### Environment Variables

Create a `.env` file in your frontend project:

```env
# Backend Server
VITE_API_URL=https://your-backend.onrender.com
VITE_SOCKET_URL=https://your-backend.onrender.com

# Firebase Configuration
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=your-app-id
```

For local development:
```env
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

---

## Authentication with Google

### Firebase Setup

```javascript
// src/firebase/config.js
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
```

### Google Login Implementation

```javascript
// src/auth/googleAuth.js
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    return {
      userId: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      email: user.email,
      uid: user.uid
    };
  } catch (error) {
    console.error('Error during Google login:', error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error during logout:', error);
    throw error;
  }
};
```

---

## WebSocket Events

### Socket Connection Setup

```javascript
// src/services/socketService.js
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;
let socket = null;

export const connectSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });
  }
  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
```

### Events: Client to Server

#### 1. Register User (After Login)

**Event Name:** `newUser`

**When to use:** Immediately after user logs in with Google

**Payload:**
```javascript
socket.emit('newUser', userId);
```

**Parameters:**
- `userId` (string): User identifier (email recommended)

**Complete Example:**
```javascript
import { getSocket } from './socketService';

const registerUserInChat = (userEmail) => {
  const socket = getSocket();
  if (socket && socket.connected) {
    socket.emit('newUser', userEmail);
  }
};

// Usage after Google login
loginWithGoogle().then(user => {
  registerUserInChat(user.email);
});
```

#### 2. Send Message

**Event Name:** `sendMessage`

**When to use:** When user sends a message in the chat

**Payload:**
```javascript
socket.emit('sendMessage', {
  senderId: string,
  text: string
});
```

**Parameters:**
- `senderId` (string): User's email or unique identifier
- `text` (string): Message content

**Complete Example:**
```javascript
const sendChatMessage = (userEmail, messageText) => {
  const socket = getSocket();
  
  if (!socket || !socket.connected) {
    throw new Error('Socket not connected');
  }
  
  if (!messageText.trim()) {
    throw new Error('Message cannot be empty');
  }
  
  socket.emit('sendMessage', {
    senderId: userEmail,
    text: messageText.trim()
  });
};

// Usage
sendChatMessage('user@example.com', 'Hello everyone!');
```

### Events: Server to Client

#### 1. Receive Online Users

**Event Name:** `usersOnline`

**When triggered:** 
- When you connect
- When another user connects
- When a user disconnects

**Received Data:**
```javascript
[
  {
    socketId: "abc123",
    userId: "user1@example.com"
  },
  {
    socketId: "def456",
    userId: "user2@example.com"
  }
]
```

**Implementation:**
```javascript
socket.on('usersOnline', (users) => {
  console.log('Online users:', users);
  // Update your state
  setOnlineUsers(users);
});
```

#### 2. Receive New Message

**Event Name:** `newMessage`

**When triggered:** 
- When any user sends a message (including yourself)
- Messages are broadcast to ALL connected users

**Received Data:**
```javascript
{
  senderId: "user@example.com",
  text: "Hello everyone!",
  timestamp: 1699123456789,
  id: "firestore-document-id"
}
```

**Implementation:**
```javascript
socket.on('newMessage', (message) => {
  console.log('New message received:', message);
  
  // Add to your messages array
  setMessages(prevMessages => [...prevMessages, message]);
  
  // Optional: Scroll to bottom, show notification, etc.
});
```

### Connection Events

```javascript
socket.on('connect', () => {
  console.log('Connected to server:', socket.id);
  // Re-register user if needed
  registerUserInChat(currentUser.email);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
  // Update UI to show disconnected state
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  // Show error message to user
});
```

---

## HTTP Endpoints

### Base URL

```javascript
const API_URL = import.meta.env.VITE_API_URL;
```

### 1. Get Chat History

**Endpoint:** `GET /api/messages`

**Query Parameters:**
- `limit` (optional, number): Maximum messages to retrieve (default: 100)

**Request:**
```javascript
const fetchChatHistory = async (limit = 50) => {
  try {
    const response = await fetch(
      `${API_URL}/api/messages?limit=${limit}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch messages');
    }
    
    const data = await response.json();
    
    if (data.success) {
      return data.messages;
    } else {
      throw new Error(data.error || 'Unknown error');
    }
  } catch (error) {
    console.error('Error fetching chat history:', error);
    throw error;
  }
};
```

**Response:**
```json
{
  "success": true,
  "messages": [
    {
      "id": "msg123",
      "senderId": "user1@example.com",
      "text": "First message",
      "timestamp": 1699123456789
    },
    {
      "id": "msg124",
      "senderId": "user2@example.com",
      "text": "Second message",
      "timestamp": 1699123456790
    }
  ]
}
```

**Notes:**
- Messages are returned in chronological order (oldest first)
- Load this data when component mounts, before real-time messages start

### 2. Health Check

**Endpoint:** `GET /health`

**Request:**
```javascript
const checkServerHealth = async () => {
  try {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    return data.status === 'ok';
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
};
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": 1699123456789
}
```

### 3. Server Status

**Endpoint:** `GET /`

**Request:**
```javascript
const getServerStatus = async () => {
  try {
    const response = await fetch(`${API_URL}/`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to get server status:', error);
    throw error;
  }
};
```

**Response:**
```json
{
  "status": "online",
  "message": "WebSocket chat server is running",
  "onlineUsers": 5
}
```

---

## Complete Implementation Examples

### React Example with Hooks

```javascript
// src/components/Chat.jsx
import { useState, useEffect, useRef } from 'react';
import { connectSocket, getSocket, disconnectSocket } from '../services/socketService';
import { loginWithGoogle, logout } from '../auth/googleAuth';

function Chat() {
  const [currentUser, setCurrentUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    socketRef.current = connectSocket();
    const socket = socketRef.current;

    // Connection events
    socket.on('connect', () => {
      console.log('Connected to chat server');
      setIsConnected(true);
      
      // Register user if already logged in
      if (currentUser) {
        socket.emit('newUser', currentUser.email);
      }
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    // Chat events
    socket.on('usersOnline', (users) => {
      setOnlineUsers(users);
    });

    socket.on('newMessage', (message) => {
      setMessages(prev => [...prev, message]);
    });

    // Cleanup
    return () => {
      disconnectSocket();
    };
  }, []);

  // Load chat history when user logs in
  useEffect(() => {
    if (currentUser) {
      loadChatHistory();
    }
  }, [currentUser]);

  const loadChatHistory = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API_URL}/api/messages?limit=100`);
      const data = await response.json();
      
      if (data.success) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const user = await loginWithGoogle();
      setCurrentUser(user);
      
      // Register in chat
      const socket = getSocket();
      if (socket && socket.connected) {
        socket.emit('newUser', user.email);
      }
    } catch (error) {
      console.error('Login failed:', error);
      alert('Login failed. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setCurrentUser(null);
      setMessages([]);
      setOnlineUsers([]);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!messageText.trim()) return;
    
    const socket = getSocket();
    if (!socket || !socket.connected) {
      alert('Not connected to server');
      return;
    }
    
    if (!currentUser) {
      alert('Please login first');
      return;
    }

    socket.emit('sendMessage', {
      senderId: currentUser.email,
      text: messageText.trim()
    });

    setMessageText('');
  };

  // Login screen
  if (!currentUser) {
    return (
      <div className="login-container">
        <h1>EISC Chat</h1>
        <button onClick={handleGoogleLogin}>
          Login with Google
        </button>
      </div>
    );
  }

  // Chat screen
  return (
    <div className="chat-container">
      <header>
        <div>
          <img src={currentUser.photoURL} alt={currentUser.displayName} />
          <span>{currentUser.displayName}</span>
        </div>
        <div>
          <span>Online: {onlineUsers.length}</span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <aside className="users-list">
        <h3>Online Users ({onlineUsers.length})</h3>
        {onlineUsers.map(user => (
          <div key={user.socketId} className="user-item">
            {user.userId}
          </div>
        ))}
      </aside>

      <main className="messages-container">
        {messages.map((msg, index) => (
          <div 
            key={msg.id || index} 
            className={`message ${msg.senderId === currentUser.email ? 'own' : ''}`}
          >
            <div className="message-header">
              <strong>{msg.senderId}</strong>
              <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
            </div>
            <div className="message-text">{msg.text}</div>
          </div>
        ))}
      </main>

      <form onSubmit={handleSendMessage} className="message-input">
        <input
          type="text"
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder="Type a message..."
          disabled={!isConnected}
        />
        <button type="submit" disabled={!isConnected || !messageText.trim()}>
          Send
        </button>
      </form>

      {!isConnected && (
        <div className="connection-status">
          Disconnected - Reconnecting...
        </div>
      )}
    </div>
  );
}

export default Chat;
```

### Zustand Store Example

```javascript
// src/store/chatStore.js
import { create } from 'zustand';

export const useChatStore = create((set, get) => ({
  currentUser: null,
  messages: [],
  onlineUsers: [],
  isConnected: false,

  setCurrentUser: (user) => set({ currentUser: user }),
  
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),
  
  setMessages: (messages) => set({ messages }),
  
  setOnlineUsers: (users) => set({ onlineUsers: users }),
  
  setConnected: (status) => set({ isConnected: status }),
  
  reset: () => set({
    currentUser: null,
    messages: [],
    onlineUsers: [],
    isConnected: false
  })
}));
```

---

## Error Handling

### Common Errors and Solutions

#### 1. Connection Failed

```javascript
socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
  
  // Show user-friendly message
  if (error.message.includes('CORS')) {
    alert('Server configuration error. Please contact support.');
  } else if (error.message.includes('timeout')) {
    alert('Connection timeout. Please check your internet connection.');
  } else {
    alert('Cannot connect to server. Please try again later.');
  }
});
```

#### 2. Message Send Failed

```javascript
const sendMessage = (senderId, text) => {
  const socket = getSocket();
  
  try {
    if (!socket || !socket.connected) {
      throw new Error('Not connected to server');
    }
    
    if (!senderId) {
      throw new Error('User not logged in');
    }
    
    if (!text.trim()) {
      throw new Error('Message cannot be empty');
    }
    
    socket.emit('sendMessage', { senderId, text: text.trim() });
  } catch (error) {
    console.error('Failed to send message:', error);
    alert(error.message);
  }
};
```

#### 3. Reconnection Strategy

```javascript
socket.io.on('reconnect', (attemptNumber) => {
  console.log('Reconnected after', attemptNumber, 'attempts');
  
  // Re-register user
  const currentUser = getCurrentUser(); // Your user state
  if (currentUser) {
    socket.emit('newUser', currentUser.email);
  }
  
  // Reload recent messages
  loadChatHistory();
});

socket.io.on('reconnect_failed', () => {
  console.error('Failed to reconnect');
  alert('Cannot reconnect to server. Please refresh the page.');
});
```

---

## Data Structures

### TypeScript Interfaces

```typescript
// src/types/chat.ts

export interface User {
  userId: string;
  displayName: string;
  email: string;
  photoURL: string;
  uid: string;
}

export interface OnlineUser {
  socketId: string;
  userId: string;
}

export interface Message {
  senderId: string;
  text: string;
  timestamp: number;
  id?: string;
}

export interface SendMessagePayload {
  senderId: string;
  text: string;
}

export interface ChatState {
  currentUser: User | null;
  messages: Message[];
  onlineUsers: OnlineUser[];
  isConnected: boolean;
}
```

### Message Format

**Sending:**
```javascript
{
  senderId: "user@example.com",
  text: "Hello everyone!"
}
```

**Receiving:**
```javascript
{
  senderId: "user@example.com",
  text: "Hello everyone!",
  timestamp: 1699123456789,
  id: "firestore-doc-id"
}
```

### Online Users Format

```javascript
[
  {
    socketId: "socket-connection-id",
    userId: "user1@example.com"
  },
  {
    socketId: "another-socket-id",
    userId: "user2@example.com"
  }
]
```

---

## Summary

### Quick Start Checklist

1. Install dependencies: `npm install socket.io-client firebase`
2. Configure Firebase (Google Auth)
3. Set environment variables
4. Implement Google login
5. Connect to Socket.IO server
6. Register user with `newUser` event after login
7. Listen to `usersOnline` and `newMessage` events
8. Send messages with `sendMessage` event
9. Load chat history from `/api/messages` endpoint
10. Handle disconnections and reconnections

### Flow Diagram

```
User Opens App
    |
    v
Login with Google (Firebase Auth)
    |
    v
Connect to Socket.IO Server
    |
    v
Emit 'newUser' with user email
    |
    v
Listen to 'usersOnline' event
    |
    v
Fetch chat history (GET /api/messages)
    |
    v
Listen to 'newMessage' event for real-time messages
    |
    v
User types message
    |
    v
Emit 'sendMessage' with senderId and text
    |
    v
All connected users receive 'newMessage' event
```

### Important Notes

- This is a GROUP CHAT - all messages are broadcast to all users
- Always check socket connection before emitting events
- Handle reconnections to maintain chat state
- Load chat history on initial load
- Use userId (email) consistently across the app
- Messages are automatically saved to Firestore by the backend
- No need to manually save messages in frontend
