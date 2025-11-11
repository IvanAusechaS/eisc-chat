import { db } from "./firebase";
import type { StoredMessage } from "./types";

/**
 * Get all messages from the group chat
 * @param limit - Maximum number of messages to retrieve (default: 100)
 * @returns Array of messages sorted by timestamp (oldest first)
 */
export async function getAllMessages(limit: number = 100): Promise<StoredMessage[]> {
  try {
    const messagesRef = db.collection("messages");

    const snapshot = await messagesRef
      .orderBy("timestamp", "desc")
      .limit(limit)
      .get();

    const messages: StoredMessage[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        senderId: data.senderId,
        text: data.text,
        timestamp: data.timestamp,
      });
    });

    return messages.reverse(); // Return oldest first
  } catch (error) {
    console.error("Error retrieving messages:", error);
    throw error;
  }
}

/**
 * Delete a message by ID
 * @param messageId - Message document ID
 */
export async function deleteMessage(messageId: string): Promise<void> {
  try {
    await db.collection("messages").doc(messageId).delete();
    console.log(`Message ${messageId} deleted successfully`);
  } catch (error) {
    console.error("Error deleting message:", error);
    throw error;
  }
}

