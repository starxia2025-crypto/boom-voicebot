export type ChatRole = "user" | "assistant" | "system";
export type InputType = "text" | "voice";
export type VoiceStatus = "idle" | "listening" | "processing" | "speaking" | "unsupported";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  inputType: InputType;
  createdAt: string;
};

export type Conversation = {
  id: string;
  branch: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
};

export type PublicConfig = {
  defaultBranch: string;
  voice: {
    sttProvider: string;
    ttsProvider: string;
    ttsEnabled: boolean;
  };
  llmEnabled: boolean;
};

export type ChatResponse = {
  answer: string;
  hadEnoughData: boolean;
  conversation: Conversation;
};

