type BrowserRecognitionResult = {
  transcript?: string;
  confidence?: number;
};

type BrowserRecognitionEvent = {
  results: ArrayLike<ArrayLike<BrowserRecognitionResult>>;
};

type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: BrowserRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type BrowserSpeechRecognitionCtor = new () => BrowserSpeechRecognition;

declare global {
  interface Window {
    webkitSpeechRecognition?: BrowserSpeechRecognitionCtor;
    SpeechRecognition?: BrowserSpeechRecognitionCtor;
  }
}

export class BrowserSpeechRecognitionService {
  private recognition: BrowserSpeechRecognition | null = null;

  isSupported() {
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  listen(): Promise<{ transcript: string; confidence?: number }> {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      return Promise.reject(
        new Error(
          "La transcripcion de voz no esta disponible en este dispositivo. Usa el teclado o configura un proveedor alternativo.",
        ),
      );
    }

    return new Promise((resolve, reject) => {
      this.recognition = new SpeechRecognitionCtor();
      this.recognition.lang = "es-ES";
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 1;

      this.recognition.onresult = (event: BrowserRecognitionEvent) => {
        const result = event.results[0]?.[0];
        resolve({
          transcript: result?.transcript?.trim() ?? "",
          confidence: result?.confidence,
        });
      };

      this.recognition.onerror = () => {
        reject(
          new Error(
            "La transcripcion de voz no esta disponible en este dispositivo. Usa el teclado o configura un proveedor alternativo.",
          ),
        );
      };

      this.recognition.onend = () => {
        this.recognition = null;
      };

      this.recognition.start();
    });
  }

  stop() {
    this.recognition?.stop();
  }
}
