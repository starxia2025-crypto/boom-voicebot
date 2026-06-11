import { startTransition, useEffect, useMemo, useRef, useState } from "react";

import { Composer } from "./components/Composer";
import { ConversationThread } from "./components/ConversationThread";
import { Header } from "./components/Header";
import { VoicePanel } from "./components/VoicePanel";
import { api } from "./services/api";
import { BrowserSpeechRecognitionService } from "./services/BrowserSpeechRecognitionService";
import { BrowserTextToSpeechService } from "./services/BrowserTextToSpeechService";
import type { ChatMessage, Conversation, PublicConfig, VoiceStatus } from "./types";

const speechRecognition = new BrowserSpeechRecognitionService();
const textToSpeech = new BrowserTextToSpeechService();

const demoMessages: ChatMessage[] = [
  {
    id: "demo-1",
    role: "user",
    content: "Hay stock de sillon Roma gris?",
    inputType: "text",
    createdAt: new Date().toISOString(),
  },
  {
    id: "demo-2",
    role: "assistant",
    content: "Importa el CSV y pregunta por referencia o nombre para ver datos reales del catalogo.",
    inputType: "text",
    createdAt: new Date().toISOString(),
  },
];

export function App() {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [branch, setBranch] = useState("Sucursal Centro");
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(demoMessages);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>(
    speechRecognition.isSupported() ? "idle" : "unsupported",
  );
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const threadRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void Promise.all([api.getPublicConfig(), api.getConversations()])
      .then(([publicConfig, conversationResult]) => {
        setConfig(publicConfig);
        setBranch(publicConfig.defaultBranch);
        setTtsEnabled(publicConfig.voice.ttsEnabled);

        const latestConversation = conversationResult.conversations[0] ?? null;
        if (latestConversation) {
          setConversation(latestConversation);
          setMessages(latestConversation.messages);
        }
      })
      .catch((requestError: Error) => {
        setError(`Modo demo activo. ${requestError.message}`);
      });
  }, []);

  useEffect(() => {
    threadRef.current?.scrollTo({
      top: threadRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const helperText = useMemo(() => {
    if (voiceStatus === "unsupported") {
      return "La transcripcion de voz no esta disponible en este dispositivo. Usa el teclado o configura un proveedor alternativo.";
    }

    if (error) {
      return error;
    }

    return "Solo responde con datos cargados en la base interna. Sin fuentes externas.";
  }, [error, voiceStatus]);

  async function submitMessage(message: string, inputType: "text" | "voice") {
    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }

    setLoading(true);
    setError(null);
    setVoiceStatus(inputType === "voice" ? "processing" : voiceStatus);

    try {
      const response = await api.sendChat({
        conversationId: conversation?.id,
        branch,
        message: trimmed,
        inputType,
      });

      startTransition(() => {
        setConversation(response.conversation);
        setMessages(response.conversation.messages);
        setInput("");
      });

      if (ttsEnabled && textToSpeech.isSupported()) {
        setVoiceStatus("speaking");
        textToSpeech.speak(response.answer);
        window.setTimeout(() => setVoiceStatus(speechRecognition.isSupported() ? "idle" : "unsupported"), 1200);
      } else {
        setVoiceStatus(speechRecognition.isSupported() ? "idle" : "unsupported");
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? `Modo demo activo. ${requestError.message}`
          : "Modo demo activo. No se pudo enviar la consulta.",
      );
      setVoiceStatus(speechRecognition.isSupported() ? "idle" : "unsupported");
    } finally {
      setLoading(false);
    }
  }

  async function handleVoiceToggle() {
    if (!speechRecognition.isSupported()) {
      setVoiceStatus("unsupported");
      return;
    }

    setError(null);
    setVoiceStatus("listening");

    try {
      const result = await speechRecognition.listen();
      await submitMessage(result.transcript, "voice");
    } catch (voiceError) {
      setError(voiceError instanceof Error ? voiceError.message : "No se pudo capturar la voz.");
      setVoiceStatus("idle");
    }
  }

  return (
    <main className="app-shell">
      <div className="phone-frame">
        <Header branch={branch} />
        <div className="app-body">
          <div className="thread-scroll" ref={threadRef}>
            <ConversationThread messages={messages} />
          </div>
          <VoicePanel voiceStatus={voiceStatus} onToggleVoice={handleVoiceToggle} disabled={loading} />
          <p className="helper-text">{helperText}</p>
          <Composer
            value={input}
            onChange={setInput}
            onSubmit={() => void submitMessage(input, "text")}
            onToggleTts={() => setTtsEnabled((current) => !current)}
            ttsEnabled={ttsEnabled}
            disabled={loading}
          />
        </div>
      </div>
      <footer className="app-footer">
        <span className="footer-lock" aria-hidden="true">
          lock
        </span>
        boom.empresa.com
        {config?.llmEnabled ? null : <small>Modo local sin OpenAI</small>}
      </footer>
    </main>
  );
}
