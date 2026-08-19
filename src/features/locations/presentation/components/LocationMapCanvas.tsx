import { APIProvider, Map } from "@vis.gl/react-google-maps";
import { LOCATION_MAP_DEFAULT_CENTER, LOCATION_MAP_DEFAULT_ZOOM, LOCATION_MAP_PIN_ZOOM } from "@/features/locations/locations";
import { MapPinOff } from "lucide-react";
import type { MapMouseEvent } from "@vis.gl/react-google-maps";
import type { ReactNode } from "react";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY as string | undefined;

type Props = {
    children?: ReactNode;
    /** Encuadre inicial. Si el destino todavía no tiene pin, abre sobre Guatemala. */
    center?: google.maps.LatLngLiteral | null;
    height?: string;
    /** El detalle solo mira: el gesto cambia para no secuestrar el scroll. */
    readOnly?: boolean;
    onClick?: (event: MapMouseEvent) => void;
};

export function LocationMapCanvas({ children, center, height = "h-[22rem]", readOnly = false, onClick }: Props) {
    if (!GOOGLE_MAPS_API_KEY) {
        return (
            <div className={`flex ${height} flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line-strong bg-canvas px-8 text-center`}>
                <MapPinOff size={22} className="text-ink-subtle" />

                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                    Mapa no disponible
                </p>

                <p className="max-w-[44ch] text-sm text-ink-muted">
                    Falta la clave <span className="font-mono text-[13px] text-ink">VITE_GOOGLE_API_KEY</span> en el archivo <span className="font-mono text-[13px] text-ink">.env</span>. Agrégala y recarga para ubicar el pin.
                </p>
            </div>
        );
    }

    const camera = center
        ? { defaultCenter: center, defaultZoom: LOCATION_MAP_PIN_ZOOM }
        : { defaultCenter: LOCATION_MAP_DEFAULT_CENTER, defaultZoom: LOCATION_MAP_DEFAULT_ZOOM };

    return (
        <div className={`${height} overflow-hidden rounded-2xl border border-line bg-canvas`}>
            <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
                <Map
                    {...camera}
                    style={{ width: '100%', height: '100%' }}
                    gestureHandling={readOnly ? 'cooperative' : 'greedy'}
                    clickableIcons={false}
                    streetViewControl={false}
                    fullscreenControl={false}
                    mapTypeControl={!readOnly}
                    onClick={onClick}
                    zoomControl
                >
                    {children}
                </Map>
            </APIProvider>
        </div>
    );
}
