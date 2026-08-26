import type { DeparturePoint } from "@/features/departure-points/departure-points";
import { DeparturePointMapCanvas, getDeparturePointPosition } from "@/features/departure-points/departure-points";
import { Marker } from "@vis.gl/react-google-maps";

type Props = {
    departurePoint: DeparturePoint;
    height?: string;
};

/** El mismo punto que se guardó, sin controles de edición. */
export function DeparturePointPinPreview({ departurePoint, height }: Props) {
    const position = getDeparturePointPosition(departurePoint);

    return (
        <DeparturePointMapCanvas center={position} height={height} readOnly>
            <Marker position={position} clickable={false} />
        </DeparturePointMapCanvas>
    );
}
