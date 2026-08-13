import type { ProductForm, ProductRepository } from "@/features/products/products";
import { ProductDatasourceImpl, ProductRepositoryImpl } from "@/features/products/infrastructure/infrastructure";
import api from "@/config/http/axios";

export class ProductProvider {
    constructor(private repository: ProductRepository) { }

    createProduct(payload: ProductForm) {
        return this.repository.createProduct(payload);
    }

    getProducts(limit: string, page: string) {
        return this.repository.getProducts(limit, page);
    }

    getProductById(id: string) {
        return this.repository.getProductById(id);
    }

    updateProductById(id: string, payload: ProductForm) {
        return this.repository.updateProductById(id, payload);
    }

    deleteProductById(id: string) {
        return this.repository.deleteProductById(id);
    }
}

const datasource = new ProductDatasourceImpl(api);
const repository = new ProductRepositoryImpl(datasource);
export const productProvider = new ProductProvider(repository);
