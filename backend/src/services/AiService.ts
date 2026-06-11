import OpenAI from "openai";

import { env } from "../config.js";
import { BOOM_ASSISTANT_SYSTEM_PROMPT } from "../prompts/systemPrompt.js";
import { ProductMatch } from "../types.js";

const NO_DATA_RESPONSE = "No tengo informacion suficiente en la base de datos para responder eso.";

export class AiService {
  private readonly client = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;

  async answerQuestion(params: {
    question: string;
    products: ProductMatch[];
    recentMessages?: Array<{ role: "user" | "assistant"; content: string }>;
  }): Promise<string> {
    const { products, question, recentMessages = [] } = params;

    if (products.length === 0) {
      return NO_DATA_RESPONSE;
    }

    if (!this.client) {
      return this.buildDeterministicAnswer(products);
    }

    const response = await this.client.responses.create({
      model: env.OPENAI_MODEL,
      reasoning: { effort: env.OPENAI_REASONING_EFFORT },
      instructions: BOOM_ASSISTANT_SYSTEM_PROMPT,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: [
                "Reglas operativas de esta respuesta:",
                "- Responde solo con los datos internos adjuntos.",
                `- Si los datos no alcanzan, responde exactamente: ${NO_DATA_RESPONSE}`,
                "- Si hay varias coincidencias, pide aclaracion de forma breve y concreta.",
              ].join("\n"),
            },
          ],
        },
        ...recentMessages.slice(-4).map((message) => ({
          role: message.role,
          content: [{ type: "input_text" as const, text: message.content }],
        })),
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Pregunta actual del empleado: ${question}\nDatos internos disponibles: ${JSON.stringify(products)}`,
            },
          ],
        },
      ],
    });

    return response.output_text?.trim() || NO_DATA_RESPONSE;
  }

  private buildDeterministicAnswer(products: ProductMatch[]) {
    const lines = products.slice(0, 3).map((product) => {
      const price = product.precioEur != null ? `${product.precioEur} EUR` : "precio no disponible";
      const stock = product.stock != null ? `${product.stock} unidades` : "stock no disponible";
      const branch = product.sucursal ?? "sin sucursal especificada";
      return `${product.nombre}: ${price}, ${stock}, ${branch}.`;
    });

    return lines.join(" ");
  }
}
