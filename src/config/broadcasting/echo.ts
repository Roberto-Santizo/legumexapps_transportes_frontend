/**
 * El socket de la aplicación, al lado de `http/axios.ts` porque es lo mismo que
 * él: el canal por el que se habla con el backend. Lo usa el seguimiento en
 * vivo del viaje y de momento nada más.
 *
 * Tres cosas que no son evidentes y que este archivo resuelve una sola vez:
 *
 * - **La API no tiene sesión.** La autorización del canal privado viaja en
 *   `POST /api/broadcasting/auth` con la misma cabecera `Authorization: Bearer`
 *   que el resto de peticiones, y Echo no la pone solo: hay que dársela.
 * - **La cabecera se congela al construir Echo.** El JWT dura 60 minutos, así
 *   que si el token cambia hay que reconstruir la instancia o la reautorización
 *   del canal empezaría a fallar en silencio. Por eso se guarda con qué token
 *   se construyó y se compara en cada `getEcho()`.
 * - **Sin configuración no se rompe nada.** Si faltan las variables del `.env`
 *   se devuelve `null` y la pantalla avisa, igual que hace `LocationMapCanvas`
 *   cuando falta la clave de Google. El rastro se sigue leyendo por HTTP.
 */

import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

/** Echo busca el cliente de Pusher en el objeto global, no como parámetro. */
declare global {
    interface Window {
        Pusher: typeof Pusher;
    }
}

const APP_KEY = import.meta.env.VITE_REVERB_APP_KEY as string | undefined;
const HOST = import.meta.env.VITE_REVERB_HOST as string | undefined;
const SCHEME = (import.meta.env.VITE_REVERB_SCHEME as string | undefined) ?? 'https';
const RAW_PORT = import.meta.env.VITE_REVERB_PORT as string | undefined;

const FORCE_TLS = SCHEME === 'https';
const PORT = Number(RAW_PORT) || (FORCE_TLS ? 443 : 80);

/**
 * `VITE_BASE_URL` ya termina en `/api`, así que aquí **no** se vuelve a
 * anteponer: el endpoint real es `/api/broadcasting/auth`.
 */
const AUTH_ENDPOINT = `${(import.meta.env.VITE_BASE_URL as string | undefined) ?? ''}/broadcasting/auth`;

/**
 * Si es `false` no hay seguimiento en vivo posible y la UI tiene que decirlo:
 * es un `.env` incompleto, no un servidor caído, y se arreglan de forma
 * distinta.
 */
export const isBroadcastingConfigured = Boolean(APP_KEY && HOST);

export type BroadcastClient = Echo<'reverb'>;

let client: BroadcastClient | null = null;
/** El token con el que se construyó `client`, para detectar que se renovó. */
let clientToken: string | null = null;

/** Suelta el socket. Reconectar es volver a llamar a `getEcho()`. */
export const disconnectEcho = (): void => {
    if (!client) return;

    client.disconnect();
    client = null;
    clientToken = null;
};

/**
 * El estado del socket **sin forzar su creación**: se lee en cada render para
 * pintar el indicador de conexión, y abrir una conexión desde ahí sería un
 * efecto secundario en mitad del renderizado.
 *
 * Devuelve los estados de Pusher (`connected`, `connecting`, `unavailable`,
 * `failed`, `disconnected`) o `initialized` mientras nadie haya pedido todavía
 * la instancia.
 */
export const getBroadcastState = (): string => {
    if (!isBroadcastingConfigured) return 'unavailable';

    if (!localStorage.getItem('AUTH_TOKEN')) return 'unavailable';

    return client ? client.connector.pusher.connection.state : 'initialized';
};

/**
 * La instancia compartida, creada la primera vez que alguien la pide y
 * reconstruida cuando el token de sesión cambia.
 *
 * Devuelve `null` cuando no se puede conectar —falta configuración o no hay
 * sesión—: quien llama tiene que contar con ello y degradar, nunca asumir que
 * hay socket.
 */
export const getEcho = (): BroadcastClient | null => {
    if (!isBroadcastingConfigured) return null;

    const token = localStorage.getItem('AUTH_TOKEN');

    if (!token) return null;

    if (client && clientToken === token) return client;

    disconnectEcho();

    window.Pusher = Pusher;

    client = new Echo({
        broadcaster: 'reverb',
        key: APP_KEY,
        wsHost: HOST,
        wsPort: PORT,
        wssPort: PORT,
        forceTLS: FORCE_TLS,
        enabledTransports: ['ws', 'wss'],
        authEndpoint: AUTH_ENDPOINT,
        auth: {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
            },
        },
    });

    clientToken = token;

    return client;
};
