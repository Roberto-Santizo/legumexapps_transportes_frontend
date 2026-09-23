/**
 * Único punto del front donde la conversación de `useChat` se traduce al
 * cuerpo plano que espera la API, donde el `output` de cada herramienta
 * (un string) vuelve a ser dato, donde los errores del SDK se clasifican y
 * donde la conversación se guarda y se recupera de `sessionStorage`.
 *
 * Las trampas de este dominio: la API **no guarda nada** (la memoria es del
 * cliente), un mensaje vacío o un rol `system` es 422, el historial tope es
 * 50 y un fallo del proveedor de IA llega **dentro** del stream con un
 * `errorText` en inglés que no se debe mostrar.
 */

import {
    AssistantEnvelopeSchema,
    AssistantReportSchema,
    AssistantToolErrorSchema,
    AssistantValidationErrorSchema,
    StoredAssistantMessagesSchema,
    type AssistantApiMessage,
    type AssistantErrorInfo,
    type AssistantReport,
    type AssistantRequestBody,
    type AssistantToolName,
    type AssistantToolOutcome,
} from "@/features/assistant/assistant";
import { can } from "@/features/shared/shared";
import type { UIMessage } from "ai";

/**
 * Mismos permisos que el tablero: `administrator`, `manager`, `export` y
 * `carrier` con empresa (sin ella, `carrier.required` responde 403).
 */
export const canUseAssistant = (role?: string, carrierId?: number | null): boolean => {
    if (!can(role, 'assistant')) return false;

    return role !== 'carrier' || typeof carrierId === 'number';
};

/** A dónde va un rol sin asistente: la única pantalla que comparten los siete. */
export const ASSISTANT_FALLBACK_ROUTE = '/viajes';

/** `messages` admite entre 1 y 50 elementos; se recorta por el principio conservando la pregunta. */
export const ASSISTANT_MAX_MESSAGES = 50;

/** El último mensaje (la pregunta) no puede superar 4 000 caracteres tras `trim`. */
export const ASSISTANT_MAX_QUESTION_LENGTH = 4000;

/**
 * El historial no se filtra en el servidor pero sí se valida: ≤ 10 000
 * caracteres por mensaje. Un turno del asistente muy largo se recorta aquí
 * para no tumbar toda la conversación con un 422.
 */
const ASSISTANT_MAX_HISTORY_LENGTH = 10_000;

/**
 * Aplana un `UIMessage` a `{ role, content }`. Devuelve `null` cuando no debe
 * viajar: un rol distinto de `user`/`assistant` sería 422, y un `content`
 * vacío (un turno anterior que terminó en `error` sin texto) también.
 */
export const toAssistantApiMessage = (message: UIMessage): AssistantApiMessage | null => {
    if (message.role !== 'user' && message.role !== 'assistant') return null;

    const content = message.parts
        .filter((part): part is Extract<typeof part, { type: 'text' }> => part.type === 'text')
        .map((part) => part.text)
        .join('')
        .trim()
        .slice(0, ASSISTANT_MAX_HISTORY_LENGTH);

    return content ? { role: message.role, content } : null;
};

/** El cuerpo completo: mensajes planos, sin vacíos y con el tope de 50 aplicado desde el principio. */
export const toAssistantRequestBody = (messages: UIMessage[]): AssistantRequestBody => {
    const flat = messages.map(toAssistantApiMessage).filter((message) => message !== null);

    return { messages: flat.slice(-ASSISTANT_MAX_MESSAGES) };
};

/** La pregunta lista para enviar, o `null` si tras el `trim` no queda nada o se pasa del tope. */
export const normalizeQuestion = (value: string): string | null => {
    const question = value.trim();

    if (!question || question.length > ASSISTANT_MAX_QUESTION_LENGTH) return null;

    return question;
};

/**
 * Qué se le dice al usuario mientras cada herramienta trabaja y qué queda en
 * la bitácora del turno cuando termina. Un nombre desconocido (una versión
 * nueva del backend) se pinta tal cual llegó.
 */
