/**
 * El tramo por carretera, dibujado con `points` —que ya viene decodificado en
 * cada lectura— y nunca decodificando `polyline` a mano.
 *
 * El mapa solo mira: los dos extremos son catálogos y se eligen en sus selects,
 * así que aquí no hay pin que arrastrar. Lo que se ve es el resultado de la
 * ruta que se va a guardar, no un control para editarla.
 */

import type { LatLng } from "@/features/trips/trips";
import { LocationMapCanvas } from "@/features/locations/locations";
import { toRoutePath } from "@/features/places/places";
import { Marker, useMap } from "@vis.gl/react-google-maps";
import { useEffect } from "react";

/** El `--color-ink` de `index.css`: la API de Google no lee tokens de Tailwind. */
const ROUTE_STROKE_COLOR = '#12241c';

/**
 * `@vis.gl/react-google-maps` no exporta un componente `Polyline`, así que se
 * instancia la de Google sobre el mapa del contexto y se suelta con
 * `setMap(null)` al desmontar o al cambiar de ruta.
 *
 * De paso encuadra el tramo entero: una ruta de 300 km no cabe en el zoom con
 * el que abre el mapa.
 */
function TripRouteLayer({ points }: { points: LatLng[] }) {
    const map = useMap();

    useEffect(() => {
        if (!map || points.length === 0) return;

        const path = toRoutePath(points);

        const line = new google.maps.Polyline({
            path,
            map,
            strokeColor: ROUTE_STROKE_COLOR,
            strokeOpacity: 0.85,
            strokeWeight: 4,
        });

        const bounds = new google.maps.LatLngBounds();
        path.forEach((point) => bounds.extend(point));
        map.fitBounds(bounds, 48);

        return () => line.setMap(null);
    }, [map, points]);

    return null;
}

type Props = {
    /** Pares `[lat, lng]` del viaje. Vacío mientras no haya ruta resuelta. */
    points: LatLng[];
    height?: string;
}

export function TripRouteMap({ points, height = "h-[22rem]" }: Props) {
    const origin = points.at(0);
    const destination = points.at(-1);

    return (
        <LocationMapCanvas
            center={origin ? { lat: origin[0], lng: origin[1] } : null}
            height={height}
            readOnly
        >
            {points.length > 0 && <TripRouteLayer points={points} />}

            {origin && <Marker position={{ lat: origin[0], lng: origin[1] }} />}
            {destination && <Marker position={{ lat: destination[0], lng: destination[1] }} />}
        </LocationMapCanvas>
    );
}
