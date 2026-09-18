/**
 * El tramo por carretera, dibujado con `points` —que ya viene decodificado en
 * cada lectura— y nunca decodificando `polyline` a mano.
 *
 * El mapa solo mira: los dos extremos son catálogos y se eligen en sus selects,
 * así que aquí no hay pin que arrastrar. Lo que se ve es el resultado de la
 * ruta que se va a guardar, no un control para editarla.
 *
 * Desde SPEC 28 sabe pintar **dos trazos**: la ruta prevista y, si el viaje ya
 * cerró con rastro, la real. Cuando conviven, la prevista pasa a segundo plano
 * —guion apagado— y la real manda en ámbar, con la misma jerarquía que el
 * mapa de seguimiento: lo que de verdad pasó pesa más que lo que se planificó.
 * Sin ruta real, la prevista se pinta sola y en tinta: no hay nada con lo que
 * compararla y ponerla en segundo plano sería un mapa en gris.
 */

import type { LatLng } from "@/features/trips/trips";
import {
    NO_TRIP_POINTS,
    TRIP_ROUTE_AMBER,
    TripPlannedRouteLayer,
    TripRouteBounds,
    TripSolidRouteLayer
} from "@/features/trips/trips";
import { LocationMapCanvas } from "@/features/locations/locations";
import { Marker } from "@vis.gl/react-google-maps";

type Props = {
    /** Pares `[lat, lng]` de la ruta prevista. Vacío mientras no haya ruta resuelta. */
    points: LatLng[];
    /**
     * La ruta real, `traveledPoints` del detalle. **Solo se pasa cuando
     * `traveledPolyline` no es `null`**: `[]` significa «no hay nada que
     * pintar», no un error, y entonces el mapa se queda con la prevista.
     */
    traveledPoints?: LatLng[];
    height?: string;
}

export function TripRouteMap({ points, traveledPoints = NO_TRIP_POINTS, height = "h-[22rem]" }: Props) {
    const origin = points.at(0);
    const destination = points.at(-1);
    const hasTraveled = traveledPoints.length > 0;

    return (
        <LocationMapCanvas
            center={origin ? { lat: origin[0], lng: origin[1] } : null}
            height={height}
            readOnly
        >
            {points.length > 0 && (
                hasTraveled
                    ? <TripPlannedRouteLayer points={points} />
                    : <TripSolidRouteLayer points={points} />
            )}

            {hasTraveled && <TripSolidRouteLayer points={traveledPoints} color={TRIP_ROUTE_AMBER} />}

            <TripRouteBounds planned={points} traveled={traveledPoints} />

            {origin && <Marker position={{ lat: origin[0], lng: origin[1] }} />}
            {destination && <Marker position={{ lat: destination[0], lng: destination[1] }} />}
        </LocationMapCanvas>
    );
}
