import type { CarrierForm } from "@/features/carriers/carriers";

/**
 * El transportista viaja como multipart porque `image` es un archivo.
 * En edición la imagen es opcional: si no se seleccionó una nueva, no se envía
 * y el backend conserva la que ya tenía.
 */
export const buildCarrierFormData = (payload: CarrierForm): FormData => {
    const formData = new FormData();

    formData.append('name', payload.name);

    if (payload.image instanceof File) {
        formData.append('image', payload.image);
    }

    return formData;
}
