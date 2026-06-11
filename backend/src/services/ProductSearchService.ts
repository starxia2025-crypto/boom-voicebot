import { DatabaseProductRepository } from "../repositories/DatabaseProductRepository.js";

export class ProductSearchService {
  constructor(private readonly repository = new DatabaseProductRepository()) {}

  async search(query: string, branch?: string) {
    return this.repository.search(query, branch);
  }
}

