import path from "node:path";

import { CsvImportService } from "../services/CsvImportService.js";

const importService = new CsvImportService();
const filePath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(process.cwd(), "..", "data", "muebles.csv");

void importService
  .importFromFile(filePath)
  .then((result) => {
    console.log(`Importados ${result.imported} productos desde ${result.filePath}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

