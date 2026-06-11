import { Router } from "express";
import { z } from "zod";

import { asyncHandler } from "../middleware/asyncHandler.js";
import { CsvImportService } from "../services/CsvImportService.js";

export const importRouter = Router();
const csvImportService = new CsvImportService();

importRouter.post(
  "/csv",
  asyncHandler(async (request, response) => {
    const schema = z.object({
      filePath: z.string().optional(),
    });

    const body = schema.parse(request.body ?? {});
    const result = await csvImportService.importFromFile(body.filePath);
    response.json(result);
  }),
);

