import fs from "node:fs/promises";
import { parse } from "csv-parse/sync";

import { CsvProductRow, validateCsvColumns } from "../data/csvMapping.js";

export class CsvDataProvider {
  async read(filePath: string): Promise<CsvProductRow[]> {
    const raw = await fs.readFile(filePath, "utf-8");
    const records = parse(raw, {
      columns: true,
      skip_empty_lines: true,
      bom: true,
      trim: true,
    }) as CsvProductRow[];

    const headers = records.length > 0 ? Object.keys(records[0]) : [];
    const validation = validateCsvColumns(headers);

    if (!validation.valid) {
      throw new Error(`CSV invalido. Faltan columnas: ${validation.missing.join(", ")}`);
    }

    return records;
  }
}

