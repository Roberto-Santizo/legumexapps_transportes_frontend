import type { PaginatedProducts, Product, ProductDatasource, ProductForm } from "@/features/products/products";
import { ProductRepository } from "@/features/products/products";

export class ProductRepositoryImpl extends ProductRepository {
    constructor(private datasource: ProductDatasource) {
        super();
    }

    createProduct(payload: ProductForm): Promise<string> {
        return this.datasource.createProduct(payload);
    }

    getProducts(limit: string, page: string): Promise<PaginatedProducts> {
        return this.datasource.getProducts(limit, page);
    }

    getProductById(id: string): Promise<Product> {
        return this.datasource.getProductById(id);
    }

    updateProductById(id: string, payload: ProductForm): Promise<string> {
        return this.datasource.updateProductById(id, payload);
    }

    deleteProductById(id: string): Promise<string> {
        return this.datasource.deleteProductById(id);
    }
}
