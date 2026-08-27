import type { ClientSchema, PaginatedClientsSchema } from "@/features/clients/clients";
import type { z } from "zod";

export type PaginatedClients = z.infer<typeof PaginatedClientsSchema>;
export type Client = z.infer<typeof ClientSchema>;

/**
 * Los dos únicos campos que acepta la API: cualquier otra clave se descarta en
 * silencio. En el alta los dos son obligatorios; en la edición son opcionales
 * por separado y un cuerpo vacío es un no-op válido con 200.
 */
export type ClientForm = {
    /** Sin ningún espacio: la API lo rechaza con 422, no lo corrige. */
    code: string;
    /** El backend sí colapsa sus espacios internos, en silencio. */
    name: string;
}

/** Los dos campos del formulario a los que se puede anclar un error del backend. */
export type ClientField = keyof ClientForm;

/** El backend ignora en silencio un filtro mal escrito: nunca da 422. */
export type ClientFilters = {
    /** Coincidencia parcial sobre el código **y** el nombre a la vez. En blanco se ignora. */
    search?: string;
}
