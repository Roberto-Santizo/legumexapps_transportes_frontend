import type { PaginatedProductsSchema, ProductSchema } from "@/features/products/products";
import type { z } from "zod";

export type PaginatedProducts = z.infer<typeof PaginatedProductsSchema>;
export type Product = z.infer<typeof ProductSchema>;

export type ProductForm = {
    name: string;
}
