/**
 * El rastro de un viaje, cosido a partir de sus dos mitades: lo que ya ocurrió
 * —que llega por HTTP— y lo que va ocurriendo —que llega por el canal privado
 * `trips.{tripId}`—.
 *
 * El orden importa y es al revés de lo que parece: **primero se escucha el
 * canal y después se pide el acumulado**. Reverb no reenvía lo que uno se
 * perdió, así que suscribirse al final dejaría fuera todo punto reportado entre
 * la respuesta del `GET` y la suscripción. Hacerlo así deja el problema
 * contrario, que sí tiene arreglo: el punto de la costura llega dos veces y se
 * descarta por su clave.
 *
 * Las dos listas se guardan **separadas** —lo que trajo el `GET` lo administra
 * TanStack Query, lo que llega por el socket vive aquí— y se funden al leer.
 * Mezclarlas en un solo estado obligaría a reordenar, porque un punto en vivo
 * recibido antes de que responda el `GET` es más nuevo que todo lo que ese
 * `GET` va a traer.
 *
 * El estado de la conexión no se copia a un `useState`: el socket es un sistema
 * externo y se lee con `useSyncExternalStore`, igual que hace el store de
 * notificaciones. Duplicarlo en un efecto encadenaría un render por cada cambio
 * de estado del socket.
 */

import {
    TripPositionEventSchema,
    mergeTripPositions,
    tripProvider,
    type TripPosition,
    type TripTrackingStatus
} from "@/features/trips/trips";
import { getBroadcastState, getEcho } from "@/config/broadcasting/echo";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";

/** Traduce el estado del socket de Pusher al vocabulario de la pantalla. */
const toTrackingStatus = (state: string): TripTrackingStatus => {
    if (state === 'connected') return 'live';

    if (state === 'connecting' || state === 'initialized') return 'connecting';

    if (state === 'unavailable') return 'offline';

    return state === 'failed' || state === 'disconnected' ? 'offline' : 'unavailable';
};

/**
 * Todo lo que aporta el socket, **anotado con el viaje al que pertenece**. Así
 * cambiar de viaje no necesita vaciar nada en un efecto: lo que no lleva la
 * clave actual sencillamente no se lee.
 */
type LiveBuffer = {
    tripId: string | undefined;
    positions: TripPosition[];
    /** El nombre del piloto que reporta. El `GET` no lo devuelve. */
    pilotName: string | null;
    /** El canal rechazó la suscripción: rol o ámbito insuficientes. */
    isForbidden: boolean;
}

/** Identidad estable para el viaje que todavía no tiene nada del socket. */
const EMPTY_BUFFER: LiveBuffer = { tripId: undefined, positions: [], pilotName: null, isForbidden: false };

type TripTracking = {
    /** El recorrido completo, en orden ascendente por `recordedAt`. */
    positions: TripPosition[];
    /** Dónde está ahora mismo, o `null` si el piloto no ha reportado nada. */
    last: TripPosition | null;
    status: TripTrackingStatus;
    /** Solo lo manda el websocket; hasta el primer evento es `null`. */
    pilotName: string | null;
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
}

export const useTripTracking = (tripId: string | undefined, enabled: boolean): TripTracking => {
    const [live, setLive] = useState<LiveBuffer>(EMPTY_BUFFER);

    /**
     * El evento del canal **no trae `id`**, y el tipo lo exige. Se numeran en
     * negativo para que no puedan chocar nunca con los del `GET`; la
     * deduplicación real no los mira.
     */
    const nextLiveId = useRef(-1);

    const subscribeToSocket = useCallback((onChange: () => void) => {
        if (!enabled) return () => undefined;

        const echo = getEcho();

        /** Sin variables de Reverb o sin sesión no se llega ni a intentar. */
        if (!echo) return () => undefined;

        const connection = echo.connector.pusher.connection;

        connection.bind('state_change', onChange);

        return () => connection.unbind('state_change', onChange);
    }, [enabled]);

    const socketState = useSyncExternalStore(
        subscribeToSocket,
        () => enabled ? getBroadcastState() : 'unavailable'
    );

    useEffect(() => {
        if (!tripId || !enabled) return;

        const echo = getEcho();

        if (!echo) return;

        const channelName = `trips.${tripId}`;
        const channel = echo.private(channelName);

        /**
         * El punto inicial del nombre es obligatorio: sin él Echo antepone el
         * namespace de PHP, busca `App\Events\Trip\TripPositionUpdated` y no
         * llega nada, sin ningún error.
         */
        channel.listen('.trip.position.updated', (payload: unknown) => {
            const event = TripPositionEventSchema.safeParse(payload);

            /** Un payload que no encaja se descarta: mejor un hueco que un punto inventado. */
            if (!event.success) return;

            const { latitude, longitude, recordedAt, pilotId } = event.data;

            const position: TripPosition = {
                id: nextLiveId.current--,
                latitude,
                longitude,
                recordedAt,
                pilotId,
            };

            setLive((current) => current.tripId === tripId
                ? { ...current, positions: mergeTripPositions(current.positions, [position]), pilotName: event.data.pilotName }
                : { tripId, positions: [position], pilotName: event.data.pilotName, isForbidden: false });
        });

        /**
         * El 403 del canal es definitivo —ni el rol ni el ámbito cambian
         * reconectando—, así que se recuerda y deja de mirarse el socket.
         */
        const onSubscriptionError = () => setLive((current) => current.tripId === tripId
            ? { ...current, isForbidden: true }
            : { tripId, positions: [], pilotName: null, isForbidden: true });

        channel.subscription.bind('pusher:subscription_error', onSubscriptionError);

        return () => {
            channel.subscription.unbind('pusher:subscription_error', onSubscriptionError);
            /** Un canal por viaje: sin esto quedarían suscripciones colgando al navegar. */
            echo.leave(channelName);
        };
    }, [tripId, enabled]);

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['getTripPositions', tripId],
        queryFn: () => tripProvider.getTripPositions(tripId!),
        enabled: Boolean(tripId) && enabled
    });

    const buffer = live.tripId === tripId ? live : EMPTY_BUFFER;
    const livePositions = buffer.positions;

    /**
     * Memoizado a propósito y no por rendimiento: el mapa se apoya en la
     * identidad de este array para no rehacer el trazo ni recolocar la cámara
     * en cada render.
     */
    const positions = useMemo(() => mergeTripPositions(data ?? [], livePositions), [data, livePositions]);

    return {
        positions,
        last: positions.at(-1) ?? null,
        status: buffer.isForbidden ? 'forbidden' : toTrackingStatus(socketState),
        pilotName: buffer.pilotName,
        isLoading,
        isError,
        error
    };
};
