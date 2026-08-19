/**
 * Catálogos y conversiones del gasto de mantenimiento. Es el único punto donde
 * el importe deja de ser cadena, donde el cuerpo pasa a `snake_case` y donde un
 * error del backend se traduce a un texto para el usuario.
 *
 * Los dos errores caros de este dominio se evitan aquí: confundir `totalAmount`
 * —dinero— con `total` —conteo—, y tratar las fechas de la API como ISO 8601
 * cuando llegan ya formateadas en `d-m-Y`.
 *
 * Nada de esto se importa de `vehicles`: el detalle del vehículo depende de
 * este módulo, así que la dependencia inversa cerraría el círculo entre los dos.
 */

import type { Option } from "@/features/shared/shared";
import type { VehicleExpenseFilters, VehicleExpenseForm } from "@/features/vehicle-expenses/vehicle-expenses";
import { isAxiosError } from "axios";

/**
 * Las 22 categorías del enum del backend. La lista es cerrada y solo cambia con
 * un despliegue: no hay endpoint que la devuelva ni catálogo administrable, así
 * que las etiquetas en español viven aquí y son la única fuente del front.
 */
export const VEHICLE_EXPENSE_CATEGORIES: Option[] = [
    { value: "tires", label: "Llantas" },
    { value: "oil_change", label: "Cambio de aceite" },
    { value: "brakes", label: "Frenos" },
    { value: "spare_part", label: "Repuesto" },
    { value: "battery", label: "Batería" },
    { value: "suspension", label: "Suspensión" },
    { value: "engine", label: "Motor" },
    { value: "transmission", label: "Transmisión" },
    { value: "electrical_system", label: "Sistema eléctrico" },
    { value: "cooling_system", label: "Sistema de enfriamiento" },
    { value: "filters", label: "Filtros" },
    { value: "alignment_balancing", label: "Alineación y balanceo" },
    { value: "clutch", label: "Embrague" },
    { value: "exhaust", label: "Escape" },
    { value: "air_conditioning", label: "Aire acondicionado" },
    { value: "bodywork_paint", label: "Carrocería y pintura" },
    { value: "glass_mirrors", label: "Vidrios y espejos" },
    { value: "inspection", label: "Inspección" },
    { value: "washing", label: "Lavado" },
    { value: "towing", label: "Grúa" },
    { value: "labor", label: "Mano de obra" },
    { value: "other", label: "Otro" }
];

export const VEHICLE_EXPENSE_CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
    VEHICLE_EXPENSE_CATEGORIES.map((category) => [category.value, category.label])
);

/**
 * **Naturaleza**: si el gasto estaba planeado o si algo se rompió. Es un eje
 * independiente de la categoría —el backend no valida nada cruzado—: cambiar
 * llantas por desgaste programado es `tires` + `preventive`; por un reventón,
 * `tires` + `corrective`.
 */
export const VEHICLE_EXPENSE_NATURES: Option[] = [
    { value: "preventive", label: "Preventivo" },
    { value: "corrective", label: "Correctivo" }
];

export const VEHICLE_EXPENSE_NATURE_LABELS: Record<string, string> = Object.fromEntries(
    VEHICLE_EXPENSE_NATURES.map((nature) => [nature.value, nature.label])
);

/** Límites que valida el backend. Se replican para no gastar un 422. */
export const VEHICLE_EXPENSE_AMOUNT_MIN = 0.01;
export const VEHICLE_EXPENSE_AMOUNT_MAX = 99999999.99;
export const VEHICLE_EXPENSE_DESCRIPTION_MAX_LENGTH = 1000;

/** El paginador acota el límite a [10, 100]: pedir menos de 10 no cambia nada. */
export const VEHICLE_EXPENSE_PAGE_SIZE = '10';

/** Literal del backend cuando un `carrier` todavía no ha registrado su empresa. */
export const CARRIER_MISSING_MESSAGE = "No perteneces a ninguna empresa transportista";