const TOOL_LABELS: Record<AssistantToolName, { pending: string; done: string }> = {
    trips_summary: { pending: "Consultando el resumen de viajes", done: "Resumen de viajes" },
    trips_in_route: { pending: "Consultando los viajes en ruta", done: "Viajes en ruta" },
    vehicle_expenses_summary: { pending: "Consultando el resumen de gastos", done: "Resumen de gastos de vehículos" },
    fleet: { pending: "Consultando la flota", done: "Flota" },
    trips: { pending: "Buscando viajes", done: "Listado de viajes" },
    trip: { pending: "Consultando el viaje", done: "Detalle del viaje" },
    trip_fuels: { pending: "Consultando los combustibles del viaje", done: "Combustibles del viaje" },
    trip_expenses: { pending: "Consultando los gastos del viaje", done: "Gastos del viaje" },
    trip_timeouts: { pending: "Consultando los tiempos muertos", done: "Tiempos muertos del viaje" },
    vehicle: { pending: "Buscando el vehículo", done: "Vehículo" },
    vehicle_expenses: { pending: "Consultando los gastos del vehículo", done: "Gastos del vehículo" },
    export_trips: { pending: "Generando el reporte de viajes", done: "Reporte de viajes" },
    export_vehicle_expenses: { pending: "Generando el reporte de gastos", done: "Reporte de gastos de vehículo" },
};

export const isAssistantToolName = (value: string): value is AssistantToolName => value in TOOL_LABELS;

export const isExportTool = (toolName: string): boolean =>
    toolName === 'export_trips' || toolName === 'export_vehicle_expenses';

export const getToolLabel = (toolName: string, pending: boolean): string => {
    if (!isAssistantToolName(toolName)) return pending ? `Ejecutando ${toolName}` : toolName;

    return pending ? TOOL_LABELS[toolName].pending : TOOL_LABELS[toolName].done;
};

/** Cómo se lee cada argumento en la bitácora. Los que no están aquí se muestran con su clave. */
const INPUT_LABELS: Record<string, string> = {
    dateFrom: "desde",
    dateTo: "hasta",
    carrierId: "empresa",
    tripId: "viaje",
    vehicleId: "vehículo",
    plate: "placa",
    status: "estado",
    condition: "condición",
    inRoute: "en ruta",
    clientId: "cliente",
    shippingLineId: "naviera",
    locationId: "destino",
    pilotId: "piloto",
    search: "búsqueda",
    category: "categoría",
    nature: "naturaleza",
    isInvoiced: "facturado",
    limit: "límite",
};

/**
 * «desde 2026-09-01 · hasta 2026-09-30 · viaje 12»: los argumentos con los
 * que el modelo llamó a la herramienta, para que el usuario vea qué filtró.
 */
export const describeToolInput = (input: unknown): string => {
    if (!input || typeof input !== 'object') return "";

    return Object.entries(input as Record<string, unknown>)
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .map(([key, value]) => {
            const label = INPUT_LABELS[key] ?? key;

            if (typeof value === 'boolean') return `${label}: ${value ? "sí" : "no"}`;

            return `${label} ${String(value)}`;
        })
        .join(" · ");
};

/** `AssistantReport` o `null` si el objeto no tiene esa forma. */
export const parseAssistantReport = (value: unknown): AssistantReport | null => {
    const parsed = AssistantReportSchema.safeParse(value);

    return parsed.success ? parsed.data : null;
};

/**
 * `output` viene como **string**: un JSON serializado en el caso normal,
 * `{"error": "…"}` cuando el dominio rechazó la consulta y texto plano
 * cuando faltó un argumento (el modelo reintenta solo). Un JSON con la forma
 * de un reporte se distingue para pintarle su botón de descarga.
 */
export const parseToolOutput = (output: unknown): AssistantToolOutcome => {
    if (output === undefined || output === null) return { kind: 'pending' };

    let data: unknown = output;

    if (typeof output === 'string') {
        try {
            data = JSON.parse(output);
        } catch {
            return { kind: 'error', message: output };
        }
    }

    const toolError = AssistantToolErrorSchema.safeParse(data);

    if (toolError.success) return { kind: 'error', message: toolError.data.error };

    const report = parseAssistantReport(data);

    if (report) return { kind: 'report', report };

    return { kind: 'ok', data };
};

const GENERIC_STREAM_ERROR = "El asistente no pudo responder. Inténtalo de nuevo.";

/**
 * `DefaultChatTransport` lanza un `Error` cuyo `message` es el **cuerpo como
 * texto** cuando la respuesta no es 2xx: el sobre del 401/403 o el
 * `{ message, errors }` del 422. Todo lo demás (un part `error` dentro del
 * stream, la red caída) llega con un mensaje del proveedor o del navegador
 * que no se muestra: es inglés y puede exponer detalles.
 */
