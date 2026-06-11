import express, { Router } from "express";
import { z } from "zod";

import { asyncHandler } from "../middleware/asyncHandler.js";
import { VoiceGatewayService } from "../services/VoiceGatewayService.js";

const rawAudioParser = express.raw({
  type: ["audio/wav", "audio/x-wav", "application/octet-stream"],
  limit: "10mb",
});

export const voiceRouter = Router();
const voiceGatewayService = new VoiceGatewayService();

voiceRouter.post(
  "/tts",
  asyncHandler(async (request, response) => {
    const schema = z.object({
      text: z.string().trim().min(1).max(1_500),
    });

    const body = schema.parse(request.body);
    const result = await voiceGatewayService.synthesize(body.text);

    response.setHeader("Content-Type", result.contentType);
    response.send(result.audio);
  }),
);

voiceRouter.post(
  "/stt",
  rawAudioParser,
  asyncHandler(async (request, response) => {
    const contentType = request.header("content-type") ?? "audio/wav";
    const audio = request.body;

    if (!Buffer.isBuffer(audio) || audio.length === 0) {
      response.status(400).json({
        message: "No se ha recibido audio para transcribir.",
      });
      return;
    }

    const result = await voiceGatewayService.transcribe(audio, contentType);
    response.json(result);
  }),
);

voiceRouter.post(
  "/wakeword",
  rawAudioParser,
  asyncHandler(async (request, response) => {
    const contentType = request.header("content-type") ?? "audio/wav";
    const audio = request.body;

    if (!Buffer.isBuffer(audio) || audio.length === 0) {
      response.status(400).json({
        message: "No se ha recibido audio para detectar la palabra de activacion.",
      });
      return;
    }

    const result = await voiceGatewayService.detectWakeWord(audio, contentType);
    response.json(result);
  }),
);
