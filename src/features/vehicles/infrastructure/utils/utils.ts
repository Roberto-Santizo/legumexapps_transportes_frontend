/**
 * Único punto del front donde los importes de la unidad dejan de ser cadena,
 * donde se arma el multipart y donde se traduce un error del backend a un
 * texto para el usuario.
 *
 * Los dos errores caros de este dominio se evitan aquí: confundir `condition`
 * con `status` —son ejes distintos y ninguno reemplaza al otro— y dejar que el
 * kilometraje viaje cuando quien edita no puede moverlo.
 */

import type { Option } from "@/features/shared/shared";
import type { VehicleFilters, VehicleForm } from "@/features/vehicles/vehicles";
import { isAxiosError } from "axios";

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

export const VEHICLE_TYPE_LABELS: Record<string, string> = Object.fromEntries(
    VEHICLE_TYPES.map((type) => [type.value, type.label])
);

/**
 * Estado **operativo** de la unidad. Replica el enum `VehicleStatus` del
 * backend (active, inactive, under_repair): gobierna la baja lógica y la
 * unicidad de la placa. Solo se ofrece en edición: al crear, el vehículo
 * siempre nace como `active`.
 */
export const VEHICLE_STATUSES: Option[] = [
    { value: "active", label: "Activo" },
    { value: "inactive", label: "Inactivo" },
    { value: "under_repair", label: "En taller" },
];

export const VEHICLE_STATUS_LABELS: Record<string, string> = Object.fromEntries(
    VEHICLE_STATUSES.map((status) => [status.value, status.label])
);

/**
 * **Condición**, no estado: cómo se adquirió la unidad. No gobierna nada, no
 * influye en el `status` y el backend no valida nada cruzado contra ella —un
 * vehículo `new` con 90 000 km es perfectamente válido.
 *
 * En español los dos ejes se leen como «estado», así que en la UI van siempre
 * rotulados distinto: «Estado» para `status` y «Condición» para esto.
 */
export const VEHICLE_CONDITIONS: Option[] = [
    { value: "new", label: "Nuevo" },
    { value: "used", label: "Usado" },
];

export const VEHICLE_CONDITION_LABELS: Record<string, string> = Object.fromEntries(
    VEHICLE_CONDITIONS.map((condition) => [condition.value, condition.label])
);

/** Límites que valida el backend. Se replican para no gastar un 422. */
export const VEHICLE_YEAR_MIN = 1900;
export const VEHICLE_PLATE_MAX_LENGTH = 15;
export const VEHICLE_ENGINE_NUMBER_MAX_LENGTH = 50;
/** Los tres decimales nuevos van `min:0.01`: un cero es captura errónea, no un dato. */
export const VEHICLE_DECIMAL_MIN = 0.01;

/** Literal del backend cuando un `carrier` intenta mover el kilometraje. */
export const MILEAGE_ADMIN_ONLY_MESSAGE = "Solo un administrador puede modificar el kilometraje del vehículo";

/** Un usuario sin empresa vinculada recibe este 403 en los cinco endpoints. */
export const CARRIER_REQUIRED_MESSAGE = "Debes estar vinculado a un transportista para acceder a este recurso";

/**
 * El alta es `role:carrier` a secas: un `administrator` recibe 403 aunque sí
 * pueda listar, ver, editar y desactivar.
 */
export const canCreateVehicle = (role?: string): boolean => role === 'carrier';

/**
 * La única autorización por campo del proyecto: vive dentro del service del
 * backend, no en una ruta. Un `carrier` alcanza el PATCH, pero mover el
 * kilometraje aborta la petición entera con 403 —ni la marca ni la imagen se
 * guardan—, así que el input se le bloquea y el campo ni siquiera se envía.
 */
export const canEditMileage = (role?: string): boolean => role === 'administrator';

/** Solo un `administrator` puede acotar el listado por empresa; al `carrier` se le ignora. */
export const canFilterByCarrier = (role?: string): boolean => role === 'administrator';

/** Cadena de la API → número. Un importe ilegible se trata como 0, nunca como NaN. */
export const toAmount = (value: string | null): number => {
    const amount = Number(value);

    return Number.isFinite(amount) ? amount : 0;
};

