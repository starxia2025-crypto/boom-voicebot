import type { VoiceStatus } from "../types";

type VoicePanelProps = {
  voiceStatus: VoiceStatus;
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

export function VoicePanel({ voiceStatus, onToggleVoice, disabled }: VoicePanelProps) {
  return (
    <section className="voice-panel">
      <div className="voice-status-row">
        <span className="wave-mark" />
        <strong>Conversacion en vivo</strong>
        <span className="wave-mark" />
      </div>
      <button className={`voice-button voice-${voiceStatus}`} onClick={onToggleVoice} disabled={disabled} type="button">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 15a4 4 0 0 0 4-4V7a4 4 0 1 0-8 0v4a4 4 0 0 0 4 4Zm0 0v4m-4 0h8m4-8a8 8 0 0 1-16 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div className="voice-caption">{labelMap[voiceStatus]}</div>
      <p className="voice-subtitle">Toca para hablar</p>
    </section>
  );
}
