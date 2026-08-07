import { VehicleCapacity, VehiclePageHeader, VehiclePhoto, VehiclePlate, VehicleStatus, VehicleTypeTag, vehicleProvider } from "@/features/vehicles/vehicles";
import { CustomFilledButton, ErrorComponent, FadeInUp, useNotification } from "@/features/shared/shared";
import { Pencil, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import type { ReactNode } from "react";

type SectionProps = {
    title: string;
    children: ReactNode;
}

/** Los datos se agrupan por para qué sirven: la ficha técnica describe la unidad, la asignación dice de quién es. */
function Section({ title, children }: SectionProps) {
    return (
        <section className="flex flex-col gap-1">
            <h3 className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
                {title}
            </h3>

            <dl className="grid gap-x-8 sm:grid-cols-2">
                {children}
            </dl>
        </section>
    );
}

type FieldProps = {
    label: string;
    children: ReactNode;
}

function Field({ label, children }: FieldProps) {
    return (
        <div className="border-t border-line py-3.5">
            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                {label}
            </dt>
            <dd className="mt-1.5 text-sm text-ink">{children}</dd>
        </div>
    );
}

export function ShowVehicle() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();

    const { data: vehicle, isLoading, isError, error } = useQuery({
        queryKey: ['getVehicleById', id],
        queryFn: () => vehicleProvider.getVehicleById(id!),
        enabled: Boolean(id)
    });

    const { mutate } = useMutation({
        mutationFn: () => vehicleProvider.deleteVehicleById(id!),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getVehicles'] });
            navigate('/vehiculos');
        },
        onError: (err) => notification.error(err.message)
    });

    const askToDelete = () => {
        if (!vehicle) return;

        notification.question(
            `Eliminar ${vehicle.plate}`,
            "Eliminar",
            "Los viajes que tengan asignada esta unidad se quedan sin vehículo.",
            () => mutate()
        );
    };

    if (isError) return <ErrorComponent message={error.message} />

    return (
        <div className="flex flex-col gap-8">
            <VehiclePageHeader
                title="Detalle del vehículo"
                subtitle="Datos registrados de esta unidad."
            >
                {vehicle && (
                    <div className="flex items-center gap-2">
                        <CustomFilledButton
                            label="Editar"
                            type="button"
                            icon={<Pencil size={16} />}
                            onClick={() => navigate(`/vehiculos/${vehicle.id}/editar`)}
                        />

                        <button
                            type="button"
                            onClick={askToDelete}
                            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm font-medium text-danger transition-colors hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-danger/20"
                        >
                            <Trash2 size={16} />
                            Eliminar
                        </button>
                    </div>
                )}
            </VehiclePageHeader>

            {isLoading && (
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                    Cargando vehículo
                </p>
            )}

            {!isLoading && vehicle && (
                <FadeInUp>
                    <div className="max-w-4xl overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
                        <div className="grid lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
                            {/* La unidad se reconoce por foto y placa: van juntas y separadas del resto de la ficha. */}
                            <div className="flex flex-col gap-5 border-b border-line bg-canvas/40 p-6 lg:border-b-0 lg:border-r">
                                <VehiclePhoto
                                    image={vehicle.image}
                                    alt={`Vehículo ${vehicle.plate}`}
                                    plate={vehicle.plate}
                                />

                                <div className="flex justify-center">
                                    <VehiclePlate plate={vehicle.plate} size="lg" />
                                </div>
                            </div>

                            <div className="flex flex-col gap-8 p-6 sm:p-8">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div>
                                        <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
                                            {vehicle.brand} {vehicle.model}
                                        </h2>

                                        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-subtle">
                                            Unidad {vehicle.id}
                                        </p>
                                    </div>

                                    <VehicleStatus status={vehicle.status} />
                                </div>

                                <Section title="Ficha técnica">
                                    <Field label="Marca">
                                        {vehicle.brand}
                                    </Field>

                                    <Field label="Modelo">
                                        {vehicle.model}
                                    </Field>

                                    <Field label="Año">
                                        <span className="font-mono">{vehicle.year}</span>
                                    </Field>

                                    <Field label="Tipo">
                                        <VehicleTypeTag type={vehicle.type} />
                                    </Field>

                                    <Field label="Capacidad">
                                        <VehicleCapacity capacity={vehicle.capacity} />
                                    </Field>
                                </Section>

                                <Section title="Asignación">
                                    <Field label="Transportista">
                                        {vehicle.carrierName}
                                    </Field>
                                </Section>
                            </div>
                        </div>
                    </div>
                </FadeInUp>
            )}
        </div>
    );
}
