import type { AssistantReportSchema, StoredAssistantMessageSchema } from "@/features/assistant/assistant";
import type { z } from "zod";

export type AssistantRole = 'user' | 'assistant';

/** El mensaje plano que espera `POST /assistant/chat`: sin `parts`, sin `id`. */
export type AssistantApiMessage = {
    role: AssistantRole;
    content: string;
};

export type AssistantRequestBody = {
    messages: AssistantApiMessage[];
};

export type AssistantReport = z.infer<typeof AssistantReportSchema>;
export type StoredAssistantMessage = z.infer<typeof StoredAssistantMessageSchema>;

/** Las trece herramientas que el modelo puede invocar; el nombre viaja en `toolName`. */
export type AssistantToolName =
    | 'trips_summary'
    | 'trips_in_route'
    | 'vehicle_expenses_summary'
    | 'fleet'
    | 'trips'
    | 'trip'
    | 'trip_fuels'
    | 'trip_expenses'
    | 'trip_timeouts'
    | 'vehicle'
    | 'vehicle_expenses'
    | 'export_trips'
    | 'export_vehicle_expenses';

/**
 * `output` de una herramienta ya interpretado. El SDK lo entrega como string
 * (JSON serializado, o texto plano cuando faltó un argumento).
 */
export type AssistantToolOutcome =
    | { kind: 'pending' }
    | { kind: 'ok'; data: unknown }
    | { kind: 'report'; report: AssistantReport }
    | { kind: 'error'; message: string };

/**
 * Cómo se debe reaccionar a un error de `useChat`:
 * - `unauthorized`: el JWT caducó a mitad de la conversación → reemitir y reintentar el turno.
 * - `forbidden`: rol sin permiso o `carrier` sin empresa → mostrar el mensaje y no insistir.
 * - `invalid`: 422, un bug del cliente (mensaje vacío, más de 50…).
 * - `stream`: falló el proveedor de IA dentro del stream, o la red → texto genérico y reintento manual.
 */
export type AssistantErrorInfo = {
    kind: 'unauthorized' | 'forbidden' | 'invalid' | 'stream';
    message: string;
};
