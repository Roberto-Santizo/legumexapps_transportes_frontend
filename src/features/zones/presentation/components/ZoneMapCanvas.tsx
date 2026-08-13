import { APIProvider, Map } from "@vis.gl/react-google-maps";
import { ZONE_MAP_DEFAULT_CENTER, ZONE_MAP_DEFAULT_ZOOM } from "@/features/zones/zones";
import { MapPinOff } from "lucide-react";
import type { ReactNode } from "react";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY as string | undefined;

/**
 * `geometry` la usa el propio wrapper al montar polígonos. No se pide
 * `drawing`: Google retiró `DrawingManager` en la versión 3.65 y el trazado se
 * resuelve con clics sobre el mapa.
 */
const LIBRARIES = ['geometry'];

type Props = {
    children?: ReactNode;
    /** Encuadre inicial. Si no hay geometría todavía, abre sobre Guatemala. */
    bounds?: google.maps.LatLngBoundsLiteral | null;
    height?: string;
    /** El detalle solo mira: el listado de gestos cambia para no secuestrar el scroll. */
    readOnly?: boolean;
};

export function ZoneMapCanvas({ children, bounds, height = "h-[26rem]", readOnly = false }: Props) {
    if (!GOOGLE_MAPS_API_KEY) {
        return (
            <div className={`flex ${height} flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line-strong bg-canvas px-8 text-center`}>
                <MapPinOff size={22} className="text-ink-subtle" />

                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                    Mapa no disponible
                </p>

                <p className="max-w-[44ch] text-sm text-ink-muted">
                    Falta la clave <span className="font-mono text-[13px] text-ink">VITE_GOOGLE_API_KEY</span> en el archivo <span className="font-mono text-[13px] text-ink">.env</span>. Agrégala y recarga para dibujar el área.
                </p>
            </div>
        );
    }

    const camera = bounds
        ? { defaultBounds: { ...bounds, padding: 48 } }
        : { defaultCenter: ZONE_MAP_DEFAULT_CENTER, defaultZoom: ZONE_MAP_DEFAULT_ZOOM };

    return (
        <div className={`${height} overflow-hidden rounded-2xl border border-line bg-canvas`}>
            <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={LIBRARIES}>
                <Map
                    {...camera}
                    style={{ width: '100%', height: '100%' }}
                    gestureHandling={readOnly ? 'cooperative' : 'greedy'}
                    clickableIcons={false}
                    streetViewControl={false}
                    fullscreenControl={false}
                    mapTypeControl={!readOnly}
                    zoomControl
                >
                    {children}
                </Map>
            </APIProvider>
        </div>
    );
}
