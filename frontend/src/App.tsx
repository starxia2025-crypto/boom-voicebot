import { startTransition, useEffect, useMemo, useRef, useState } from "react";

import { Composer } from "./components/Composer";
import { ConversationThread } from "./components/ConversationThread";
import { Header } from "./components/Header";
import { VoicePanel } from "./components/VoicePanel";
import { api } from "./services/api";
import { BrowserSpeechRecognitionService } from "./services/BrowserSpeechRecognitionService";
import { BrowserTextToSpeechService } from "./services/BrowserTextToSpeechService";
import type { ChatMessage, Conversation, PublicConfig, VoiceSessionState, VoiceStatus } from "./types";

const speechRecognition = new BrowserSpeechRecognitionService();
const textToSpeech = new BrowserTextToSpeechService();
const VOICE_IDLE_TIMEOUT_MS = 15000;

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
  const [voiceSessionState, setVoiceSessionState] = useState<VoiceSessionState>("inactive");
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>(speechRecognition.isSupported() ? "idle" : "unsupported");
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const voiceSessionStateRef = useRef<VoiceSessionState>("inactive");
  const conversationIdRef = useRef<string | undefined>(undefined);
  const branchRef = useRef(branch);

  useEffect(() => {
    voiceSessionStateRef.current = voiceSessionState;
  }, [voiceSessionState]);

  useEffect(() => {
    conversationIdRef.current = conversation?.id;
  }, [conversation]);

  useEffect(() => {
    branchRef.current = branch;
  }, [branch]);

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

  const voiceModeActive = voiceSessionState !== "inactive";

  const helperText = useMemo(() => {
    if (voiceStatus === "unsupported") {
      return "La transcripcion de voz no esta disponible en este dispositivo. Usa el teclado o configura un proveedor alternativo.";
    }

    if (error) {
      return error;
    }

    switch (voiceSessionState) {
      case "starting":
        return "Estoy iniciando la conversacion. Enseguida te escucho.";
      case "listening":
        return "Te escucho. Pulsa el boton verde cuando quieras terminar la conversacion.";
      case "processing":
        return "Estoy revisando tu consulta para responderte.";
      case "speaking":
        return "Te estoy respondiendo y volvere a escucharte despues.";
      case "stopping":
        return "Cerrando la conversacion de voz.";
      default:
        return "Solo responde con datos cargados en la base interna. Sin fuentes externas.";
    }
  }, [error, voiceSessionState, voiceStatus]);

  function mapSessionStateToVoiceStatus(sessionState: VoiceSessionState): VoiceStatus {
    if (!speechRecognition.isSupported()) {
      return "unsupported";
    }

    switch (sessionState) {
      case "listening":
        return "listening";
      case "processing":
        return "processing";
      case "speaking":
      case "starting":
        return "speaking";
      case "stopping":
      case "inactive":
      default:
        return "idle";
    }
  }

  function setSessionState(sessionState: VoiceSessionState) {
    voiceSessionStateRef.current = sessionState;
    setVoiceSessionState(sessionState);
    setVoiceStatus(mapSessionStateToVoiceStatus(sessionState));
  }

  function appendLocalAssistantMessage(content: string) {
    const message: ChatMessage = {
      id: `local-${Date.now()}`,
      role: "assistant",
      content,
      inputType: "voice",
      createdAt: new Date().toISOString(),
    };

    startTransition(() => {
      setMessages((current) => [...current, message]);
    });
  }

  function isVoiceSessionActive() {
    return voiceSessionStateRef.current !== "inactive" && voiceSessionStateRef.current !== "stopping";
  }

  function stopVoiceSession(reason?: string) {
    if (voiceSessionStateRef.current === "inactive") {
      return;
    }

    setSessionState("stopping");
    textToSpeech.stop();
    speechRecognition.stop();
    setLoading(false);
    setSessionState("inactive");

    if (reason) {
      setError(reason);
    }
  }

  async function speakText(text: string) {
    if (!textToSpeech.isSupported()) {
      return;
    }

    await textToSpeech.speak(text);
  }

  async function submitMessage(message: string, inputType: "text" | "voice") {
    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }

    setLoading(true);
    setError(null);

    if (inputType === "voice") {
      setSessionState("processing");
    }

    try {
      const response = await api.sendChat({
        conversationId: conversationIdRef.current,
        branch: branchRef.current,
        message: trimmed,
        inputType,
      });

      startTransition(() => {
        setConversation(response.conversation);
        setMessages(response.conversation.messages);
        setInput("");
      });

      if (inputType === "voice" && isVoiceSessionActive()) {
        setSessionState("speaking");
        await speakText(response.answer);
      }
    } catch (requestError) {
      const requestMessage =
        requestError instanceof Error
          ? `Modo demo activo. ${requestError.message}`
          : "Modo demo activo. No se pudo enviar la consulta.";
      setError(requestMessage);
      if (inputType === "voice") {
        stopVoiceSession(requestMessage);
      }
    } finally {
      setLoading(false);
    }
  }

  async function runVoiceLoop() {
    while (isVoiceSessionActive()) {
      setSessionState("listening");

      try {
        const result = await speechRecognition.listen(VOICE_IDLE_TIMEOUT_MS);

        if (!isVoiceSessionActive()) {
          return;
        }

        if (!result.transcript.trim()) {
          continue;
        }

        await submitMessage(result.transcript, "voice");

        if (!isVoiceSessionActive()) {
          return;
        }
      } catch (voiceError) {
        const message = voiceError instanceof Error ? voiceError.message : "No se pudo capturar la voz.";

        if (message === "Reconocimiento cancelado.") {
          stopVoiceSession();
          return;
        }

        if (message.includes("Tiempo de espera agotado")) {
          stopVoiceSession("He cerrado la conversacion por inactividad. Pulsa el micro cuando quieras volver a hablar.");
          return;
        }

        stopVoiceSession(message);
        return;
      }
    }
  }

  async function startVoiceSession() {
    if (!speechRecognition.isSupported()) {
      setVoiceStatus("unsupported");
      setError("La transcripcion de voz no esta disponible en este dispositivo. Usa el teclado o configura un proveedor alternativo.");
      return;
    }

    if (isVoiceSessionActive()) {
      return;
    }

    setError(null);
    setSessionState("starting");
    appendLocalAssistantMessage("Hola?");

    try {
      await speakText("Hola?");
    } catch {
      // Ignore TTS greeting failures and continue to listening.
    }

    if (!isVoiceSessionActive()) {
      return;
    }

    void runVoiceLoop();
  }

  async function handleVoiceToggle() {
    if (isVoiceSessionActive()) {
      stopVoiceSession();
      return;
    }

    await startVoiceSession();
  }

  return (
    <main className="app-shell">
      <div className="phone-frame">
        <Header branch={branch} />
        <div className="app-body">
          <div className="thread-scroll" ref={threadRef}>
            <ConversationThread messages={messages} />
          </div>
          <div className="app-bottom-dock">
            <VoicePanel
              voiceStatus={voiceStatus}
              active={voiceModeActive}
              sessionState={voiceSessionState}
              onToggleVoice={handleVoiceToggle}
            />
            <p className="helper-text">{helperText}</p>
            <Composer
              value={input}
              onChange={setInput}
              onSubmit={() => void submitMessage(input, "text")}
              onToggleTts={() => setTtsEnabled((current) => !current)}
              ttsEnabled={ttsEnabled}
              disabled={loading && !voiceModeActive}
            />
          </div>
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
