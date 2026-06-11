export type ProductMatch = {
  id: string;
  sku: string;
  nombre: string;
  precioEur: number | null;
  stock: number | null;
  sucursal: string | null;
  descripcion: string | null;
  categoria: string | null;
  sourceRow?: Record<string, unknown> | null;
};

export type ChatInputType = "text" | "voice";

