import type { ChatResponse, Conversation, PublicConfig } from "../types";

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message ?? "No se pudo completar la peticion.");
  }

  return response.json() as Promise<T>;
}

export const api = {
  async getPublicConfig() {
    return parseResponse<PublicConfig>(await fetch("/api/config/public"));
  },
  async getConversations() {
    return parseResponse<{ conversations: Conversation[] }>(await fetch("/api/conversations"));
  },
  async sendChat(payload: {
    conversationId?: string;
    branch: string;
    message: string;
    inputType: "text" | "voice";
  }) {
    return parseResponse<ChatResponse>(
      await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }),
    );
  },
};
