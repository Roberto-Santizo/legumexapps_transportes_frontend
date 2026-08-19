/**
 * Dónde se decide el punto del destino. Dos caminos que dejan estados
 * distintos, y conviene tenerlos claros:
 *
 * - **Buscar la dirección** ancla el destino a un lugar de Google: trae el
 *   googlePlaceId —obligatorio, sin él la API responde 422— junto con las
 *   coordenadas y la dirección formateada.
 * - **Mover el pin** solo corrige las coordenadas. No cambia el lugar al que
 *   apunta el destino, y la API acepta el desfase sin avisar. Es para afinar
 *   la entrada de una bodega, no para elegir otro sitio.
 */

import type { Place } from "@/features/places/places";
import { PlaceSearchField } from "@/features/places/places";
import { LOCATION_MAP_PIN_ZOOM, LocationMapCanvas, LocationPlaceTag, roundCoordinate, toMapsPosition } from "@/features/locations/locations";
import { Marker, useMap, type MapMouseEvent } from "@vis.gl/react-google-maps";
import { useEffect } from "react";

type LayerProps = {
    position: google.maps.LatLngLiteral;
    /** Se reencuadra al elegir un lugar nuevo, nunca al arrastrar el pin. */
    anchor: string;
    onMove: (latitude: number, longitude: number) => void;
};

function LocationPinLayer({ position, anchor, onMove }: LayerProps) {
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

export function LocationPinField({
    googlePlaceId,
    latitude,
    longitude,
    onPlaceSelected,
    onPinMoved,
    onError,
    errorMessage
}: Props) {
    const anchor = googlePlaceId.trim();
    const hasPin = anchor.length > 0;
    const position = toMapsPosition(latitude, longitude);

    const handleMapClick = (event: MapMouseEvent) => {
        const point = event.detail.latLng;

        if (!point || !hasPin) return;

        onPinMoved(roundCoordinate(point.lat), roundCoordinate(point.lng));
    };

    return (
        <div className="flex flex-col gap-4">
            <PlaceSearchField onSelect={onPlaceSelected} onError={onError} />

            <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="text-sm font-medium text-gray-700">
                        Punto del destino
                    </label>
                </div>

                <LocationMapCanvas
                    center={hasPin ? position : null}
                    onClick={handleMapClick}
                >
                    {hasPin && (
                        <LocationPinLayer
                            position={position}
                            anchor={anchor}
                            onMove={onPinMoved}
                        />
                    )}
                </LocationMapCanvas>

                {hasPin ? (
                   <></>
                ) : (
                    <p className="text-xs text-ink-muted">
                        Busca la dirección para anclar el destino a un lugar de Google. Después arrastra el pin o haz clic en el mapa para afinar el punto.
                    </p>
                )}

                {hasPin && (
                    <p className="text-xs text-ink-muted">
                        Arrastra el pin o haz clic en el mapa para corregir el punto. El lugar de Google no cambia: para apuntar a otro sitio, busca la dirección de nuevo.
                    </p>
                )}

                <p className="text-red-400 text-xs">{errorMessage}</p>
            </div>
        </div>
    );
}
