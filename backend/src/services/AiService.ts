import OpenAI from "openai";

import { env } from "../config.js";
import { ProductMatch } from "../types.js";

const NO_DATA_RESPONSE = "No tengo informacion suficiente en la base de datos para responder eso.";

export class AiService {
  private readonly client = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;

  async answerQuestion(question: string, products: ProductMatch[]): Promise<string> {
    if (products.length === 0) {
      return NO_DATA_RESPONSE;
    }

    if (!this.client) {
      return this.buildDeterministicAnswer(products);
    }

    const prompt = [
      "Eres Boom Asistente, un bot interno de Muebles Boom.",
      "Responde solo con los datos proporcionados.",
      "No inventes precios, stock, sucursales ni disponibilidad.",
      "Si los datos no alcanzan, responde exactamente: No tengo informacion suficiente en la base de datos para responder eso.",
      `Pregunta del empleado: ${question}`,
      `Datos disponibles: ${JSON.stringify(products)}`,
    ].join("\n");

    const response = await this.client.responses.create({
      model: env.OPENAI_MODEL,
      input: prompt,
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

