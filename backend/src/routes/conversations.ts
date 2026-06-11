import { Router } from "express";
import { z } from "zod";

import { asyncHandler } from "../middleware/asyncHandler.js";
import { ConversationService } from "../services/ConversationService.js";

export const conversationsRouter = Router();
const conversationService = new ConversationService();

conversationsRouter.get(
  "/",
  asyncHandler(async (_request, response) => {
    const conversations = await conversationService.list();
    response.json({ conversations });
  }),
);

conversationsRouter.get(
  "/:id",
  asyncHandler(async (request, response) => {
    const schema = z.object({ id: z.string().min(1) });
    const { id } = schema.parse(request.params);
    const conversation = await conversationService.getById(id);

    if (!conversation) {
      response.status(404).json({ message: "Conversacion no encontrada" });
      return;
    }

    response.json({ conversation });
  }),
);

