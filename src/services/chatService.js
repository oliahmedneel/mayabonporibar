import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../config/firebase";

const CHAT_ROOMS_COLLECTION = "chatRooms";
const COMMON_ROOM_ID = "common";
const MESSAGES_COLLECTION = "messages";
const MAX_MESSAGE_LENGTH = 1000;

function assertActiveMember(member) {
  if (!member?.uid || member.status !== "active") {
    throw new Error("Only active members can use the common chat room.");
  }
}

function normalizeMessageText(text) {
  const normalized = String(text || "").trim();

  if (!normalized) {
    throw new Error("Message cannot be empty.");
  }

  if (normalized.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Message cannot be longer than ${MAX_MESSAGE_LENGTH} characters.`);
  }

  return normalized;
}

export async function ensureCommonChatRoom() {
  await setDoc(
    doc(db, CHAT_ROOMS_COLLECTION, COMMON_ROOM_ID),
    {
      name: "Mayabon Common Chat Room",
      type: "common",
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function sendCommonChatMessage({ text, member }) {
  assertActiveMember(member);

  const normalizedText = normalizeMessageText(text);

  await ensureCommonChatRoom();

  const messagesRef = collection(
    db,
    CHAT_ROOMS_COLLECTION,
    COMMON_ROOM_ID,
    MESSAGES_COLLECTION
  );

  const messageRef = await addDoc(messagesRef, {
    text: normalizedText,
    senderUid: member.uid,
    senderName: member.fullName || member.displayName || "Unnamed Member",
    senderPhotoURL: member.photoURL || "",
    createdAt: serverTimestamp(),
    updatedAt: null,
    deleted: false,
  });

  await updateDoc(doc(db, CHAT_ROOMS_COLLECTION, COMMON_ROOM_ID), {
    lastMessageText: normalizedText,
    lastMessageSenderUid: member.uid,
    lastMessageSenderName: member.fullName || member.displayName || "Unnamed Member",
    lastMessageAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return messageRef.id;
}

export function listenToCommonChatMessages(callback, onError, messageLimit = 100) {
  const safeLimit = Math.min(Math.max(Number(messageLimit) || 100, 1), 200);
  const messagesQuery = query(
    collection(db, CHAT_ROOMS_COLLECTION, COMMON_ROOM_ID, MESSAGES_COLLECTION),
    orderBy("createdAt", "asc"),
    limit(safeLimit)
  );

  return onSnapshot(
    messagesQuery,
    (snapshot) => {
      callback(
        snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }))
      );
    },
    onError
  );
}

export async function editOwnCommonChatMessage({ messageId, text, member }) {
  assertActiveMember(member);

  if (!messageId) {
    throw new Error("Message ID is required.");
  }

  const normalizedText = normalizeMessageText(text);

  await updateDoc(
    doc(db, CHAT_ROOMS_COLLECTION, COMMON_ROOM_ID, MESSAGES_COLLECTION, messageId),
    {
      text: normalizedText,
      updatedAt: serverTimestamp(),
    }
  );
}

export async function softDeleteOwnCommonChatMessage({ messageId, member }) {
  assertActiveMember(member);

  if (!messageId) {
    throw new Error("Message ID is required.");
  }

  await updateDoc(
    doc(db, CHAT_ROOMS_COLLECTION, COMMON_ROOM_ID, MESSAGES_COLLECTION, messageId),
    {
      text: "",
      deleted: true,
      updatedAt: serverTimestamp(),
    }
  );
}