/**
 * Solo para mostrar. La API no manda ni símbolo ni periodicidad: el quetzal lo
 * pone el front porque es convención del dominio.
 */
export const formatQuetzales = (value: string | null): string =>
    `Q${toAmount(value).toLocaleString('es-GT', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;

/** La capacidad viaja en libras, aunque nada en el backend valide que no sean kilos. */
export const formatCapacity = (value: string | null): string =>
    toAmount(value).toLocaleString('es-GT', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });

/** Rendimiento en kilómetros por galón. Es un dato de ficha: no alimenta ninguna cotización. */
export const formatKilometersPerGallon = (value: string | null): string =>
    toAmount(value).toLocaleString('es-GT', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

/** El odómetro es entero, en kilómetros: nunca lleva decimales. */
export const formatMileage = (value: number): string =>
    Math.trunc(value).toLocaleString('es-GT');

/**
 * `engineNumber: null` es la **única** marca fiable de ficha heredada de antes
 * de la migración: la API nunca produce ese estado. Los importes en `"1.00"`
 * también son relleno, pero nada los distingue de un dato real.
 */
export const isLegacyVehicle = (engineNumber: string | null): boolean => engineNumber === null;

/**
 * El vehículo viaja como multipart porque `image` es un archivo.
 *
 * En edición el cuerpo es parcial: omitir un campo no lo toca, pero enviarlo
 * vacío es 422. Por eso solo se añade lo que tiene valor —la imagen si se
 * eligió una nueva, el estado solo en edición y el kilometraje solo cuando
 * quien edita puede moverlo—. Las claves van en `snake_case`, al revés que la
 * respuesta, que llega en `camelCase`.
 */
export const buildVehicleFormData = (payload: VehicleForm): FormData => {
    const formData = new FormData();

    formData.append('plate', payload.plate);
    formData.append('brand', payload.brand);
    formData.append('model', payload.model);
    formData.append('year', payload.year.toString());
    formData.append('capacity', payload.capacity.toString());
    formData.append('type', payload.type);
    formData.append('condition', payload.condition);
    formData.append('kilometers_per_gallon', payload.kilometersPerGallon.toString());
    formData.append('purchase_price', payload.purchasePrice.toString());
    formData.append('monthly_insurance_cost', payload.monthlyInsuranceCost.toString());
    formData.append('engine_number', payload.engineNumber);

    /** `undefined` = no se envía, y el backend conserva el kilometraje guardado. */
    if (payload.mileage !== undefined) {
        formData.append('mileage', Math.trunc(payload.mileage).toString());
    }

    if (payload.status) {
        formData.append('status', payload.status);
    }

    if (payload.image instanceof File) {
        formData.append('image', payload.image);
    }

    return formData;
}

/** Los filtros vacíos no se mandan: el backend los ignora y ensucian la URL. */
export const buildVehicleQuery = (limit: string, page: string, filters?: VehicleFilters): string => {
    const query = new URLSearchParams({ limit, page });

    if (filters?.status) query.set('status', filters.status);
    if (filters?.carrierId) query.set('carrierId', filters.carrierId);
    if (filters?.condition) query.set('condition', filters.condition);
    if (filters?.engineNumber) query.set('engineNumber', filters.engineNumber);

    return query.toString();
}

/**
 * El backend responde con dos formas distintas: el sobre `{ statusCode,
 * message, data }` para 400/401/403/404 y el formato de Laravel
 * `{ message, errors }` para el 422. En el 422 el `message` trae la coletilla
 * «(and 5 more errors)», así que se prefieren los mensajes de `errors`, que ya
 * vienen redactados en español y nombran el campo que falla.
 */
export const getVehicleErrorMessage = (error: unknown): string => {
    if (!isAxiosError(error)) return "Error no controlado.";

    const data = error.response?.data;

    if (data && typeof data === 'object') {
        const { errors, message } = data as { errors?: unknown; message?: unknown };

        if (errors && typeof errors === 'object') {
            const messages = Object.values(errors as Record<string, unknown>)
                .flatMap((entry) => Array.isArray(entry) ? entry : [entry])
                .filter((entry): entry is string => typeof entry === 'string');

            if (messages.length > 0) return messages.join(' · ');
        }

        if (typeof message === 'string') return message;
    }

    return "Error no controlado.";
};
