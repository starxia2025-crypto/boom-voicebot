import { Router } from "express";
import { z } from "zod";

import { env } from "../config.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { AiService } from "../services/AiService.js";
import { ConversationService } from "../services/ConversationService.js";
import { ProductSearchService } from "../services/ProductSearchService.js";

const NO_DATA_RESPONSE = "No tengo informacion suficiente en la base de datos para responder eso.";

export const chatRouter = Router();
const aiService = new AiService();
const productSearchService = new ProductSearchService();
const conversationService = new ConversationService();

chatRouter.post(
  "/",
  asyncHandler(async (request, response) => {
    const schema = z.object({
      conversationId: z.string().optional(),
      branch: z.string().default(env.DEFAULT_BRANCH),
      message: z.string().trim().min(1).max(env.MAX_CHAT_QUESTION_LENGTH),
      inputType: z.enum(["text", "voice"]).default("text"),
    });

    const body = schema.parse(request.body);
    const normalizedQuery = body.message.toLowerCase().trim();
    const matches = await productSearchService.search(normalizedQuery, body.branch);
    const hadEnoughData = matches.length > 0;
    const answer = hadEnoughData ? await aiService.answerQuestion(body.message, matches) : NO_DATA_RESPONSE;

    const conversation = await conversationService.createOrAppend({
      conversationId: body.conversationId,
      branch: body.branch,
      userMessage: body.message,
      assistantMessage: answer,
      inputType: body.inputType,
      normalizedQuery,
      matchedProducts: matches,
      hadEnoughData,
    });

    response.json({
      conversation,
      answer,
      matchedProducts: matches,
      hadEnoughData,
    });
  }),
);