export const describeAssistantError = (error: unknown): AssistantErrorInfo => {
    if (!(error instanceof Error)) return { kind: 'stream', message: GENERIC_STREAM_ERROR };

    let body: unknown;

    try {
        body = JSON.parse(error.message);
    } catch {
        return { kind: 'stream', message: GENERIC_STREAM_ERROR };
    }

    const envelope = AssistantEnvelopeSchema.safeParse(body);

    if (envelope.success) {
        if (envelope.data.statusCode === 401) return { kind: 'unauthorized', message: envelope.data.message };
        if (envelope.data.statusCode === 403) return { kind: 'forbidden', message: envelope.data.message };

        return { kind: 'stream', message: envelope.data.message || GENERIC_STREAM_ERROR };
    }

    const validation = AssistantValidationErrorSchema.safeParse(body);

    if (validation.success) {
        const messages = Object.values(validation.data.errors).flat();

        return { kind: 'invalid', message: messages.join(' · ') || validation.data.message };
    }

    return { kind: 'stream', message: GENERIC_STREAM_ERROR };
};

/**
 * La API no guarda la conversación: se conserva en `sessionStorage` (muere con
 * la pestaña) y por usuario, para que dos sesiones en la misma pestaña no se
 * lean el historial.
 */
export const assistantStorageKey = (userId: number): string => `ASSISTANT_CHAT_${userId}`;

export const readStoredMessages = (key: string): UIMessage[] => {
    try {
        const raw = sessionStorage.getItem(key);

        if (!raw) return [];

        const parsed = StoredAssistantMessagesSchema.safeParse(JSON.parse(raw));

        return parsed.success ? (parsed.data as UIMessage[]) : [];
    } catch {
        return [];
    }
};

export const writeStoredMessages = (key: string, messages: UIMessage[]): void => {
    try {
        if (messages.length === 0) {
            sessionStorage.removeItem(key);
            return;
        }

        sessionStorage.setItem(key, JSON.stringify(messages));
    } catch {
        // Cuota llena o almacenamiento bloqueado: la conversación sigue viva en memoria.
    }
};

/**
 * El bucket sirve el archivo como `{uuid}.xlsx` y sin `Content-Disposition`;
 * para que el navegador lo guarde con el nombre bonito se descarga por
 * `fetch` → `Blob` → `<a download>`. Si el bucket no deja leerlo desde el
 * navegador (CORS), se abre la URL y el usuario lo guarda a mano.
 */
export const downloadAssistantReport = async (report: AssistantReport): Promise<void> => {
    try {
        const response = await fetch(report.url);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement('a');

        anchor.href = objectUrl;
        anchor.download = report.fileName;
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(objectUrl);
    } catch {
        window.open(report.url, '_blank', 'noopener');
    }
};

const integerFormatter = new Intl.NumberFormat('es-GT', { maximumFractionDigits: 0 });
const moneyFormatter = new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ', minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** `"15300.50"` (el `totalAmount` del reporte de gastos) → `Q15,300.50`; si no es numérico se pinta tal cual. */
export const formatAssistantMoney = (value: string): string => {
    const amount = Number(value);

    return Number.isFinite(amount) ? moneyFormatter.format(amount) : value;
};

/** «2 filas», «5,000 de 7,312 filas» cuando el archivo se recortó. */
export const describeReportRows = (report: AssistantReport): string => {
    const rows = integerFormatter.format(report.rows);

    if (report.truncated) return `${rows} de ${integerFormatter.format(report.total)} filas`;

    return `${rows} ${report.rows === 1 ? "fila" : "filas"}`;
};

/** Las preguntas de arranque cuando la conversación está vacía. */
export const ASSISTANT_STARTERS: { title: string; question: string }[] = [
    { title: "Viajes en ruta", question: "¿Cuántos viajes hay en ruta ahora mismo y de qué empresas?" },
    { title: "Resumen del mes", question: "Dame un resumen de los viajes de este mes: cuántos hay, en qué estado están y cuántos siguen sin asignar." },
    { title: "Gastos de la flota", question: "¿Cuánto se ha gastado en mantenimiento de vehículos este mes y en qué categorías?" },
    { title: "Reporte en Excel", question: "Genérame un reporte en Excel de los viajes terminados de este mes." },
];
