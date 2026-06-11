import { Router } from "express";

import { env } from "../config.js";

export const configRouter = Router();

configRouter.get("/public", (_request, response) => {
  response.json({
    defaultBranch: env.DEFAULT_BRANCH,
    voice: {
      sttProvider: env.VOICE_STT_PROVIDER,
      ttsProvider: env.VOICE_TTS_PROVIDER,
      ttsEnabled: env.ENABLE_TTS,
      wakeWordEnabled: env.VOICE_WAKEWORD_ENABLED,
      wakeWordPhrase: env.VOICE_WAKEWORD_PHRASE,
    },
    llmEnabled: Boolean(env.OPENAI_API_KEY),
  });
});
