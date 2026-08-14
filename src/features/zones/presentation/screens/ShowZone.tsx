import type { RootState } from "@/config/store/store";
import {
    ZoneColorTag,
    ZoneMoment,
    ZoneName,
    ZonePageHeader,
    ZonePolygonPreview,
    ZoneStatus,
    formatLatLng,
    zoneProvider
} from "@/features/zones/zones";
import { CustomFilledButton, ErrorComponent, FadeInUp, useNotification } from "@/features/shared/shared";
import { Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import type { ReactNode } from "react";

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

export function ShowZone() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();

    const role = useSelector((state: RootState) => state.auth.user?.role);
    const canWrite = role === 'administrator';

    const { data: zone, isLoading, isError, error } = useQuery({
        queryKey: ['getZoneById', id],
        queryFn: () => zoneProvider.getZoneById(id!),
        enabled: Boolean(id)
    });

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['getZones'] });
        queryClient.invalidateQueries({ queryKey: ['getZoneById', id] });
    };

    const { mutate: removeZone } = useMutation({
        mutationFn: () => zoneProvider.deleteZoneById(id!),
        onSuccess: (message) => {
            notification.success(message);
            invalidate();
            navigate('/zonas');
        },
        onError: (err) => notification.error(err.message)
    });

    const { mutate: toggleZone } = useMutation({
        mutationFn: () => zoneProvider.toggleZoneStatusById(id!),
        onSuccess: (message) => {
            notification.success(message);
            invalidate();
        },
        onError: (err) => notification.error(err.message)
    });

    const askToDeactivate = () => {
        if (!zone) return;

        notification.question(
            `Dar de baja ${zone.name}`,
            "Dar de baja",
            "La zona deja de estar disponible, pero no se borra: sigue en el listado y se puede reactivar.",
            () => removeZone()
        );
    };

    if (isError) return <ErrorComponent message={error.message} />

    return (
        <div className="flex flex-col gap-8">
            <ZonePageHeader
                title="Detalle de la zona"
                subtitle="El territorio que cubre, cómo se pinta en el mapa y quién la registró."
            >
                {zone && canWrite && (
                    <div className="flex items-center gap-2">
                        <CustomFilledButton
                            label="Editar"
                            type="button"
                            icon={<Pencil size={16} />}
                            onClick={() => navigate(`/zonas/${zone.id}/editar`)}
                        />

                        {zone.status ? (
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
                                onClick={() => toggleZone()}
                                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                            >
                                <RotateCcw size={16} />
                                Reactivar
                            </button>
                        )}
                    </div>
                )}
            </ZonePageHeader>

            {isLoading && (
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                    Cargando zona
                </p>
            )}

            {!isLoading && zone && (
                <FadeInUp>
                    <div className="flex max-w-5xl flex-col gap-6">
                        <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-4 bg-ink-deep px-7 py-6 text-canvas">
                                <div className="flex flex-col gap-2">
                                    <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-canvas/50">
                                        Registro {zone.id}
                                    </span>

                                    <ZoneName name={zone.name} size="lg" />
                                </div>

                                <span
                                    className="h-10 w-10 rounded-full border border-canvas/20"
                                    style={{ backgroundColor: zone.color }}
                                    aria-hidden
                                />
                            </div>

                            <ZonePolygonPreview area={zone.area} color={zone.color} height="h-[24rem]" />
                        </div>

                        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8">
                            <div className="flex flex-wrap items-start justify-between gap-4 pb-4">
                                <p className="max-w-[60ch] text-sm text-ink-muted">
                                    {zone.description ?? "Sin descripción."}
                                </p>

                                <ZoneStatus status={zone.status} />
                            </div>

                            <dl className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
                                <Field label="Vértices del área">
                                    <span className="font-mono text-[13px]">{zone.area.length}</span>
                                </Field>

                                <Field label="Color en el mapa">
                                    <ZoneColorTag color={zone.color} />
                                </Field>

                                <Field label="Primer punto (lat, lng)">
                                    <span className="font-mono text-[13px]">
                                        {zone.area.length > 0 ? formatLatLng(zone.area[0]) : '—'}
                                    </span>
                                </Field>

                                <Field label="Registró">
                                    {zone.registeredByName ?? '—'}
                                </Field>

                                <Field label="Fecha de registro">
                                    <ZoneMoment value={zone.createdAt} withTime />
                                </Field>

                                <Field label="Última actualización">
                                    <ZoneMoment value={zone.updatedAt} withTime />
                                </Field>
                            </dl>
                        </div>
                    </div>
                </FadeInUp>
            )}
        </div>
    );
}
