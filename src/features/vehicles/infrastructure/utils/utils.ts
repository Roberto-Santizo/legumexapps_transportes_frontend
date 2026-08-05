import type { VehicleForm } from "@/features/vehicles/vehicles";
import type { Option } from "@/features/shared/shared";

/**
 * Catálogo de tipos de unidad. Es la única fuente: alimenta el select del
 * formulario y las etiquetas de las tablas. Los valores replican el enum
 * `VehicleType` del backend (truck, van, trailer, pickup).
 */
export const VEHICLE_TYPES: Option[] = [
    { value: "truck", label: "Camión" },
    { value: "van", label: "Panel" },
    { value: "trailer", label: "Rastra" },
    { value: "pickup", label: "Pickup" },
];

/**
 * Estados de la unidad. Replican el enum `VehicleStatus` del backend
 * (active, inactive, under_repair). Solo se ofrecen en edición: al crear,
 * el vehículo siempre nace como `active`.
 */
export const VEHICLE_STATUSES: Option[] = [
    { value: "active", label: "Activo" },
    { value: "inactive", label: "Inactivo" },
    { value: "under_repair", label: "En taller" },
];

/**
 * El vehículo viaja como multipart porque `image` es un archivo.
 * En edición la imagen es opcional: si no se seleccionó una nueva, no se envía
 * y el backend conserva la que ya tenía.
 */
export const buildVehicleFormData = (payload: VehicleForm): FormData => {
    const formData = new FormData();

    formData.append('plate', payload.plate);
    formData.append('brand', payload.brand);
    formData.append('model', payload.model);
    formData.append('year', payload.year.toString());
    formData.append('capacity', payload.capacity.toString());
    formData.append('type', payload.type);

    if (payload.status) {
        formData.append('status', payload.status);
    }

    if (payload.image instanceof File) {
        formData.append('image', payload.image);
    }

    return formData;
}
