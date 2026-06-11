import path from "node:path";

import { env } from "../config.js";
import { Prisma } from "../generated/prisma/client.js";
import { CsvDataProvider } from "../providers/CsvDataProvider.js";
import { DatabaseProductRepository } from "../repositories/DatabaseProductRepository.js";

export class CsvImportService {
  constructor(
    private readonly csvProvider = new CsvDataProvider(),
    private readonly repository = new DatabaseProductRepository(),
  ) {}

  async importFromFile(filePath = path.join(env.rootDir, "data", "muebles.csv")) {
    const rows = await this.csvProvider.read(filePath);

    const products: Prisma.ProductCreateManyInput[] = rows.map((row) => ({
      sku: row.referencia?.trim() ?? "",
      nombre: row.nombre_producto?.trim() ?? "Producto sin nombre",
      precioEur: row.precio_eur ? new Prisma.Decimal(row.precio_eur.replace(",", ".")) : undefined,
      stock: row.stock ? Number.parseInt(row.stock, 10) : null,
      categoria: row.categoria?.trim() || null,
      descripcion: row.descripcion?.trim() || null,
      material: row.material?.trim() || null,
      color: row.color?.trim() || null,
      medidas: row.medidas?.trim() || null,
      sucursal: row.sucursal?.trim() || null,
      ubicacion: row.ubicacion?.trim() || null,
      actualizadoEn: row.actualizado_en ? new Date(row.actualizado_en) : new Date(),
      sourceRow: row,
    }));

    const validProducts = products.filter((product) => product.sku);
    await this.repository.replaceAll(validProducts);

    return {
      imported: validProducts.length,
      filePath,
    };
  }
}
