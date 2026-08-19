/**
 * De dónde sale el viaje. Mismo mecanismo que `LocationPinField` —el buscador
 * ancla el punto a un lugar de Google, el pin solo corrige las coordenadas—
 * pero aquí el punto no se registra en ninguna tabla: es el origen suelto que
 * viaja como `lat`/`lng` a `/api/places/directions`.
 */

import type { Place } from "@/features/places/places";
import { PlaceSearchField } from "@/features/places/places";
import { LOCATION_MAP_PIN_ZOOM, LocationMapCanvas, roundCoordinate, toMapsPosition } from "@/features/locations/locations";
import { Marker, useMap, type MapMouseEvent } from "@vis.gl/react-google-maps";
import { useEffect } from "react";

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

type Props = {
    googlePlaceId: string;
    latitude: number;
    longitude: number;
    onPlaceSelected: (place: Place) => void;
    onPinMoved: (latitude: number, longitude: number) => void;
    onError?: (message: string) => void;
    errorMessage?: string;
};

export function TripOriginField({
    googlePlaceId,
    latitude,
    longitude,
    onPlaceSelected,
    onPinMoved,
    onError,
    errorMessage
}: Props) {
    const anchor = googlePlaceId.trim();
    const hasOrigin = anchor.length > 0;
    const position = toMapsPosition(latitude, longitude);

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
                onSelect={onPlaceSelected}
                onError={onError}
            />

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
