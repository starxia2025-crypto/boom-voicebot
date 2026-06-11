export class BrowserTextToSpeechService {
  isSupported() {
    return "speechSynthesis" in window;
  }

  speak(text: string) {
    if (!this.isSupported()) {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const spanishVoice = window
      .speechSynthesis
      .getVoices()
      .find((voice) => voice.lang.toLowerCase().startsWith("es"));

    if (spanishVoice) {
      utterance.voice = spanishVoice;
      utterance.lang = spanishVoice.lang;
    } else {
      utterance.lang = "es-ES";
    }

    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }

  stop() {
    if (this.isSupported()) {
      window.speechSynthesis.cancel();
    }
  }
}

