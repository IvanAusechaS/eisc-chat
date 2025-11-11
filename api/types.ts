// User representation in online users list
export interface OnlineUser {
  socketId: string;
  userId: string;
}

// Message data structure for group chat
export interface Message {
  senderId: string;
  text: string;
  timestamp: number;
}

// Message stored in Firestore (includes ID)
export interface StoredMessage extends Message {
  id?: string;
}

// Socket event payloads
export interface SendMessagePayload {
  senderId: string;
  text: string;
}

export interface ReceiveMessagePayload extends Message {
  id?: string;
}

// Socket event map for type safety
export interface ServerToClientEvents {
  usersOnline: (users: OnlineUser[]) => void;
  receiveMessage: (message: ReceiveMessagePayload) => void;
  newMessage: (message: ReceiveMessagePayload) => void; // Broadcast to all
}

export interface ClientToServerEvents {
  newUser: (userId: string) => void;
  sendMessage: (payload: SendMessagePayload) => void;
  disconnect: () => void;
}
