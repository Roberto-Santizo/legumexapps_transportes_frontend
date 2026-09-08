/**
 * El mapa del seguimiento, que pinta **dos rutas a la vez** y las jerarquiza:
 *
 * - La **prevista** —la `polyline` que se guardó al publicar el viaje— va en
 *   trazo discontinuo y apagado. Es el contexto contra el que se lee lo otro,
 *   no el protagonista, y además puede haber quedado obsoleta: la API no la
 *   recalcula nunca.
 * - El **recorrido real** va en el ámbar de la paleta, grueso y continuo, con
 *   un punto marcando dónde está ahora el vehículo. Es lo único de esta
 *   pantalla que se mueve.
 *
 * `@vis.gl/react-google-maps` no exporta `Polyline`, así que las dos se
 * instancian a mano sobre el mapa del contexto, igual que en `TripRouteMap`.
 * La diferencia está en el rastro: como crece con cada evento, se guarda **una
 * sola** polilínea y se le cambia el camino con `setPath`. Recrearla en cada
 * punto la haría parpadear.
 */

import type { LatLng } from "@/features/trips/trips";
import { LocationMapCanvas } from "@/features/locations/locations";
import { toRoutePath } from "@/features/places/places";
import { Marker, useMap } from "@vis.gl/react-google-maps";
import { useEffect, useRef } from "react";

/** Los `--color-ink` y `--color-primary` de `index.css`: Google no lee tokens de Tailwind. */
const PLANNED_STROKE_COLOR = '#12241c';
const TRACK_STROKE_COLOR = '#e8a33d';

/** Un guion corto repetido: es la forma de dibujar una línea discontinua en Google Maps. */
const PLANNED_DASH: google.maps.IconSequence = {
    icon: {
        path: 'M 0,-1 0,1',
        strokeColor: PLANNED_STROKE_COLOR,
        strokeOpacity: 0.45,
        strokeWeight: 2,
        scale: 3,
    },
    offset: '0',
    repeat: '14px',
};

/** La ruta prevista. No cambia en toda la sesión, así que se crea y se olvida. */
function TripPlannedRouteLayer({ points }: { points: LatLng[] }) {
    const map = useMap();

    useEffect(() => {
        if (!map || points.length === 0) return;

        const line = new google.maps.Polyline({
            path: toRoutePath(points),
            map,
            /** Opaca a cero: lo que se ve son los iconos del guion. */
            strokeOpacity: 0,
            icons: [PLANNED_DASH],
            zIndex: 1,
        });

        return () => line.setMap(null);
    }, [map, points]);

    return null;
}

/** El recorrido real: una polilínea que vive mientras vive el mapa y solo cambia de camino. */
function TripTrackLayer({ points }: { points: LatLng[] }) {
    const map = useMap();
    const line = useRef<google.maps.Polyline | null>(null);

    useEffect(() => {
        if (!map) return;

        const polyline = new google.maps.Polyline({
            map,
            strokeColor: TRACK_STROKE_COLOR,
            strokeOpacity: 0.95,
            strokeWeight: 5,
            zIndex: 2,
        });

        line.current = polyline;

        return () => {
            polyline.setMap(null);
            line.current = null;
        };
    }, [map]);

    useEffect(() => {
        line.current?.setPath(toRoutePath(points));
    }, [points]);

    return null;
}

/** Dónde está el vehículo ahora. Se dibuja como símbolo para que no compita con los pines de los extremos. */
function TripVehicleMarker({ position }: { position: LatLng }) {
    const map = useMap();

    /** Sin mapa la API todavía no cargó y `google.maps.SymbolPath` no existe. */
    if (!map) return null;

    return (
        <Marker
            position={{ lat: position[0], lng: position[1] }}
            zIndex={3}
            title="Última posición reportada"
            icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: TRACK_STROKE_COLOR,
                fillOpacity: 1,
                strokeColor: PLANNED_STROKE_COLOR,
                strokeWeight: 2,
            }}
        />
    );
}

/**
 * La cámara, separada de las capas porque tiene una regla propia: encuadra el
 * conjunto **una sola vez** y a partir de ahí solo sigue al vehículo. Un
 * `fitBounds` en cada punto le arrancaría el zoom de las manos a quien está
 * mirando, y en cuanto alguien arrastra el mapa se deja de seguir del todo.
 */
function TripTrackingCamera({ plannedPoints, trackPoints }: { plannedPoints: LatLng[]; trackPoints: LatLng[] }) {
    const map = useMap();
    const hasFitted = useRef(false);
    const isUserControlled = useRef(false);

    const last = trackPoints.at(-1);
    const lastLat = last?.[0];
    const lastLng = last?.[1];

    useEffect(() => {
        if (!map || hasFitted.current) return;

        const all = [...plannedPoints, ...trackPoints];

        if (all.length === 0) return;

        const bounds = new google.maps.LatLngBounds();
        all.forEach(([lat, lng]) => bounds.extend({ lat, lng }));

        map.fitBounds(bounds, 48);
        hasFitted.current = true;
    }, [map, plannedPoints, trackPoints]);

    useEffect(() => {
        if (!map) return;

        const listener = map.addListener('dragstart', () => {
            isUserControlled.current = true;
        });

        return () => listener.remove();
    }, [map]);

    useEffect(() => {
        if (!map || lastLat === undefined || lastLng === undefined) return;
        if (!hasFitted.current || isUserControlled.current) return;

        map.panTo({ lat: lastLat, lng: lastLng });
    }, [map, lastLat, lastLng]);

    return null;
}

type Props = {
    /** La ruta guardada del viaje. Vacía si nunca se resolvió. */
    plannedPoints: LatLng[];
    /** El recorrido reportado, en orden ascendente. Vacío hasta el primer reporte. */
    trackPoints: LatLng[];
    height?: string;
}

export function TripTrackingMap({ plannedPoints, trackPoints, height = "h-[34rem]" }: Props) {
    const origin = plannedPoints.at(0);
    const destination = plannedPoints.at(-1);
    const vehicle = trackPoints.at(-1);

    /** Abre donde está el vehículo; si aún no reportó, donde arranca la ruta. */
    const center = vehicle ?? origin;

    return (
        <LocationMapCanvas
            center={center ? { lat: center[0], lng: center[1] } : null}
            height={height}
            readOnly
        >
            {plannedPoints.length > 0 && <TripPlannedRouteLayer points={plannedPoints} />}

            <TripTrackLayer points={trackPoints} />

            <TripTrackingCamera plannedPoints={plannedPoints} trackPoints={trackPoints} />

            {origin && <Marker position={{ lat: origin[0], lng: origin[1] }} />}
            {destination && <Marker position={{ lat: destination[0], lng: destination[1] }} />}

            {vehicle && <TripVehicleMarker position={vehicle} />}
        </LocationMapCanvas>
    );
}