/**
 * Los cinco endpoints le responden 403 a un `pilot`, así que a él no se le
 * pinta el panel: no es que no pueda escribir, es que no puede ni leer.
 */
export const canReadVehicleExpenses = (role?: string): boolean =>
    role === 'administrator' || role === 'carrier' || role === 'manager';

/**
 * El `manager` lee cualquier empresa pero no escribe nada: alta, edición y
 * borrado le responden 403. Se le esconden los botones en lugar de dejarle
 * capturar el gasto entero para perderlo al enviarlo.
 */
export const canWriteVehicleExpenses = (role?: string): boolean =>
    role === 'administrator' || role === 'carrier';

/** Cadena de la API → número. Un importe ilegible se trata como 0, nunca como NaN. */
export const toExpenseAmount = (value: string | null): number => {
    const amount = Number(value);

    return Number.isFinite(amount) ? amount : 0;
};

/**
 * Solo para mostrar. La API no manda símbolo de moneda: el quetzal lo pone el
 * front porque GTQ es convención del dominio y no viaja en la respuesta.
 */
export const formatExpenseQuetzales = (value: string | null): string =>
    `Q${toExpenseAmount(value).toLocaleString('es-GT', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;

/** Hoy en `Y-m-d`, para topar el date picker: el backend rechaza el futuro con 422. */
export const todayAsInputValue = (): string => {
    const today = new Date();
    const month = `${today.getMonth() + 1}`.padStart(2, '0');
    const day = `${today.getDate()}`.padStart(2, '0');

    return `${today.getFullYear()}-${month}-${day}`;
};

/**
 * `d-m-Y` de la API → `Y-m-d` del input. La conversión es textual a propósito:
 * pasar la fecha por `new Date(...)` la leería al revés la mitad de los días
 * del mes, cuando no devuelve directamente `Invalid Date`.
 */
export const toExpenseDateInputValue = (expenseDate: string): string => {
    const [day, month, year] = expenseDate.split('-');

    if (!day || !month || !year) return '';

    return `${year}-${month}-${day}`;
};

/**
 * El cuerpo va en `snake_case` aunque la respuesta salga en `camelCase`: no es
 * simétrico y no hay conversión automática.
 *
 * `vehicle_id` solo viaja en el alta —en la edición el backend lo ignora— y
 * `registered_by` no se manda nunca: sale del usuario autenticado.
 */
export const buildVehicleExpensePayload = (payload: VehicleExpenseForm, vehicleId?: string) => ({
    ...(vehicleId ? { vehicle_id: Number(vehicleId) } : {}),
    category: payload.category,
    nature: payload.nature,
    amount: payload.amount,
    expense_date: payload.expenseDate,
    description: payload.description
});

/**
 * Los filtros vacíos no se mandan: el backend los ignora y ensucian la URL.
 * `vehicleId` sí viaja siempre —es el único filtro obligatorio de la API—.
 *
 * La página entra contada desde 0, como la cuenta el resto del front, y sale
 * contada desde 1, como la cuenta el paginador de Laravel: sin la suma, la
 * primera y la segunda página devolverían las mismas filas.
 */
export const buildVehicleExpenseQuery = (
    vehicleId: string,
    limit: string,
    page: string,
    filters?: VehicleExpenseFilters
): string => {
    const query = new URLSearchParams({
        vehicleId,
        limit,
        page: ((Number(page) || 0) + 1).toString()
    });

    if (filters?.category) query.set('category', filters.category);
    if (filters?.nature) query.set('nature', filters.nature);
    if (filters?.dateFrom) query.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo) query.set('dateTo', filters.dateTo);

    return query.toString();
};

/**
 * El backend responde con dos formas distintas: el sobre `{ statusCode,
 * message, data }` para 401/403/404 y el formato de Laravel `{ message, errors }`
 * para el 422. En el 422 el `message` trae la coletilla «(and 2 more errors)»,
 * así que se prefieren los mensajes de `errors`, que ya vienen redactados en
 * español y nombran el campo que falla.
 */
export const getVehicleExpenseErrorMessage = (error: unknown): string => {
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
