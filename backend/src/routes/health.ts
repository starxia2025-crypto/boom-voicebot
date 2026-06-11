import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/", (_request, response) => {
  response.json({
    ok: true,
    service: "boom-asistente-api",
    timestamp: new Date().toISOString(),
  });
});

