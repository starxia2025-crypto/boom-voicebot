import path from "node:path";

import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "./config.js";
import { authPlaceholder } from "./middleware/authPlaceholder.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { chatRouter } from "./routes/chat.js";
import { configRouter } from "./routes/config.js";
import { conversationsRouter } from "./routes/conversations.js";
import { healthRouter } from "./routes/health.js";
import { importRouter } from "./routes/import.js";
import { productsRouter } from "./routes/products.js";
import { voiceRouter } from "./routes/voice.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
  }),
);
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);
app.use(morgan("dev"));
app.use(express.json({ limit: "1mb" }));
app.use(authPlaceholder);

app.use("/api/health", healthRouter);
app.use("/api/import", importRouter);
app.use("/api/products", productsRouter);
app.use("/api/chat", chatRouter);
app.use("/api/conversations", conversationsRouter);
app.use("/api/config", configRouter);
app.use("/api/voice", voiceRouter);

const frontendDist = path.resolve(env.rootDir, "frontend", "dist");
app.use(express.static(frontendDist));

app.get("/{*path}", (_request, response) => {
  response.sendFile(path.join(frontendDist, "index.html"));
});

app.use(errorHandler);

export { app };
