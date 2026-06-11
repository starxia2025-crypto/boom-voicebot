export class BrowserTextToSpeechService {
  private currentResolver: (() => void) | null = null;

  isSupported() {
    return "speechSynthesis" in window;
  }

  speak(text: string) {
    if (!this.isSupported()) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.currentResolver = resolve;
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      const spanishVoice = window.speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith("es"));

      if (spanishVoice) {
        utterance.voice = spanishVoice;
        utterance.lang = spanishVoice.lang;
      } else {
        utterance.lang = "es-ES";
      }

      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.onend = () => {
        this.currentResolver = null;
        resolve();
      };
      utterance.onerror = () => {
        this.currentResolver = null;
        resolve();
      };
      window.speechSynthesis.speak(utterance);
    });
  }

  stop() {
    if (this.isSupported()) {
      window.speechSynthesis.cancel();
      this.currentResolver?.();
      this.currentResolver = null;
    }
  }
}
