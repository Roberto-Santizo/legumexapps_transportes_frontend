/**
 * Los papeles del piloto dentro de la ficha del viaje: el anverso del DPI y el
 * de la licencia, tal como los subió al registrarse.
 *
 * Se reutiliza `VehiclePhoto` —el mismo marco, la misma bahía vacía y la misma
 * ampliación que la fotografía de la unidad— porque la lectura es idéntica: una
 * foto que se abre para cotejarla contra el papel. Las URLs llegan absolutas y
 * públicas, así que se pintan tal cual, sin token y sin componer ninguna ruta.
 *
 * De estos documentos la API no guarda nada más: ni número, ni tipo de
 * licencia, ni fecha de vencimiento. Por eso el bloque rotula lo que hay
 * —anverso, sin vencimiento— en lugar de sugerir una vigencia que nadie
 * comprueba.
 */

import { VehiclePhoto } from "@/features/vehicles/vehicles";
import type { Trip } from "@/features/trips/trips";

type DocumentProps = {
    label: string;
    image: string | null;
    alt: string;
}

function Document({ label, image, alt }: DocumentProps) {
    return (
        <div className="flex flex-col gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                {label}
            </span>

            <VehiclePhoto image={image} alt={alt} />
        </div>
    );
}

type Props = {
    trip: Trip;
}

export function TripPilotDocuments({ trip }: Props) {
    /** Sin piloto no hay papeles que pintar: el viaje sigue en la bolsa. */
    if (!trip.pilotId) return null;

    const pilot = trip.pilotName ?? "el piloto";
    /** Las dos van siempre juntas: mirar una basta para saber si hay documentos. */
    const hasDocuments = Boolean(trip.pilotDpiImage);

    return (
        <section className="mt-6 border-t border-line pt-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <h3 className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
                    Documentos del piloto
                </h3>

                {hasDocuments && (
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                        Anverso · sin vencimiento
                    </p>
                )}
            </div>

            {/*
              * El hueco es un estado normal, no un fallo: los pilotos que se
              * registraron antes de que el alta pidiera las fotos se quedaron sin
              * ellas y no hay forma de subirlas ahora.
              */}
            {hasDocuments ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Document
                        label="DPI"
                        image={trip.pilotDpiImage}
                        alt={`DPI de ${pilot}`}
                    />

                    <Document
                        label="Licencia"
                        image={trip.pilotLicenseImage}
                        alt={`Licencia de ${pilot}`}
                    />
                </div>
            ) : (
                <p className="mt-3 rounded-lg border border-dashed border-line-strong bg-canvas px-4 py-3 text-sm text-ink-muted">
                    Sin documentos registrados. Los sube el piloto al crear su cuenta y no
                    se pueden reemplazar desde la aplicación.
                </p>
            )}
        </section>
    );
}
