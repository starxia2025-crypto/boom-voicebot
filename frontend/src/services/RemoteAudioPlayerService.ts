export class RemoteAudioPlayerService {
  private audio: HTMLAudioElement | null = null;
  private objectUrl: string | null = null;
  private currentResolver: (() => void) | null = null;

  async play(audioBlob: Blob) {
    this.stop();

    this.objectUrl = URL.createObjectURL(audioBlob);
    this.audio = new Audio(this.objectUrl);

    return new Promise<void>((resolve) => {
      this.currentResolver = resolve;

      if (!this.audio) {
        this.currentResolver = null;
        resolve();
        return;
      }

      this.audio.onended = () => {
        this.finish(resolve);
      };

      this.audio.onerror = () => {
        this.finish(resolve);
      };

      void this.audio.play().catch(() => {
        this.finish(resolve);
      });
    });
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }

    this.currentResolver?.();
    this.cleanup();
  }

  private finish(resolve: () => void) {
    this.cleanup();
    resolve();
  }

  private cleanup() {
    this.audio = null;
    this.currentResolver = null;

    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }
}
