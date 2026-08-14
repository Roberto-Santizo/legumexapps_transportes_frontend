import type { LatLngPair } from "@/features/zones/zones";
import {
    ZONE_MIN_VERTICES,
    ZoneMapCanvas,
    fromMapsPath,
    getAreaBounds,
    toMapsPath
} from "@/features/zones/zones";
import { Polygon, Polyline, useMap } from "@vis.gl/react-google-maps";
import { Check, PenLine, Undo2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const TOOLBAR_BUTTON = "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-canvas hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink-muted";

const TOOLBAR_BUTTON_PRIMARY = "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-ink bg-ink px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-ink/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 disabled:cursor-not-allowed disabled:border-line disabled:bg-ink/30";

type LayerProps = {
    value: LatLngPair[];
    color: string;
    isTracing: boolean;
    onChange: (area: LatLngPair[]) => void;
};

function ZoneDrawingLayer({ value, color, isTracing, onChange }: LayerProps) {
    const map = useMap();
    const onChangeRef = useRef(onChange);
    const valueRef = useRef(value);

    useEffect(() => {
        onChangeRef.current = onChange;
        valueRef.current = value;
    });

    useEffect(() => {
        if (!map || !isTracing) return;

        const listener = map.addListener('click', (event: google.maps.MapMouseEvent) => {
            const point = event.latLng;

            if (!point) return;

            onChangeRef.current([...valueRef.current, [point.lat(), point.lng()]]);
        });

        return () => listener.remove();
    }, [map, isTracing]);

    const handlePathsChanged = useCallback((paths: google.maps.LatLng[][]) => {
        onChangeRef.current(fromMapsPath(paths[0] ?? []));
    }, []);

    const path = toMapsPath(value);

    if (isTracing) {
        if (value.length < 2) return null;

        if (value.length < ZONE_MIN_VERTICES) {
            return (
                <Polyline
                    path={path}
                    clickable={false}
                    strokeColor={color}
                    strokeOpacity={1}
                    strokeWeight={2}
                />
            );
        }

        return (
            <Polygon
                paths={path}
                clickable={false}
                strokeColor={color}
                strokeOpacity={1}
                strokeWeight={2}
                fillColor={color}
                fillOpacity={0.18}
            />
        );
    }

    return (
        <Polygon
            paths={path}
            onPathsChanged={handlePathsChanged}
            editable
            clickable
            draggable={false}
            strokeColor={color}
            strokeOpacity={1}
            strokeWeight={2}
            fillColor={color}
            fillOpacity={0.18}
        />
    );
}

type Props = {
    value: LatLngPair[];
    color: string;
    onChange: (area: LatLngPair[]) => void;
    errorMessage?: string;
};

export function ZonePolygonEditor({ value, color, onChange, errorMessage }: Props) {
    const [initialBounds] = useState(() => getAreaBounds(value));

    const [isTracing, setIsTracing] = useState(() => value.length < ZONE_MIN_VERTICES);

    const canClose = value.length >= ZONE_MIN_VERTICES;

    const hint = isTracing
        ? value.length === 0
            ? "Haz clic en el mapa para marcar el primer vértice del área."
            : canClose
                ? "Sigue marcando vértices o cierra el trazo para poder ajustarlo."
                : `Marca al menos ${ZONE_MIN_VERTICES} vértices para cerrar el área.`
        : "Arrastra un vértice para moverlo, o un punto intermedio para agregar uno nuevo.";

    return (
        <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="text-sm font-medium text-gray-700">
                    Área de la zona
                </label>

                <div className="flex items-center gap-2">
                    <span className="mr-1 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-subtle">
                        {value.length} {value.length === 1 ? 'vértice' : 'vértices'}
                    </span>

                    {isTracing ? (
                        <>
                            <button
                                type="button"
                                onClick={() => onChange(value.slice(0, -1))}
                                disabled={value.length === 0}
                                className={TOOLBAR_BUTTON}
                            >
                                <Undo2 size={13} />
                                Deshacer punto
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsTracing(false)}
                                disabled={!canClose}
                                className={TOOLBAR_BUTTON_PRIMARY}
                            >
                                <Check size={13} />
                                Cerrar trazo
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            onClick={() => {
                                onChange([]);
                                setIsTracing(true);
                            }}
                            className={TOOLBAR_BUTTON}
                        >
                            <PenLine size={13} />
                            Volver a dibujar
                        </button>
                    )}
                </div>
            </div>

            <ZoneMapCanvas bounds={initialBounds}>
                <ZoneDrawingLayer
                    value={value}
                    color={color}
                    isTracing={isTracing}
                    onChange={onChange}
                />
            </ZoneMapCanvas>

            <p className="text-xs text-ink-muted">{hint}</p>

            <p className="text-red-400 text-xs">{errorMessage}</p>
        </div>
    );
}
