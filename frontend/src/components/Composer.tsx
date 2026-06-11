import type { FormEvent } from "react";

type ComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onToggleTts: () => void;
  ttsEnabled: boolean;
  disabled?: boolean;
};

export function Composer({ value, onChange, onSubmit, onToggleTts, ttsEnabled, disabled }: ComposerProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form className="composer" onSubmit={handleSubmit}>
      <button className={`tts-toggle ${ttsEnabled ? "tts-on" : ""}`} onClick={onToggleTts} type="button">
        Voz
      </button>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Escribe tu consulta..."
        maxLength={500}
        disabled={disabled}
      />
      <button className="send-button" disabled={disabled || !value.trim()} type="submit" aria-label="Enviar">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4 12 20 4l-4 16-4.5-5.5L4 12Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </form>
  );
}
