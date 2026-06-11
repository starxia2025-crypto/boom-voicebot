import { ProductMatch } from "../types.js";

type ConversationContext = {
  recentMessages: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  lastMatchedProducts: ProductMatch[];
};

type ReplyResult =
  | {
      type: "smalltalk";
      answer: string;
      matchedProducts: ProductMatch[];
      hadEnoughData: boolean;
    }
  | {
      type: "clarification";
      answer: string;
      matchedProducts: ProductMatch[];
      hadEnoughData: boolean;
    }
  | {
      type: "product_answer";
      answer?: string;
      matchedProducts: ProductMatch[];
      hadEnoughData: boolean;
    };

const GREETING_PATTERN =
  /\b(hola|buenas|buenos dias|buen dia|buenas tardes|buenas noches|hey|ey|holi)\b/i;
const THANKS_PATTERN = /\b(gracias|muchas gracias|perfecto|genial|vale,? gracias)\b/i;
const FAREWELL_PATTERN = /\b(adios|hasta luego|hasta manana|nos vemos|chao|chau)\b/i;

const STOP_WORDS = new Set([
  "hay",
  "tiene",
  "tenemos",
  "de",
  "del",
  "la",
  "el",
  "los",
  "las",
  "un",
  "una",
  "unos",
  "unas",
  "y",
  "o",
  "precio",
  "stock",
  "disponible",
  "disponibles",
  "cuanto",
  "cuesta",
  "quiero",
  "necesito",
  "busco",
  "para",
  "me",
  "dices",
  "decir",
  "consultar",
  "consulta",
  "producto",
  "productos",
  "referencia",
]);

export class ConversationalResponseService {
  resolve(message: string, matches: ProductMatch[], context: ConversationContext): ReplyResult {
    const trimmed = message.trim();

    if (this.isGreeting(trimmed)) {
      return {
        type: "smalltalk",
        answer: "Hola. Estoy aqui para ayudarte con precios, stock y referencias del catalogo interno de Muebles Boom.",
        matchedProducts: [],
        hadEnoughData: true,
      };
    }

    if (this.isThanks(trimmed)) {
      return {
        type: "smalltalk",
        answer: "De nada. Si quieres, puedo revisar otro producto o una referencia concreta.",
        matchedProducts: [],
        hadEnoughData: true,
      };
    }

    if (this.isFarewell(trimmed)) {
      return {
        type: "smalltalk",
        answer: "Hasta luego. Cuando quieras, vuelvo a ayudarte con cualquier consulta del catalogo.",
        matchedProducts: [],
        hadEnoughData: true,
      };
    }

    const refinedMatches = matches.length > 0 ? matches : this.refineFromPreviousContext(trimmed, context.lastMatchedProducts);
    const ambiguousMatches = this.getAmbiguousMatches(trimmed, refinedMatches);

    if (ambiguousMatches.length > 1) {
      return {
        type: "clarification",
        answer: this.buildClarificationPrompt(ambiguousMatches),
        matchedProducts: ambiguousMatches,
        hadEnoughData: true,
      };
    }

    if (refinedMatches.length === 0) {
      return {
        type: "product_answer",
        answer:
          "No veo esa informacion en la base interna ahora mismo. Prueba con la referencia exacta o con un nombre mas concreto del producto.",
        matchedProducts: [],
        hadEnoughData: false,
      };
    }

    return {
      type: "product_answer",
      matchedProducts: refinedMatches,
      hadEnoughData: refinedMatches.length > 0,
    };
  }

  private isGreeting(message: string) {
    return GREETING_PATTERN.test(message);
  }

  private isThanks(message: string) {
    return THANKS_PATTERN.test(message);
  }

  private isFarewell(message: string) {
    return FAREWELL_PATTERN.test(message);
  }

  private refineFromPreviousContext(message: string, previousMatches: ProductMatch[]) {
    if (previousMatches.length === 0) {
      return [];
    }

    const normalizedMessage = normalizeForSearch(message);
    const terms = extractMeaningfulTerms(normalizedMessage);

    if (terms.length === 0) {
      return previousMatches;
    }

    return previousMatches.filter((product) => {
      const haystack = this.buildHaystack(product);
      return terms.every((term) => haystack.includes(term));
    });
  }

  private getAmbiguousMatches(message: string, matches: ProductMatch[]) {
    if (matches.length <= 1) {
      return [];
    }

    const normalizedMessage = normalizeForSearch(message);
    const hasReference = /\d{4,}/.test(normalizedMessage);

    if (hasReference) {
      return [];
    }

    const terms = extractMeaningfulTerms(normalizedMessage);
    if (terms.length === 0) {
      return matches.slice(0, 4);
    }

    const exactNameMatches = matches.filter((product) => {
      const normalizedName = normalizeForSearch(product.nombre);
      return terms.every((term) => normalizedName.includes(term));
    });

    const uniqueProducts = dedupeBySku(exactNameMatches.length > 1 ? exactNameMatches : matches);
    return uniqueProducts.length > 1 ? uniqueProducts.slice(0, 4) : [];
  }

  private buildClarificationPrompt(matches: ProductMatch[]) {
    const options = matches
      .slice(0, 4)
      .map((product, index) => `${index + 1}. ${formatProductLabel(product)}`)
      .join(" ");

    return `He encontrado varias coincidencias. Dime cual necesitas: ${options}`;
  }

  private buildHaystack(product: ProductMatch) {
    return normalizeForSearch([product.sku, product.nombre, product.descripcion, product.categoria].filter(Boolean).join(" "));
  }
}

function normalizeForSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractMeaningfulTerms(normalizedValue: string) {
  return normalizedValue
    .split(" ")
    .map((term) => term.trim())
    .filter((term) => term.length > 1 && !STOP_WORDS.has(term));
}

function dedupeBySku(products: ProductMatch[]) {
  const seen = new Set<string>();
  return products.filter((product) => {
    if (seen.has(product.sku)) {
      return false;
    }

    seen.add(product.sku);
    return true;
  });
}

function formatProductLabel(product: ProductMatch) {
  const price = product.precioEur != null ? `${product.precioEur} EUR` : "precio no disponible";
  const stock = product.stock != null ? `${product.stock} uds` : "stock no disponible";
  return `${product.nombre} (${product.sku}, ${price}, ${stock})`;
}
