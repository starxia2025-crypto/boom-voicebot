import OpenAI from "openai";

import { env } from "../config.js";

type VoiceJsonError = {
  detail?: string;
  message?: string;
};

export class VoiceGatewayService {
  private readonly openaiClient = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;

  async synthesize(text: string) {
    if (!this.openaiClient) {
      throw new Error("OPENAI_API_KEY no esta configurada para la sintesis de voz.");
    }

    const response = await this.openaiClient.audio.speech.create({
      model: env.OPENAI_TTS_MODEL,
      voice: env.OPENAI_TTS_VOICE,
      input: text,
      response_format: "wav",
    });

    return {
      audio: Buffer.from(await response.arrayBuffer()),
      contentType: "audio/wav",
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
