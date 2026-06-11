import { prisma } from "../lib/prisma.js";
import { Prisma } from "../generated/prisma/client.js";
import { ProductMatch } from "../types.js";

export class DatabaseProductRepository {
  async replaceAll(products: Prisma.ProductCreateManyInput[]) {
    await prisma.$transaction(async (tx) => {
      await tx.product.deleteMany();
      await tx.product.createMany({ data: products });
    });
  }

  async search(query: string, branch?: string): Promise<ProductMatch[]> {
    const normalizedQuery = normalizeForSearch(query);
    const terms = normalizedQuery
      .split(/\s+/)
      .map((term) => term.trim())
      .filter((term) => term.length > 1);
    const numericReference = normalizedQuery.replace(/\D/g, "");

    const where: Prisma.ProductWhereInput = {
      AND: [
        branch ? { OR: [{ sucursal: branch }, { sucursal: null }] } : {},
        terms.length > 0 || numericReference
          ? {
              OR: [
                ...(numericReference
                  ? [{ sku: { contains: numericReference, mode: Prisma.QueryMode.insensitive } }]
                  : []),
                ...terms.flatMap((term) => [
                  { sku: { contains: term, mode: Prisma.QueryMode.insensitive } },
                  { nombre: { contains: term, mode: Prisma.QueryMode.insensitive } },
                  { categoria: { contains: term, mode: Prisma.QueryMode.insensitive } },
                  { descripcion: { contains: term, mode: Prisma.QueryMode.insensitive } },
                  { color: { contains: term, mode: Prisma.QueryMode.insensitive } },
                ]),
              ],
            }
          : {},
      ],
    };

    const products = await prisma.product.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      take: 24,
    });

    return products
      .map((product) => ({
        id: product.id,
        sku: product.sku,
        nombre: product.nombre,
        precioEur: product.precioEur ? Number(product.precioEur) : null,
        stock: product.stock,
        sucursal: product.sucursal,
        descripcion: product.descripcion,
        categoria: product.categoria,
        sourceRow: product.sourceRow as Record<string, unknown> | null,
      }))
      .map((product) => ({
        product,
        score: scoreProductMatch(product, normalizedQuery, terms, numericReference),
      }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 8)
      .map((entry) => entry.product);
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

function scoreProductMatch(product: ProductMatch, normalizedQuery: string, terms: string[], numericReference: string) {
  const normalizedName = normalizeForSearch(product.nombre);
  const normalizedSku = normalizeForSearch(product.sku);
  const haystack = normalizeForSearch(
    [product.sku, product.nombre, product.descripcion, product.categoria, product.sourceRow?.nombre_producto]
      .filter(Boolean)
      .join(" "),
  );

  let score = 0;

  if (numericReference && normalizedSku.includes(numericReference)) {
    score += normalizedSku === numericReference ? 120 : 80;
  }

  if (normalizedName === normalizedQuery) {
    score += 110;
  }

  if (normalizedName.includes(normalizedQuery) && normalizedQuery.length > 2) {
    score += 70;
  }

  for (const term of terms) {
    if (normalizedSku.includes(term)) {
      score += 35;
    }

    if (normalizedName.includes(term)) {
      score += 30;
    }

    if (haystack.includes(term)) {
      score += 12;
    }
  }

  if (product.stock != null && product.stock > 0) {
    score += 4;
  }

  return score;
}
