import { z } from "zod";

/**
 * Lo que devuelven `export_trips` y `export_vehicle_expenses` dentro del part
 * `tool-output-available`. `totalAmount` solo viene en el segundo.
 */
export const AssistantReportSchema = z.object({
    fileName: z.string(),
    url: z.url(),
    rows: z.number(),
    total: z.number(),
    truncated: z.boolean(),
    totalAmount: z.string().optional(),
});

/** Una herramienta que no pudo trabajar responde `{"error": "…"}` con el mensaje literal del dominio. */
export const AssistantToolErrorSchema = z.object({
    error: z.string(),
});

/**
 * Sobre JSON con el que la API rechaza la petición **antes** de abrir el
 * stream (401, 403, 500). El 422 llega con el formato de Laravel, sin
 * `statusCode`; se contempla aparte.
 */
export const AssistantEnvelopeSchema = z.object({
    statusCode: z.number(),
    message: z.string(),
});

export const AssistantValidationErrorSchema = z.object({
    message: z.string(),
    errors: z.record(z.string(), z.array(z.string())),
});

/**
 * Forma mínima de un `UIMessage` guardado en `sessionStorage`. Los parts se
 * validan solo por su `type`: el resto lo interpreta el SDK al pintarlos.
 */
export const StoredAssistantMessageSchema = z.object({
    id: z.string(),
    role: z.enum(['user', 'assistant']),
    parts: z.array(z.looseObject({ type: z.string() })),
});

export const StoredAssistantMessagesSchema = z.array(StoredAssistantMessageSchema);
