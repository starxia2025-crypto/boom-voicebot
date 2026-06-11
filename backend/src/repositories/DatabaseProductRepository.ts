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
    const terms = query
      .toLowerCase()
      .split(/\s+/)
      .map((term) => term.trim())
      .filter(Boolean);

    const where: Prisma.ProductWhereInput = {
      AND: [
        branch ? { OR: [{ sucursal: branch }, { sucursal: null }] } : {},
        terms.length > 0
          ? {
              OR: terms.flatMap((term) => [
                { sku: { contains: term, mode: "insensitive" } },
                { nombre: { contains: term, mode: "insensitive" } },
                { categoria: { contains: term, mode: "insensitive" } },
                { descripcion: { contains: term, mode: "insensitive" } },
                { color: { contains: term, mode: "insensitive" } },
              ]),
            }
          : {},
      ],
    };

    const products = await prisma.product.findMany({
      where,
      orderBy: [{ stock: "desc" }, { updatedAt: "desc" }],
      take: 8,
    });

    return products.map((product) => ({
      id: product.id,
      sku: product.sku,
      nombre: product.nombre,
      precioEur: product.precioEur ? Number(product.precioEur) : null,
      stock: product.stock,
      sucursal: product.sucursal,
      descripcion: product.descripcion,
      categoria: product.categoria,
      sourceRow: product.sourceRow as Record<string, unknown> | null,
    }));
  }
}
