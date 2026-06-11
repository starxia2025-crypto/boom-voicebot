import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  APP_URL: z.string().default("http://localhost:5173"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-5.5"),
  OPENAI_REASONING_EFFORT: z.enum(["minimal", "low", "medium", "high"]).default("medium"),
  DEFAULT_BRANCH: z.string().default("Sucursal Centro"),
  VOICE_STT_PROVIDER: z.string().default("browser"),
  VOICE_TTS_PROVIDER: z.string().default("browser"),
  VOICE_SERVICE_URL: z.string().default("http://localhost:8000"),
  VOICE_WAKEWORD_ENABLED: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  VOICE_WAKEWORD_PHRASE: z.string().default("Oye Boom"),
  MAX_CSV_FILE_SIZE_BYTES: z.coerce.number().default(5 * 1024 * 1024),
  MAX_CHAT_QUESTION_LENGTH: z.coerce.number().default(500),
  ENABLE_TTS: z
    .string()
    .optional()
    .transform((value) => value !== "false"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration");
}

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export const env = {
  ...parsed.data,
  rootDir: path.resolve(currentDir, "..", ".."),
};
