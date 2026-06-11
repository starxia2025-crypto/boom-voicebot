import type { ChatMessage } from "../types";

type MessageBubbleProps = {
  message: ChatMessage;
};

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const formattedTime = new Date(message.createdAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className={`message-row ${isUser ? "message-row-user" : "message-row-assistant"}`}>
      {!isUser ? (
        <div className="mini-avatar" aria-hidden="true">
          BOOM
        </div>
      ) : null}
      <div className={`message-bubble ${isUser ? "message-bubble-user" : "message-bubble-assistant"}`}>
        <p>{message.content}</p>
        <div className="message-meta">
          <time>{formattedTime}</time>
          {isUser ? <span className="message-checks">✓✓</span> : null}
        </div>
      </div>
    </div>
  );
}
