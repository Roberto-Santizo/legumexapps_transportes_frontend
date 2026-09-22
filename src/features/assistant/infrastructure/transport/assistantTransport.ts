/**
 * El «datasource» de este dominio. `POST /assistant/chat` no responde con el
 * sobre `{ statusCode, message, data }` sino con un stream Server-Sent Events
 * en el protocolo *UI Message Stream* del Vercel AI SDK, así que no pasa por
 * axios: lo consume `DefaultChatTransport`, que abre la conexión con `fetch`,
 * parsea los `data: {...}` y va construyendo el `UIMessage` del asistente.
 *
 * Lo que sí es nuestro: el token (mismo `AUTH_TOKEN` que inyecta axios) y el
 * cuerpo, que la API espera plano (`{ role, content }`) y no como `parts[]`.
 */

import { toAssistantRequestBody } from "@/features/assistant/assistant";
import { DefaultChatTransport, type UIMessage } from "ai";

const ASSISTANT_CHAT_URL = `${import.meta.env.VITE_BASE_URL}/assistant/chat`;

export const assistantTransport = new DefaultChatTransport<UIMessage>({
    api: ASSISTANT_CHAT_URL,
    headers: () => {
        const token = localStorage.getItem('AUTH_TOKEN');

        return {
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
    },
    prepareSendMessagesRequest: ({ messages, headers }) => ({
        body: toAssistantRequestBody(messages),
        headers,
    }),
});
