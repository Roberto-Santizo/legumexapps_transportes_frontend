import type { PaginatedProducts, Product, ProductForm } from "@/features/products/products";

export abstract class ProductDatasource {
    abstract createProduct(payload: ProductForm): Promise<string>;
    abstract getProducts(limit: string, page: string): Promise<PaginatedProducts>;
    abstract getProductById(id: string): Promise<Product>;
    abstract updateProductById(id: string, payload: ProductForm): Promise<string>;
    abstract deleteProductById(id: string): Promise<string>;
}
