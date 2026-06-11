type BrowserRecognitionResult = {
  transcript?: string;
  confidence?: number;
};

type BrowserRecognitionEvent = {
  results: ArrayLike<ArrayLike<BrowserRecognitionResult>>;
};

type BrowserSpeechRecognition = {
  continuous?: boolean;
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: BrowserRecognitionEvent) => void) | null;
  onerror: ((event?: { error?: string }) => void) | null;
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
  private cancelled = false;
  private finished = false;

  isSupported() {
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  listen(timeoutMs = 15000): Promise<{ transcript: string; confidence?: number }> {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      return Promise.reject(
        new Error(
          "La transcripcion de voz no esta disponible en este dispositivo. Usa el teclado o configura un proveedor alternativo.",
        ),
      );
    }

    return new Promise((resolve, reject) => {
      this.cancelled = false;
      this.finished = false;
      this.recognition = new SpeechRecognitionCtor();
      this.recognition.continuous = false;
      this.recognition.lang = "es-ES";
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 1;
      const timeoutId = window.setTimeout(() => {
        this.finish(() => reject(new Error("Tiempo de espera agotado. He cerrado el micro por inactividad.")));
        this.recognition?.stop();
      }, timeoutMs);

      this.recognition.onresult = (event: BrowserRecognitionEvent) => {
        const result = event.results[0]?.[0];
        this.finish(() =>
          resolve({
            transcript: result?.transcript?.trim() ?? "",
            confidence: result?.confidence,
          }),
        );
        window.clearTimeout(timeoutId);
      };

      this.recognition.onerror = (event) => {
        window.clearTimeout(timeoutId);
        if (this.cancelled || event?.error === "aborted") {
          this.finish(() => reject(new Error("Reconocimiento cancelado.")));
          return;
        }

        this.finish(() =>
          reject(
            new Error(
              "La transcripcion de voz no esta disponible en este dispositivo. Revisa permisos del microfono o usa el teclado.",
            ),
          ),
        );
      };

      this.recognition.onend = () => {
        window.clearTimeout(timeoutId);
        this.recognition = null;
        if (!this.finished && !this.cancelled) {
          this.finish(() => reject(new Error("No he podido escucharte. Revisa permisos del microfono o prueba otra vez.")));
        }
      };

      this.recognition.start();
    });
  }

  stop() {
    this.cancelled = true;
    this.recognition?.stop();
  }

  private finish(callback: () => void) {
    if (this.finished) {
      return;
    }

    this.finished = true;
    callback();
  }
}
