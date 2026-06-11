import { env } from "../config.js";

type VoiceJsonError = {
  detail?: string;
  message?: string;
};

export class VoiceGatewayService {
  async synthesize(text: string) {
    const response = await fetch(`${env.VOICE_SERVICE_URL}/tts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      throw new Error(await this.readError(response));
    }

    return {
      audio: Buffer.from(await response.arrayBuffer()),
      contentType: response.headers.get("content-type") ?? "audio/wav",
    };
  }

  async transcribe(audio: Buffer, contentType: string) {
    const response = await fetch(`${env.VOICE_SERVICE_URL}/stt`, {
      method: "POST",
      headers: {
        "Content-Type": contentType,
      },
      body: audio,
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      throw new Error(await this.readError(response));
    }

    return (await response.json()) as {
      text: string;
      language?: string;
      durationSeconds?: number;
    };
  }

  async detectWakeWord(audio: Buffer, contentType: string) {
    const response = await fetch(`${env.VOICE_SERVICE_URL}/wakeword/detect`, {
      method: "POST",
      headers: {
        "Content-Type": contentType,
      },
      body: audio,
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      throw new Error(await this.readError(response));
    }

    return (await response.json()) as {
      enabled: boolean;
      detected: boolean;
      score?: number;
      phrase?: string;
    };
  }

  private async readError(response: Response) {
    const payload = (await response.json().catch(() => null)) as VoiceJsonError | null;
    return payload?.detail ?? payload?.message ?? "No se pudo completar la operacion de voz.";
  }
}
