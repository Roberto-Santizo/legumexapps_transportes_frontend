import { CustomFilledButton, ErrorComponent, FadeInUp, useNotification } from "@/features/shared/shared";
import { LocationMoment, LocationName, LocationPinPreview, LocationStatus, locationProvider } from "@/features/locations/locations";
import { Coins, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { FreightRatesModal } from "@/features/freight-rates/freight-rates";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { LocationPageHeader } from "@/features/locations/locations";
import { useState, type ReactNode } from "react";
import type { RootState } from "@/config/store/store";

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

export function ShowLocation() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();

    const [ratesModal, setRatesModal] = useState(false);

    const role = useSelector((state: RootState) => state.auth.user?.role);
    const canWrite = role === 'administrator';

    const { data: location, isLoading, isError, error } = useQuery({
        queryKey: ['getLocationById', id],
        queryFn: () => locationProvider.getLocationById(id!),
        enabled: Boolean(id)
    });

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['getLocations'] });
        queryClient.invalidateQueries({ queryKey: ['getLocationById', id] });
    };

    const { mutate: removeLocation } = useMutation({
        mutationFn: () => locationProvider.deleteLocationById(id!),
        onSuccess: (message) => {
            notification.success(message);
            invalidate();
            navigate('/ubicaciones');
        },
        onError: (err) => notification.error(err.message)
    });

    const { mutate: toggleLocation } = useMutation({
        mutationFn: () => locationProvider.toggleLocationStatusById(id!),
        onSuccess: (message) => {
            notification.success(message);
            invalidate();
        },
        onError: (err) => notification.error(err.message)
    });

    const askToDeactivate = () => {
        if (!location) return;

        notification.question(
            `Dar de baja ${location.name}`,
            "Dar de baja",
            "El destino deja de cotizar y sus tarifas dejan de poder editarse, pero no se borra: sigue en el listado y se puede reactivar.",
            () => removeLocation()
        );
    };

    if (isError) return <ErrorComponent message={error.message} />

    return (
        <div className="flex flex-col gap-8">
            <LocationPageHeader
                title="Detalle del destino"
                subtitle="A qué lugar apunta, dónde cae su pin y quién lo registró."
            >
                {location && (
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setRatesModal(true)}
                            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                        >
                            <Coins size={16} />
                            Tarifas de flete
                        </button>

                        {canWrite && (
                            <CustomFilledButton
                                label="Editar"
                                type="button"
                                icon={<Pencil size={16} />}
                                onClick={() => navigate(`/ubicaciones/${location.id}/editar`)}
                            />
                        )}

                        {canWrite && (location.status ? (
                            <button
                                type="button"
                                onClick={askToDeactivate}
                                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm font-medium text-danger transition-colors hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-danger/20"
                            >
                                <Trash2 size={16} />
                                Dar de baja
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => toggleLocation()}
                                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                            >
                                <RotateCcw size={16} />
                                Reactivar
                            </button>
                        ))}
                    </div>
                )}
            </LocationPageHeader>

            {isLoading && (
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                    Cargando destino
                </p>
            )}

            {!isLoading && location && (
                <FadeInUp>
                    <div className="flex max-w-5xl flex-col gap-6">
                        <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-4 bg-ink-deep px-7 py-6 text-canvas">
                                <div className="flex flex-col gap-2 p-5">
                                    <LocationName name={location.name} size="lg" />
                                </div>

                                <span className="font-mono text-[12px] text-canvas/70">
                                    {location.latitude}, {location.longitude}
                                </span>
                            </div>

                            <LocationPinPreview location={location} height="h-[24rem]" />
                        </div>

                        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8">
                            <div className="flex flex-wrap items-start justify-between gap-4 pb-4">
                                <p className="max-w-[60ch] text-sm text-ink-muted">
                                    {location.description ?? "Sin descripción."}
                                </p>

                                <LocationStatus status={location.status} />
                            </div>

                            <dl className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
                                <Field label="Registró">
                                    {location.registeredByName ?? '—'}
                                </Field>

                                <Field label="Fecha de registro">
                                    <LocationMoment value={location.createdAt} withTime />
                                </Field>

                                <Field label="Última actualización">
                                    <LocationMoment value={location.updatedAt} withTime />
                                </Field>
                            </dl>
                        </div>
                    </div>
                </FadeInUp>
            )}

            {location && (
                <FreightRatesModal
                    locationId={location.id}
                    locationName={location.name}
                    locationActive={location.status}
                    canWrite={canWrite}
                    modal={ratesModal}
                    closeModal={() => setRatesModal(false)}
                />
            )}
        </div>
    );
}
