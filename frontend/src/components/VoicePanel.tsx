import type { VoiceSessionState, VoiceStatus } from "../types";

type VoicePanelProps = {
  voiceStatus: VoiceStatus;
  active: boolean;
  sessionState: VoiceSessionState;
  onToggleVoice: () => void;
  disabled?: boolean;
};

const labelMap: Record<VoiceStatus, string> = {
  idle: "Listo",
  listening: "Escuchando...",
  processing: "Procesando...",
  speaking: "Respondiendo...",
  unsupported: "Listo",
};

export function VoicePanel({ voiceStatus, active, sessionState, onToggleVoice, disabled }: VoicePanelProps) {
  const isStoppingState = active && sessionState !== "starting";

  return (
    <section className="voice-panel">
      <button
        className={`voice-button ${active ? "voice-button-active" : "voice-button-idle"} voice-${voiceStatus}`}
        onClick={onToggleVoice}
        disabled={disabled}
        type="button"
        aria-label={isStoppingState ? "Detener conversacion de voz" : "Iniciar conversacion de voz"}
      >
        <span className="voice-icon-shell" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            {active ? (
              <path
                d="M8 8h8v8H8z"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : (
              <path
                d="M12 15a4 4 0 0 0 4-4V7a4 4 0 1 0-8 0v4a4 4 0 0 0 4 4Zm0 0v4m-4 0h8m4-8a8 8 0 0 1-16 0"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>
        </span>
        <span className="voice-copy">
          <strong>Conversacion en vivo</strong>
          <span>{active ? "Toca para detener" : "Toca para hablar"}</span>
        </span>
      </button>
      <div className="voice-caption">{labelMap[voiceStatus]}</div>
    </section>
  );
}
