/**
 * De dónde sale el viaje. Mismo mecanismo que `LocationPinField` —el buscador
 * ancla el punto a un lugar de Google, el pin solo corrige las coordenadas—
 * pero aquí el punto no se registra en ninguna tabla: es el origen suelto que
 * viaja como `lat`/`lng` a `/api/places/directions`.
 */

import type { Directions, Place } from "@/features/places/places";
import { PlaceSearchField, toRoutePath } from "@/features/places/places";
import { LOCATION_MAP_PIN_ZOOM, LocationMapCanvas, roundCoordinate, toMapsPosition } from "@/features/locations/locations";
import { Marker, useMap, type MapMouseEvent } from "@vis.gl/react-google-maps";
import { MapPin } from "lucide-react";
import { useEffect, useState } from "react";

/** El `--color-ink` de `index.css`: la API de Google no lee tokens de Tailwind. */
const ROUTE_STROKE_COLOR = '#12241c';

type LayerProps = {
    position: google.maps.LatLngLiteral;
    /** Se reencuadra al elegir una dirección nueva, nunca al arrastrar el pin. */
    anchor: string;
    onMove: (latitude: number, longitude: number) => void;
};

function TripOriginPinLayer({ position, anchor, onMove }: LayerProps) {
    const map = useMap();

    useEffect(() => {
        if (!map || !anchor) return;

        map.panTo(position);
        map.setZoom(LOCATION_MAP_PIN_ZOOM);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map, anchor]);

    return (
        <Marker
            position={position}
            draggable
            onDragEnd={(event) => {
                const point = event.latLng;

                if (!point) return;

                onMove(roundCoordinate(point.lat()), roundCoordinate(point.lng()));
            }}
        />
    );
}

/**
 * La línea de la ruta. `@vis.gl/react-google-maps` no exporta un componente
 * `Polyline`, así que se instancia la de Google sobre el mapa del contexto y se
 * suelta con `setMap(null)` al desmontar o al cambiar de ruta.
 *
 * Se dibuja `points`, no `polyline`: son la misma línea en dos formatos.
 */
function TripRouteLayer({ points }: { points: Directions['points'] }) {
    const map = useMap();

    useEffect(() => {
        if (!map || points.length === 0) return;

        const line = new google.maps.Polyline({
            path: toRoutePath(points),
            map,
            strokeColor: ROUTE_STROKE_COLOR,
            strokeOpacity: 0.85,
            strokeWeight: 4,
        });

        return () => line.setMap(null);
    }, [map, points]);

    return null;
}

type Props = {
    googlePlaceId: string;
    latitude: number;
    longitude: number;
    onPlaceSelected: (place: Place) => void;
    onPinMoved: (latitude: number, longitude: number) => void;
    onError?: (message: string) => void;
    errorMessage?: string;
    /** Los pares de la ruta calculada. Sin ruta, el mapa solo muestra el origen. */
    routePoints?: Directions['points'];
};

export function TripOriginField({
    googlePlaceId,
    latitude,
    longitude,
    onPlaceSelected,
    onPinMoved,
    onError,
    errorMessage,
    routePoints
}: Props) {
    /**
     * La dirección que devolvió el detalle del lugar, no el texto que se tecleó.
     * Vive aquí y no en el formulario: no viaja al servidor y arrastrar el pin
     * no la cambia, porque el lugar de Google sigue siendo el mismo.
     */
    const [address, setAddress] = useState('');

    const anchor = googlePlaceId.trim();
    const hasOrigin = anchor.length > 0;
    const position = toMapsPosition(latitude, longitude);

    /** El último par de la ruta es el destino: ahí va el marcador fijo. */
    const lastPoint = routePoints?.at(-1);
    const destination = lastPoint ? toMapsPosition(lastPoint[0], lastPoint[1]) : null;

    const handleMapClick = (event: MapMouseEvent) => {
        const point = event.detail.latLng;

        if (!point || !hasOrigin) return;

        onPinMoved(roundCoordinate(point.lat), roundCoordinate(point.lng));
    };

    return (
        <div className="flex flex-col gap-4">
            <PlaceSearchField
                label="Buscar el punto de partida"
                placeholder="Planta Legumex, Chimaltenango"
                onSelect={(place) => {
                    setAddress(place.formattedAddress);
                    onPlaceSelected(place);
                }}
                onError={onError}
            />

            {hasOrigin && address && (
                <p className="flex items-start gap-2 rounded-xl border border-line bg-canvas px-4 py-3 text-sm text-ink">
                    <MapPin size={15} className="mt-0.5 shrink-0 text-ink-subtle" />
                    {address}
                </p>
            )}

            <div className="flex flex-col gap-2">
                <LocationMapCanvas
                    center={hasOrigin ? position : null}
                    onClick={handleMapClick}
                >
                    {hasOrigin && (
                        <TripOriginPinLayer
                            position={position}
                            anchor={anchor}
                            onMove={onPinMoved}
                        />
                    )}

                    {routePoints && routePoints.length > 0 && (
                        <TripRouteLayer points={routePoints} />
                    )}

                    {destination && <Marker position={destination} />}
                </LocationMapCanvas>

                <p className="text-xs text-ink-muted">
                    {hasOrigin
                        ? "Arrastra el pin o haz clic en el mapa para afinar el punto de salida. La dirección buscada no cambia."
                        : "Busca la dirección de salida para colocar el pin. Después puedes afinar el punto sobre el mapa."}
                </p>

                {errorMessage && (
                    <p className="text-xs text-danger">{errorMessage}</p>
                )}
            </div>
        </div>
    );
}
