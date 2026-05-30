import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  listenToCommonChatMessages,
  sendCommonChatMessage,
} from "../services/chatService";

function formatTime(value) {
  const date = value?.toDate?.();
  return date ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
}

export default function CommonChatRoom() {
  const { member } = useAuth();
  const bottomRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return listenToCommonChatMessages(setMessages, (err) => {
      setError(err.message);
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!text.trim()) return;

    setSubmitting(true);
    setError("");
    try {
      await sendCommonChatMessage({ text, member });
      setText("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-65px)] bg-slate-50 px-4 py-6">
      <section className="mx-auto flex h-[calc(100vh-115px)] max-w-5xl flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-white px-5 py-4">
          <h1 className="text-xl font-bold text-slate-950">Common Chat Room</h1>
          <p className="mt-1 text-sm text-slate-500">
            A single real-time space for all active Mayabon Poribar members.
          </p>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 px-4 py-5">
          {messages.length === 0 && (
            <div className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
              No messages yet. Start the conversation.
            </div>
          )}

          {messages.map((message) => {
            const mine = message.senderUid === member?.uid;

            return (
              <div
                key={message.id}
                className={`flex items-end gap-3 ${mine ? "justify-end" : ""}`}
              >
                {!mine && (
                  <img
                    src={message.senderPhotoURL || `${import.meta.env.BASE_URL}default-avatar.svg`}
                    alt={message.senderName}
                    className="h-9 w-9 rounded-full border border-slate-200 object-cover"
                  />
                )}
                <div
                  className={`max-w-[82%] rounded-md px-4 py-2 shadow-sm sm:max-w-[70%] ${
                    mine
                      ? "bg-emerald-700 text-white"
                      : "border border-slate-200 bg-white text-slate-900"
                  }`}
                >
                  {!mine && (
                    <p className="mb-1 text-xs font-semibold text-emerald-700">
                      {message.senderName}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words text-sm leading-6">
                    {message.deleted ? "This message was deleted." : message.text}
                  </p>
                  <p className={`mt-1 text-right text-[11px] ${mine ? "text-emerald-100" : "text-slate-400"}`}>
                    {formatTime(message.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {error && <p className="border-t border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

        <form onSubmit={handleSubmit} className="flex gap-2 border-t border-slate-200 bg-white p-3">
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Write a message..."
            maxLength={1000}
            className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
          />
          <button
            type="submit"
            disabled={submitting || !text.trim()}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-700 text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            aria-label="Send message"
          >
            <Send size={18} />
          </button>
        </form>
      </section>
    </main>
  );
}
