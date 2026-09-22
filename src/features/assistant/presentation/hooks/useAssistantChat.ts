import {
    assistantStorageKey,
    assistantTransport,
    describeAssistantError,
    normalizeQuestion,
    readStoredMessages,
    writeStoredMessages,
    type AssistantErrorInfo,
} from "@/features/assistant/assistant";
import { authProvider, login, logout } from "@/features/auth/auth";
import type { AppDispatch } from "@/config/config";
import { Chat, useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";

/**
 * Cose `useChat` con lo que este dominio necesita alrededor: la conversación
 * persiste en `sessionStorage` por usuario (la API no la guarda), un 401 a
 * mitad de la conversación reemite la sesión con `check-status` y reenvía
 * **el mismo turno** una sola vez, y el resto de errores se clasifican para
 * que la pantalla los pinte en español con reintento manual.
 *
 * No hay cola de turnos en el servidor: `busy` bloquea el envío mientras un
 * turno está en vuelo (hasta 90 s) o mientras se recupera la sesión.
 */
export function useAssistantChat(userId: number) {
    const dispatch = useDispatch<AppDispatch>();
    const storageKey = assistantStorageKey(userId);

    /** Una sola instancia por usuario: `useChat` la recrearía en cada render si se le pasaran opciones sueltas. */
    const [chat] = useState(() => new Chat<UIMessage>({
        id: `assistant-${userId}`,
        messages: readStoredMessages(storageKey),
        transport: assistantTransport,
    }));

    const { messages, status, error, sendMessage, regenerate, stop, setMessages, clearError } = useChat({ chat });

    const [recovering, setRecovering] = useState(false);
    const streaming = status === 'submitted' || status === 'streaming';
    const busy = streaming || recovering;

    /** Se guarda solo entre turnos: durante el stream cambiaría con cada token. */
    useEffect(() => {
        if (streaming) return;

        writeStoredMessages(storageKey, messages);
    }, [messages, streaming, storageKey]);

    /**
     * Un 401 con el sobre JSON significa que el JWT caducó entre turnos. Se
     * reemite con `check-status` (que devuelve token nuevo) y se reenvía la
     * misma lista de mensajes. Solo una vez por pregunta: si vuelve a fallar
     * es un problema de sesión y el usuario verá el error con su reintento.
     */
    const recoveredForRef = useRef<string | null>(null);

    useEffect(() => {
        if (status !== 'error' || !error) return;
        if (describeAssistantError(error).kind !== 'unauthorized') return;

        const lastUser = messages.findLast((message) => message.role === 'user');

        if (!lastUser || recoveredForRef.current === lastUser.id) return;

        recoveredForRef.current = lastUser.id;

        setRecovering(true);

        authProvider.checkStatus()
            .then((session) => {
                dispatch(login(session));

                return regenerate();
            })
            .catch(() => dispatch(logout()))
            .finally(() => setRecovering(false));
    }, [status, error, messages, dispatch, regenerate]);

    const errorInfo: AssistantErrorInfo | null = status === 'error' && error && !recovering
        ? describeAssistantError(error)
        : null;

    /** Devuelve `false` si la pregunta no se pudo enviar (vacía, demasiado larga o un turno en vuelo). */
    const ask = (value: string): boolean => {
        const question = normalizeQuestion(value);

        if (!question || busy) return false;

        void sendMessage({ text: question });

        return true;
    };

    /** Reenvía la última pregunta; si el asistente dejó texto parcial, se descarta y se pide de nuevo. */
    const retry = () => {
        if (busy) return;

        void regenerate();
    };

    /** Vacía la conversación en memoria y en `sessionStorage`; corta el turno en vuelo si lo hay. */
    const reset = () => {
        if (streaming) void stop();

        clearError();
        setMessages([]);
        recoveredForRef.current = null;
    };

    return {
        messages,
        status,
        busy,
        recovering,
        errorInfo,
        ask,
        retry,
        stop,
        reset,
    };
}
