import { Router } from "express";
import { z } from "zod";

import { env } from "../config.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { AiService } from "../services/AiService.js";
import { ConversationalResponseService } from "../services/ConversationalResponseService.js";
import { ConversationService } from "../services/ConversationService.js";
import { ProductSearchService } from "../services/ProductSearchService.js";

export const chatRouter = Router();
const aiService = new AiService();
const productSearchService = new ProductSearchService();
const conversationService = new ConversationService();
const conversationalResponseService = new ConversationalResponseService();

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
    const context = await conversationService.getContext(body.conversationId);
    const matches = await productSearchService.search(normalizedQuery, body.branch);
    const reply = conversationalResponseService.resolve(body.message, matches, context);
    const hadEnoughData = reply.hadEnoughData;
    const answer =
      reply.type === "product_answer" && reply.matchedProducts.length > 0
        ? await aiService.answerQuestion({
            question: body.message,
            products: reply.matchedProducts,
            recentMessages: context.recentMessages,
          })
        : reply.answer ?? "No veo esa informacion en la base interna ahora mismo.";

    const conversation = await conversationService.createOrAppend({
      conversationId: body.conversationId,
      branch: body.branch,
      userMessage: body.message,
      assistantMessage: answer,
      inputType: body.inputType,
      normalizedQuery,
      matchedProducts: reply.matchedProducts,
      hadEnoughData,
    });

    response.json({
      conversation,
      answer,
      matchedProducts: reply.matchedProducts,
      hadEnoughData,
    });
  }),
);
