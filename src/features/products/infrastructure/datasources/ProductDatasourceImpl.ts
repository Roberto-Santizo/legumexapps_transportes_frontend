import type { PaginatedProducts, Product, ProductForm } from "@/features/products/products";
import { PaginatedProductsSchema, ProductDatasource, ProductSchema } from "@/features/products/products";
import { ApiResponseSchema } from "@/features/shared/shared";
import { isAxiosError, type AxiosInstance } from "axios";

export class ProductDatasourceImpl extends ProductDatasource {
    constructor(private api: AxiosInstance, private url = '/products') {
        super();
    }

    async createProduct(payload: ProductForm): Promise<string> {
        try {
            const { data } = await this.api.post(this.url, payload);
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(error.response?.data.message, { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    async getProducts(limit: string, page: string): Promise<PaginatedProducts> {
        try {
            const { data } = await this.api.get(`${this.url}?limit=${limit}&page=${page}`);
            const response = PaginatedProductsSchema.safeParse(data);

            if (response.success) {
                return response.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(error.response?.data.message, { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    async getProductById(id: string): Promise<Product> {
        try {
            const { data } = await this.api.get(`${this.url}/${id}`);
            const response = ProductSchema.safeParse(data['data']);

            if (response.success) {
                return response.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(error.response?.data.message, { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    async updateProductById(id: string, payload: ProductForm): Promise<string> {
        try {
            const { data } = await this.api.put(`${this.url}/${id}`, payload);
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(error.response?.data.message, { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    async deleteProductById(id: string): Promise<string> {
        try {
            const { data } = await this.api.delete(`${this.url}/${id}`);
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(error.response?.data.message, { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }
}
