# Real-Time Chat Backend 🚀

WebSocket-based chat server using **Socket.IO**, **Firebase Admin SDK**, and **TypeScript**.

## Features ✨

- ✅ **Real-time messaging** with Socket.IO
- ✅ **Google Authentication** via Firebase Auth (frontend)
- ✅ **Message persistence** in Firestore
- ✅ **Online user tracking** with live updates
- ✅ **TypeScript** for type safety
- ✅ **Express** server for deployment compatibility
- ✅ **CORS** configuration for frontend access
- ✅ **Environment variables** for secure configuration

## Tech Stack 🛠️

- **Node.js** + **Express**
- **Socket.IO** for WebSocket connections
- **Firebase Admin SDK** for Firestore
- **TypeScript** for type safety
- **dotenv** for environment variables

## Project Structure 📁

```
eisc-chat/
├── api/
│   ├── index.ts          # Main server file with Socket.IO setup
│   ├── firebase.ts       # Firebase Admin SDK initialization
│   └── types.ts          # TypeScript interfaces and types
├── .env                  # Environment variables (DO NOT COMMIT)
├── .env.example          # Environment variables template
├── package.json          # Dependencies and scripts
└── tsconfig.json         # TypeScript configuration
```

## Setup Instructions 🔧

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Firebase Admin SDK

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Project Settings** > **Service Accounts**
4. Click **Generate New Private Key**
5. Download the JSON file

### 3. Set Up Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` and add your Firebase credentials:

```env
PORT=3000
ORIGIN=http://localhost:5173,https://your-frontend-url.com

FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
```

**Important:** Make sure to keep the quotes around `FIREBASE_PRIVATE_KEY` and preserve the `\n` characters.

### 4. Run the Server

**Development mode (with hot reload):**

```bash
npm run dev
```

**Build for production:**

```bash
npm run build
npm start
```

The server will start on `http://localhost:3000` (or the PORT you specified).

## API Endpoints 🌐

### HTTP Endpoints

- `GET /` - Server status and info
- `GET /health` - Health check endpoint

### WebSocket Events

#### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `newUser` | `userId: string` | Register a new user connection |
| `sendMessage` | `{ senderId, receiverId, text }` | Send a message to another user |
| `disconnect` | - | User disconnects (automatic) |

#### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `usersOnline` | `OnlineUser[]` | List of currently online users |
| `receiveMessage` | `{ senderId, receiverId, text, timestamp, id? }` | Receive a new message |

## Usage Example 📝

### Frontend (React + Socket.IO Client)

```typescript
import { io } from "socket.io-client";

// Connect to server
const socket = io("http://localhost:3000");

// Register user after authentication
socket.emit("newUser", currentUser.email);

// Listen for online users
socket.on("usersOnline", (users) => {
  console.log("Online users:", users);
});

// Send a message
socket.emit("sendMessage", {
  senderId: currentUser.email,
  receiverId: "recipient@example.com",
  text: "Hello!",
});

// Receive messages
socket.on("receiveMessage", (message) => {
  console.log("New message:", message);
});
```

## Firestore Data Structure 💾

### Messages Collection

```typescript
{
  senderId: string;        // User ID (email or UID)
  receiverId: string;      // Recipient user ID
  text: string;           // Message content
  timestamp: number;      // Unix timestamp (milliseconds)
}
```

## Deployment 🚀

### Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Add environment variables in Vercel dashboard

### Railway

1. Connect your GitHub repository
2. Add environment variables in Railway dashboard
3. Deploy automatically on push

### Render

1. Create a new Web Service
2. Connect your repository
3. Add environment variables
4. Deploy

**Important:** Make sure to set all environment variables in your deployment platform!

## Environment Variables Reference 📋

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `ORIGIN` | Allowed CORS origins (comma-separated) | `http://localhost:5173,https://app.com` |
| `FIREBASE_PROJECT_ID` | Firebase project ID | `my-chat-app-12345` |
| `FIREBASE_PRIVATE_KEY` | Firebase private key (keep quotes and `\n`) | `"-----BEGIN PRIVATE KEY-----\n..."` |
| `FIREBASE_CLIENT_EMAIL` | Firebase service account email | `firebase-adminsdk-xxxxx@...` |

## Logging 📊

The server provides detailed logging:

- 🟢 New connections
- ✅ User registrations
- 📤 Message sending
- 💾 Firestore saves
- ✉️ Message delivery
- 🔴 Disconnections
- ❌ Errors

## Security Considerations 🔒

- Always use HTTPS in production
- Keep your Firebase private key secret
- Use environment variables (never commit `.env`)
- Validate all incoming data
- Implement rate limiting for production
- Add authentication middleware if needed

## Troubleshooting 🔍

### Firebase initialization fails

- Check that all Firebase env variables are set correctly
- Ensure the private key has proper `\n` newline characters
- Verify the service account has Firestore permissions

### CORS errors

- Add your frontend URL to the `ORIGIN` environment variable
- Make sure to separate multiple origins with commas

### Messages not saving

- Check Firebase console for Firestore permissions
- Verify the service account has write access to Firestore

## License 📄

ISC

---

Built with ❤️ using TypeScript, Socket.IO, and Firebase
