import { Router } from "express";
import { z } from "zod";

import { asyncHandler } from "../middleware/asyncHandler.js";
import { ProductSearchService } from "../services/ProductSearchService.js";

export const productsRouter = Router();
const productSearchService = new ProductSearchService();

productsRouter.get(
  "/search",
  asyncHandler(async (request, response) => {
    const schema = z.object({
      query: z.string().min(1),
      branch: z.string().optional(),
    });

    const parsed = schema.parse(request.query);
    const products = await productSearchService.search(parsed.query, parsed.branch);

    response.json({ products });
  }),
);

