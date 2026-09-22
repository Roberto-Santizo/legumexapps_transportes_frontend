/**
 * Las capas que comparten los dos mapas del viaje —la ficha y el seguimiento—
 * y el vocabulario visual que las hace legibles sin leyenda: **lo previsto va
 * en guion discontinuo y apagado; lo real va en ámbar, grueso y continuo**. Es
 * la misma regla que el riel de `TripTimeline`: hueco lo que es promesa,
 * sólido lo que ya ocurrió.
 *
 * `@vis.gl/react-google-maps` no exporta `Polyline`, así que cada capa
 * instancia la de Google sobre el mapa del contexto y la suelta con
 * `setMap(null)` al desmontar o al cambiar de ruta. Son capas **estáticas**:
 * se crean con su camino y no cambian. El rastro en vivo, que crece punto a
 * punto, tiene su propia capa en `TripTrackingMap` porque recrearlo en cada
 * evento lo haría parpadear.
 */

import type { LatLng } from "@/features/trips/trips";
import { NO_TRIP_POINTS, TRIP_ROUTE_INK } from "@/features/trips/trips";
import { toRoutePath } from "@/features/places/places";
import { useMap } from "@vis.gl/react-google-maps";
import { useEffect } from "react";

/** Un guion corto repetido: es la forma de dibujar una línea discontinua en Google Maps. */
const PLANNED_DASH: google.maps.IconSequence = {
    icon: {
        path: 'M 0,-1 0,1',
        strokeColor: TRIP_ROUTE_INK,
        strokeOpacity: 0.45,
        strokeWeight: 2,
        scale: 3,
    },
    offset: '0',
    repeat: '14px',
};

/**
 * La ruta prevista **como contexto**: discontinua y apagada, para leer encima
 * de ella un rastro real. Cuando no hay rastro que comparar no se usa esta
 * capa sino `TripSolidRouteLayer` en tinta: lo previsto es entonces lo único
 * que hay y no tiene por qué pintarse en segundo plano.
 */
export function TripPlannedRouteLayer({ points }: { points: LatLng[] }) {
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

type SolidProps = {
    points: LatLng[];
    /** Tinta para lo previsto cuando va solo; ámbar para lo que de verdad se recorrió. */
    color?: string;
}

/** Una línea continua y quieta. Va por encima de la prevista cuando conviven. */
export function TripSolidRouteLayer({ points, color = TRIP_ROUTE_INK }: SolidProps) {
    const map = useMap();

    useEffect(() => {
        if (!map || points.length === 0) return;

        const line = new google.maps.Polyline({
            path: toRoutePath(points),
            map,
            strokeColor: color,
            strokeOpacity: color === TRIP_ROUTE_INK ? 0.85 : 0.95,
            strokeWeight: color === TRIP_ROUTE_INK ? 4 : 5,
            zIndex: 2,
        });

        return () => line.setMap(null);
    }, [map, points, color]);

    return null;
}

/**
 * Encuadra todo lo que se pinta, una vez por cambio de ruta: una ruta de
 * 300 km no cabe en el zoom con el que abre el mapa, y un rastro real puede
 * salirse de la prevista.
 */
export function TripRouteBounds({ planned, traveled = NO_TRIP_POINTS }: { planned: LatLng[]; traveled?: LatLng[] }) {
    const map = useMap();

    useEffect(() => {
        if (!map) return;

        const all = [...planned, ...traveled];

        if (all.length === 0) return;

        const bounds = new google.maps.LatLngBounds();
        all.forEach(([lat, lng]) => bounds.extend({ lat, lng }));

        map.fitBounds(bounds, 48);
    }, [map, planned, traveled]);

    return null;
}
