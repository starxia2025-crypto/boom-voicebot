import { startTransition, useEffect, useMemo, useRef, useState } from "react";

import { Composer } from "./components/Composer";
import { ConversationThread } from "./components/ConversationThread";
import { Header } from "./components/Header";
import { VoicePanel } from "./components/VoicePanel";
import { api } from "./services/api";
import { AudioRecorderService } from "./services/AudioRecorderService";
import { BrowserTextToSpeechService } from "./services/BrowserTextToSpeechService";
import { RemoteAudioPlayerService } from "./services/RemoteAudioPlayerService";
import type { ChatMessage, Conversation, PublicConfig, VoiceSessionState, VoiceStatus } from "./types";

const audioRecorder = new AudioRecorderService();
const remoteAudioPlayer = new RemoteAudioPlayerService();
const browserTextToSpeech = new BrowserTextToSpeechService();

const VOICE_IDLE_TIMEOUT_MS = 15000;
const VOICE_SILENCE_DURATION_MS = 1200;
const VOICE_MIN_DURATION_MS = 900;
const WAKEWORD_WINDOW_MS = 2000;

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
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>(audioRecorder.isSupported() ? "idle" : "unsupported");
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [pageVisible, setPageVisible] = useState(document.visibilityState === "visible");
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
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === "visible";
      setPageVisible(visible);

      if (!visible) {
        audioRecorder.stop();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

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

  useEffect(() => {
    if (!config?.voice.wakeWordEnabled || !pageVisible) {
      return;
    }

    if (voiceSessionState !== "inactive" && voiceSessionState !== "speaking") {
      return;
    }

    let cancelled = false;

    const runWakeWordLoop = async () => {
      while (!cancelled) {
        const currentState = voiceSessionStateRef.current;
        if (document.visibilityState !== "visible" || (currentState !== "inactive" && currentState !== "speaking")) {
          return;
        }

        try {
          const wakeWordAudio = await audioRecorder.recordWindow(WAKEWORD_WINDOW_MS);
          if (cancelled) {
            return;
          }

          const detection = await api.detectWakeWord(wakeWordAudio);
          if (!detection.enabled || cancelled) {
            await sleep(500);
            continue;
          }

          if (!detection.detected) {
            await sleep(350);
            continue;
          }

          if (voiceSessionStateRef.current === "speaking") {
            remoteAudioPlayer.stop();
            browserTextToSpeech.stop();
            setError(`He detenido la respuesta al escuchar "boom". Puedes seguir hablando.`);
            if (isVoiceSessionActive()) {
              setSessionState("listening");
              void runVoiceLoop();
            }
            return;
          }

          if (voiceSessionStateRef.current === "inactive") {
            await startVoiceSession(false);
            return;
          }
        } catch (wakeWordError) {
          const message = wakeWordError instanceof Error ? wakeWordError.message : "No se pudo evaluar la palabra de activacion.";
          if (message === "Recording cancelled" || cancelled) {
            return;
          }

          await sleep(650);
        }
      }
    };

    void runWakeWordLoop();

    return () => {
      cancelled = true;
      audioRecorder.stop();
    };
  }, [config?.voice.wakeWordEnabled, pageVisible, voiceSessionState]);

  const voiceModeActive = voiceSessionState !== "inactive";

  const helperText = useMemo(() => {
    if (voiceStatus === "unsupported") {
      return "La grabacion de audio no esta disponible en este dispositivo. Usa el teclado o revisa permisos del microfono.";
    }

    if (error) {
      return error;
    }

    switch (voiceSessionState) {
      case "starting":
        return "Estoy iniciando la conversacion. Enseguida te escucho.";
      case "listening":
        return config?.voice.wakeWordEnabled
          ? `Te escucho. Puedes decir "${config.voice.wakeWordPhrase}" para activar o interrumpir la voz.`
          : "Te escucho. Pulsa el boton verde cuando quieras terminar la conversacion.";
      case "processing":
        return "Estoy transcribiendo y revisando tu consulta para responderte.";
      case "speaking":
        return config?.voice.wakeWordEnabled
          ? `Te estoy respondiendo. Di "boom" si quieres que me calle y seguir con otra consulta.`
          : "Te estoy respondiendo y volvere a escucharte despues.";
      case "stopping":
        return "Cerrando la conversacion de voz.";
      default:
        return "Solo responde con datos cargados en la base interna. Sin fuentes externas.";
    }
  }, [config?.voice.wakeWordEnabled, config?.voice.wakeWordPhrase, error, voiceSessionState, voiceStatus]);

  function mapSessionStateToVoiceStatus(sessionState: VoiceSessionState): VoiceStatus {
    if (!audioRecorder.isSupported()) {
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
    remoteAudioPlayer.stop();
    browserTextToSpeech.stop();
    audioRecorder.stop();
    setLoading(false);
    setSessionState("inactive");

    if (reason) {
      setError(reason);
    }
  }

  async function playBotAudio(text: string, forcePlayback = false) {
    const ttsProvider = config?.voice.ttsProvider ?? "browser";
    const shouldSpeak = forcePlayback || ttsEnabled;

    if (!shouldSpeak) {
      return;
    }

    if (ttsProvider === "piper") {
      const audio = await api.synthesizeSpeech(text);
      if (!isVoiceSessionActive() && !forcePlayback) {
        return;
      }

      await remoteAudioPlayer.play(audio);
      return;
    }

    await browserTextToSpeech.speak(text);
  }

  async function transcribeVoiceInput() {
    const sttProvider = config?.voice.sttProvider ?? "faster_whisper";

    if (sttProvider !== "faster_whisper") {
      throw new Error("El proveedor de transcripcion configurado no esta soportado en esta version.");
    }

    const audio = await audioRecorder.recordUtterance({
      maxDurationMs: VOICE_IDLE_TIMEOUT_MS,
      silenceDurationMs: VOICE_SILENCE_DURATION_MS,
      minDurationMs: VOICE_MIN_DURATION_MS,
      silenceThreshold: 0.018,
    });
    const transcription = await api.transcribeAudio(audio);
    return transcription.text.trim();
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
        await playBotAudio(response.answer);
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
        const transcript = await transcribeVoiceInput();
        if (!isVoiceSessionActive()) {
          return;
        }

        if (!transcript) {
          continue;
        }

        await submitMessage(transcript, "voice");
        if (!isVoiceSessionActive()) {
          return;
        }
      } catch (voiceError) {
        const message = voiceError instanceof Error ? voiceError.message : "No se pudo capturar la voz.";

        if (message === "Recording cancelled") {
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

  async function startVoiceSession(withGreeting = true) {
    if (!audioRecorder.isSupported()) {
      setVoiceStatus("unsupported");
      setError("La grabacion de audio no esta disponible en este dispositivo. Usa el teclado o revisa permisos del microfono.");
      return;
    }

    if (isVoiceSessionActive()) {
      return;
    }

    setError(null);
    setSessionState("starting");

    try {
      await remoteAudioPlayer.unlock();
    } catch {
      // Continue and surface playback failures only if they actually happen.
    }

    if (withGreeting) {
      appendLocalAssistantMessage("Hola?");
      try {
        await playBotAudio("Hola?", true);
      } catch (playbackError) {
        setError(
          playbackError instanceof Error
            ? playbackError.message
            : "No he podido reproducir el saludo de voz. Revisa el volumen y vuelve a tocar el boton.",
        );
      }
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

    await startVoiceSession(true);
  }

  return (
    <main className="app-shell">
      <div className="phone-frame">
        <Header />
        <div className="app-body">
          <div className="thread-scroll" ref={threadRef}>
            <ConversationThread messages={messages} />
          </div>
          <div className="app-bottom-dock">
            <Composer
              value={input}
              onChange={setInput}
              onSubmit={() => void submitMessage(input, "text")}
              onToggleTts={() => setTtsEnabled((current) => !current)}
              ttsEnabled={ttsEnabled}
              disabled={loading && !voiceModeActive}
            />
            <VoicePanel
              voiceStatus={voiceStatus}
              active={voiceModeActive}
              sessionState={voiceSessionState}
              onToggleVoice={handleVoiceToggle}
            />
            <p className="helper-text">{helperText}</p>
          </div>
        </div>
      </div>
      <footer className="app-footer">
        <span className="footer-lock" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path
              d="M8 10V8a4 4 0 1 1 8 0v2m-9 0h10v8H7z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        Solo informacion de la base de datos interna
        {config?.llmEnabled ? null : <small>Modo local sin OpenAI</small>}
      </footer>
    </main>
  );
}

function sleep(durationMs: number) {
  return new Promise((resolve) => window.setTimeout(resolve, durationMs));
}
