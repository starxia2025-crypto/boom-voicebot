export class RemoteAudioPlayerService {
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private currentResolver: (() => void) | null = null;
  private unlocked = false;

  isSupported() {
    return typeof window.AudioContext !== "undefined";
  }

  async unlock() {
    if (!this.isSupported()) {
      return;
    }

    if (!this.audioContext) {
      this.audioContext = new window.AudioContext();
    }

    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    this.unlocked = this.audioContext.state === "running";
  }

  async play(audioBlob: Blob) {
    if (!this.isSupported()) {
      throw new Error("La reproduccion de audio no esta disponible en este dispositivo.");
    }

    await this.unlock();
    if (!this.audioContext || !this.unlocked) {
      throw new Error("El navegador ha bloqueado la reproduccion de audio. Toca de nuevo el boton para habilitar el sonido.");
    }

    this.stop();

    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0));

    return new Promise<void>((resolve) => {
      if (!this.audioContext) {
        resolve();
        return;
      }

      this.currentResolver = resolve;
      this.currentSource = this.audioContext.createBufferSource();
      this.currentSource.buffer = audioBuffer;
      this.currentSource.connect(this.audioContext.destination);
      this.currentSource.onended = () => {
        this.finish(resolve);
      };
      this.currentSource.start(0);
    });
  }

  stop() {
    if (this.currentSource) {
      this.currentSource.onended = null;
      try {
        this.currentSource.stop();
      } catch {
        // Ignore stop errors if the source already finished.
      }
      this.currentSource.disconnect();
    }

    this.currentResolver?.();
    this.cleanup();
  }

  private finish(resolve: () => void) {
    this.cleanup();
    resolve();
  }

  private cleanup() {
    this.currentSource = null;
    this.currentResolver = null;
  }
}
