import type { LatLngPair } from "@/features/zones/zones";
import { ZoneMapCanvas, getAreaBounds, toMapsPath } from "@/features/zones/zones";
import { Polygon } from "@vis.gl/react-google-maps";

type Props = {
    area: LatLngPair[];
    color: string;
    height?: string;
};

/** El mismo trazado que se dibujó, sin controles de edición. */
export function ZonePolygonPreview({ area, color, height }: Props) {
    return (
        <ZoneMapCanvas bounds={getAreaBounds(area)} height={height} readOnly>
            <Polygon
                paths={toMapsPath(area)}
                clickable={false}
                strokeColor={color}
                strokeOpacity={1}
                strokeWeight={2}
                fillColor={color}
                fillOpacity={0.2}
            />
        </ZoneMapCanvas>
    );
}
