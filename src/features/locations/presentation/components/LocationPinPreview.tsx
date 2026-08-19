import type { Location } from "@/features/locations/locations";
import { LocationMapCanvas, getLocationPosition } from "@/features/locations/locations";
import { Marker } from "@vis.gl/react-google-maps";

type Props = {
    location: Location;
    height?: string;
};

/** El mismo punto que se guardó, sin controles de edición. */
export function LocationPinPreview({ location, height }: Props) {
    const position = getLocationPosition(location);

    return (
        <LocationMapCanvas center={position} height={height} readOnly>
            <Marker position={position} clickable={false} />
        </LocationMapCanvas>
    );
}
