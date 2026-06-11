export const expectedCsvColumns = [
  "referencia",
  "nombre_producto",
  "precio_eur",
  "stock",
] as const;

export type CsvProductRow = Record<string, string>;

export function normalizeHeader(header: string): string {
  return header.trim().toLowerCase();
}

export function validateCsvColumns(headers: string[]) {
  const normalizedHeaders = headers.map(normalizeHeader);
  const missing = expectedCsvColumns.filter((column) => !normalizedHeaders.includes(column));

  return {
    valid: missing.length === 0,
    missing,
  };
}

