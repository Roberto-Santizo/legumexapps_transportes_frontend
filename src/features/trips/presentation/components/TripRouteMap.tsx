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
 *
 * Con las dos rutas aparecen dos botones que son a la vez la leyenda: cada uno
 * lleva la muestra de su trazo y enciende o apaga su capa. Siempre queda una
 * visible —el último botón encendido no se puede apagar— y el encuadre no se
 * mueve al alternar, para poder comparar sobre el mismo tramo.
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
import { useState, type ReactNode } from "react";

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
    const [showPlanned, setShowPlanned] = useState(true);
    const [showTraveled, setShowTraveled] = useState(true);

    const map = (
        <LocationMapCanvas
            center={origin ? { lat: origin[0], lng: origin[1] } : null}
            height={height}
            readOnly
        >
            {points.length > 0 && (!hasTraveled || showPlanned) && (
                hasTraveled
                    ? <TripPlannedRouteLayer points={points} />
                    : <TripSolidRouteLayer points={points} />
            )}

            {hasTraveled && showTraveled && <TripSolidRouteLayer points={traveledPoints} color={TRIP_ROUTE_AMBER} />}

            <TripRouteBounds planned={points} traveled={traveledPoints} />

            {origin && <Marker position={{ lat: origin[0], lng: origin[1] }} />}
            {destination && <Marker position={{ lat: destination[0], lng: destination[1] }} />}
        </LocationMapCanvas>
    );

    if (!hasTraveled) return map;

    return (
        <div className="space-y-3">
            <div role="group" aria-label="Rutas visibles en el mapa" className="flex flex-wrap gap-2">
                <RouteToggle
                    label="Ruta planificada"
                    pressed={showPlanned}
                    locked={showPlanned && !showTraveled}
                    onToggle={() => setShowPlanned((value) => !value)}
                    swatch={<span className="w-6 border-t-2 border-dashed border-current opacity-70" />}
                />
                <RouteToggle
                    label="Recorrido del piloto"
                    pressed={showTraveled}
                    locked={showTraveled && !showPlanned}
                    onToggle={() => setShowTraveled((value) => !value)}
                    swatch={<span className="h-[3px] w-6 rounded-full" style={{ backgroundColor: TRIP_ROUTE_AMBER }} />}
                />
            </div>

            {map}
        </div>
    );
}

type RouteToggleProps = {
    label: string;
    pressed: boolean;
    /** La única capa encendida: apagarla dejaría el mapa vacío. */
    locked: boolean;
    onToggle: () => void;
    swatch: ReactNode;
}

function RouteToggle({ label, pressed, locked, onToggle, swatch }: RouteToggleProps) {
    return (
        <button
            type="button"
            onClick={onToggle}
            aria-pressed={pressed}
            disabled={locked}
            title={locked ? "Tiene que quedar al menos una ruta visible" : undefined}
            className={[
                "inline-flex cursor-pointer items-center gap-2.5 rounded-full px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 disabled:cursor-default",
                pressed
                    ? "bg-ink-deep text-canvas"
                    : "border border-line text-ink-subtle line-through decoration-ink-subtle/60 hover:bg-canvas hover:text-ink-muted"
            ].join(' ')}
        >
            {swatch}
            {label}
        </button>
    );
}
