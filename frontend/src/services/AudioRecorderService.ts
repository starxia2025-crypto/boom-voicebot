type RecordUtteranceOptions = {
  maxDurationMs: number;
  silenceDurationMs: number;
  minDurationMs: number;
  silenceThreshold: number;
};

export class AudioRecorderService {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private samples: Float32Array[] = [];
  private currentPromiseReject: ((reason?: unknown) => void) | null = null;
  private stopRequested = false;
  private intervalId: number | null = null;

  isSupported() {
    return Boolean(navigator.mediaDevices?.getUserMedia) && typeof window.AudioContext !== "undefined";
  }

  async recordUtterance(options: RecordUtteranceOptions) {
    return this.captureAudio({
      mode: "utterance",
      ...options,
    });
  }

  async recordWindow(durationMs: number) {
    return this.captureAudio({
      mode: "window",
      maxDurationMs: durationMs,
      silenceDurationMs: durationMs,
      minDurationMs: 0,
      silenceThreshold: 0,
    });
  }

  stop() {
    this.stopRequested = true;
    this.currentPromiseReject?.(new Error("Recording cancelled"));
    this.cleanup();
  }

  private async captureAudio(
    options: RecordUtteranceOptions & {
      mode: "utterance" | "window";
    },
  ) {
    if (!this.isSupported()) {
      throw new Error("La grabacion de audio no esta disponible en este dispositivo.");
    }

    this.stopRequested = false;
    this.samples = [];

    return new Promise<Blob>(async (resolve, reject) => {
      this.currentPromiseReject = reject;

      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });

        this.audioContext = new window.AudioContext({ sampleRate: 16000 });
        this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
        this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);

        const startedAt = Date.now();
        let lastVoiceAt = startedAt;
        let heardVoice = false;

        this.processorNode.onaudioprocess = (event) => {
          const input = event.inputBuffer.getChannelData(0);
          this.samples.push(new Float32Array(input));

          let sum = 0;
          for (let index = 0; index < input.length; index += 1) {
            sum += input[index] * input[index];
          }

          const rms = Math.sqrt(sum / input.length);
          if (rms >= options.silenceThreshold) {
            heardVoice = true;
            lastVoiceAt = Date.now();
          }
        };

        this.sourceNode.connect(this.processorNode);
        this.processorNode.connect(this.audioContext.destination);

        this.intervalId = window.setInterval(() => {
          if (this.stopRequested) {
            this.clearInterval();
            return;
          }

          const now = Date.now();
          const elapsed = now - startedAt;

          if (options.mode === "window" && elapsed >= options.maxDurationMs) {
            this.clearInterval();
            resolve(this.finishCapture());
            return;
          }

          if (elapsed >= options.maxDurationMs) {
            this.clearInterval();
            if (!heardVoice) {
              reject(new Error("Tiempo de espera agotado. He cerrado el micro por inactividad."));
              this.cleanup();
              return;
            }

            resolve(this.finishCapture());
            return;
          }

          if (
            options.mode === "utterance" &&
            heardVoice &&
            elapsed >= options.minDurationMs &&
            now - lastVoiceAt >= options.silenceDurationMs
          ) {
            this.clearInterval();
            resolve(this.finishCapture());
          }
        }, 120);
      } catch (error) {
        reject(error);
        this.cleanup();
      }
    });
  }

  private finishCapture() {
    const sampleRate = this.audioContext?.sampleRate ?? 16000;
    const blob = encodeWav(this.mergeSamples(), sampleRate);
    this.cleanup();
    return blob;
  }

  private mergeSamples() {
    const totalLength = this.samples.reduce((sum, chunk) => sum + chunk.length, 0);
    const merged = new Float32Array(totalLength);
    let offset = 0;

    for (const chunk of this.samples) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    return merged;
  }

  private cleanup() {
    this.clearInterval();
    this.processorNode?.disconnect();
    this.sourceNode?.disconnect();
    this.stream?.getTracks().forEach((track) => track.stop());

    if (this.audioContext && this.audioContext.state !== "closed") {
      void this.audioContext.close();
    }

    this.stream = null;
    this.audioContext = null;
    this.sourceNode = null;
    this.processorNode = null;
    this.currentPromiseReject = null;
    this.samples = [];
    this.stopRequested = false;
  }

  private clearInterval() {
    if (this.intervalId != null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

function encodeWav(samples: Float32Array, sampleRate: number) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}
