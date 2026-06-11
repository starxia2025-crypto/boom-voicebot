import type { ChatMessage } from "../types";
import { MessageBubble } from "./MessageBubble";

type ConversationThreadProps = {
  messages: ChatMessage[];
};

export function ConversationThread({ messages }: ConversationThreadProps) {
  return (
    <section className="thread-panel">
      <div className="day-pill">Hoy</div>
      <div className="thread-list">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </div>
    </section>
  );
}
