import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import type { Socket } from "socket.io";
import "dotenv/config";
import { db } from "./firebase";
import type {
  OnlineUser,
  Message,
  SendMessagePayload,
  ServerToClientEvents,
  ClientToServerEvents,
} from "./types";

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Parse CORS origins from environment
const origins = (process.env.ORIGIN ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Initialize Socket.IO with CORS
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
  origin: "*", // permite todos los orígenes
  },
});

// Track online users in memory
let onlineUsers: OnlineUser[] = [];

// Basic health check endpoint
app.get("/", (req, res) => {
  res.json({
    status: "online",
    message: "WebSocket chat server is running",
    onlineUsers: onlineUsers.length,
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

// Get all messages from the group chat
app.get("/api/messages", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;

    const snapshot = await db
      .collection("messages")
      .orderBy("timestamp", "desc")
      .limit(limit)
      .get();

    const messages: any[] = [];
    snapshot.forEach((doc) => {
      messages.push({ id: doc.id, ...doc.data() });
    });

    res.json({ success: true, messages: messages.reverse() }); // Oldest first
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ success: false, error: "Failed to fetch messages" });
  }
});

// Socket.IO connection handler
io.on("connection", (socket: Socket) => {
  console.log(`[CONNECTION] New connection: ${socket.id} | Total online: ${onlineUsers.length + 1}`);

  // Handle new user registration
  socket.on("newUser", (userId: string) => {
    try {
      if (!userId || userId.trim() === "") {
        console.warn(`[WARNING] Invalid userId received from socket ${socket.id}`);
        return;
      }

      // Check if user is already online (prevent duplicates)
      const existingUser = onlineUsers.find((user) => user.userId === userId);
      
      if (existingUser) {
        // Update socket ID if user reconnected
        console.log(`[RECONNECT] User ${userId} reconnected with new socket ${socket.id}`);
        onlineUsers = onlineUsers.map((user) =>
          user.userId === userId ? { ...user, socketId: socket.id } : user
        );
      } else {
        // Add new user to online list
        onlineUsers.push({ socketId: socket.id, userId });
        console.log(`[REGISTER] User registered: ${userId} | Total online: ${onlineUsers.length}`);
      }

      // Broadcast updated online users list to ALL clients
      io.emit("usersOnline", onlineUsers);
    } catch (error) {
      console.error("[ERROR] Error in newUser handler:", error);
    }
  });

  // Handle sending messages (GROUP CHAT - broadcast to everyone)
  socket.on("sendMessage", async (payload: SendMessagePayload) => {
    try {
      const { senderId, text } = payload;

      // Validate payload
      if (!senderId || !text) {
        console.error("[ERROR] Invalid message payload:", payload);
        return;
      }

      // Create message object (no receiverId - it's a group chat!)
      const message: Message = {
        senderId,
        text,
        timestamp: Date.now(),
      };

      console.log(`[MESSAGE] From ${senderId}: "${text.substring(0, 50)}..."`);

      // Save message to Firestore
      const messageRef = await db.collection("messages").add(message);
      console.log(`[FIRESTORE] Message saved with ID: ${messageRef.id}`);

      // Broadcast message to ALL connected clients (including sender)
      io.emit("newMessage", {
        ...message,
        id: messageRef.id,
      });
      
      console.log(`[BROADCAST] Message sent to all ${onlineUsers.length} online users`);

    } catch (error) {
      console.error("[ERROR] Error sending message:", error);
      // Send error only to the sender
      socket.emit("newMessage", {
        senderId: "system",
        text: "Error sending message. Please try again.",
        timestamp: Date.now(),
      });
    }
  });

  // Handle user disconnect
  socket.on("disconnect", () => {
    const disconnectedUser = onlineUsers.find((user) => user.socketId === socket.id);
    
    if (disconnectedUser) {
      console.log(`[DISCONNECT] User disconnected: ${disconnectedUser.userId} (${socket.id})`);
    } else {
      console.log(`[DISCONNECT] Unregistered socket disconnected: ${socket.id}`);
    }

    // Remove user from online list
    onlineUsers = onlineUsers.filter((user) => user.socketId !== socket.id);
    console.log(`[STATUS] Total online users: ${onlineUsers.length}`);

    // Broadcast updated online users list to all remaining clients
    io.emit("usersOnline", onlineUsers);
  });
});

// Start server
const PORT = Number(process.env.PORT) || 3000;

httpServer.listen(PORT, () => {
  console.log("=".repeat(50));
  console.log(`[SERVER] Chat server running on port ${PORT}`);
  console.log(`[CORS] Enabled for all origins`);
  console.log(`[FIREBASE] Admin SDK initialized`);
  console.log("=".repeat(50));
});

// Export for deployment (e.g., Vercel, Railway, Render)
export default httpServer;