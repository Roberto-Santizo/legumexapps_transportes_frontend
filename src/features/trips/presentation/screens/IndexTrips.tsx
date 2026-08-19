import { CustomFilledButton, FadeInUp, Title } from "@/features/shared/shared";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * Puerta de entrada a `/viajes/crear`.
 *
 * El listado todavía no existe: `GET /trips` no está publicado y
 * `TripDatasourceImpl.getTrips` lanza `TRIP_NOT_IMPLEMENTED`. Por eso esta
 * pantalla no consulta nada —una `useQuery` solo pintaría el error y taparía
 * el botón—: declara el estado real y deja el camino al formulario abierto.
 * Cuando el recurso exista, aquí entran `useQuery`, `Table` y `Pagination`.
 */
export function IndexTrips() {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <Title
                    title="Viajes"
                    subtitle="De dónde sale cada viaje, a qué destino registrado va y por qué ruta."
                />

                <CustomFilledButton
                    label="Registrar viaje"
                    type="button"
                    icon={<Plus size={16} />}
                    onClick={() => navigate('/viajes/crear')}
                />
            </div>

            <FadeInUp>
                <div className="rounded-2xl border border-dashed border-line-strong bg-surface px-8 py-14 text-center">
                    <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                        Listado pendiente
                    </p>

                    <p className="mx-auto mt-3 max-w-[34ch] font-display text-xl font-semibold tracking-tight text-ink">
                        Los viajes registrados todavía no se pueden consultar.
                    </p>

                    <p className="mx-auto mt-2 max-w-[46ch] text-sm text-ink-muted">
                        El servidor aún no publica la consulta de viajes. Mientras tanto, desde
                        aquí se llega al formulario para trazar la ruta de uno nuevo.
                    </p>

                    <div className="mt-6 flex justify-center">
                        <CustomFilledButton
                            label="Registrar viaje"
                            type="button"
                            icon={<Plus size={16} />}
                            onClick={() => navigate('/viajes/crear')}
                        />
                    </div>
                </div>
            </FadeInUp>
        </div>
    );
}
