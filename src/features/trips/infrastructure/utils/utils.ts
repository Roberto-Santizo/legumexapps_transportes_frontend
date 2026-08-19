import type { TripForm, TripFormValues } from "@/features/trips/trips";

export const TRIP_NOT_IMPLEMENTED = "No implementado";

/** Cuántos destinos se piden para llenar el select. */
export const TRIP_DESTINATIONS_LIMIT = '100';

/** Deja fuera todo lo que el formulario usa pero el servidor no recibe. */
export const buildTripPayload = (values: TripFormValues): TripForm => ({
    polyline: values.polyline,
});
