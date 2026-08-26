import { CustomFilledButton, ErrorComponent, FadeInUp, useNotification } from "@/features/shared/shared";
import { DeparturePointMoment, DeparturePointName, DeparturePointPageHeader, DeparturePointPinPreview, DeparturePointStatus, departurePointProvider } from "@/features/departure-points/departure-points";
import { Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import type { ReactNode } from "react";
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

export function ShowDeparturePoint() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();

    const role = useSelector((state: RootState) => state.auth.user?.role);
    const canWrite = role === 'administrator';

    const { data: departurePoint, isLoading, isError, error } = useQuery({
        queryKey: ['getDeparturePointById', id],
        queryFn: () => departurePointProvider.getDeparturePointById(id!),
        enabled: Boolean(id)
    });

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['getDeparturePoints'] });
        queryClient.invalidateQueries({ queryKey: ['getDeparturePointById', id] });
    };

    const { mutate: removeDeparturePoint } = useMutation({
        mutationFn: () => departurePointProvider.deleteDeparturePointById(id!),
        onSuccess: (message) => {
            notification.success(message);
            invalidate();
            navigate('/puntos-de-partida');
        },
        onError: (err) => notification.error(err.message)
    });

    const { mutate: toggleDeparturePoint } = useMutation({
        mutationFn: () => departurePointProvider.toggleDeparturePointStatusById(id!),
        onSuccess: (message) => {
            notification.success(message);
            invalidate();
        },
        onError: (err) => notification.error(err.message)
    });

    const askToDeactivate = () => {
        if (!departurePoint) return;

        notification.question(
            `Dar de baja ${departurePoint.name}`,
            "Dar de baja",
            "El punto de partida deja de ofrecerse para registrar viajes, pero no se borra: sigue en el listado y se puede reactivar.",
            () => removeDeparturePoint()
        );
    };

    if (isError) return <ErrorComponent message={error.message} />

    return (
        <div className="flex flex-col gap-8">
            <DeparturePointPageHeader
                title="Detalle del punto de partida"
                subtitle="A qué lugar apunta, dónde cae su pin y quién lo registró."
            >
                {departurePoint && canWrite && (
                    <div className="flex flex-wrap items-center gap-2">
                        <CustomFilledButton
                            label="Editar"
                            type="button"
                            icon={<Pencil size={16} />}
                            onClick={() => navigate(`/puntos-de-partida/${departurePoint.id}/editar`)}
                        />

                        {departurePoint.status ? (
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
                                onClick={() => toggleDeparturePoint()}
                                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                            >
                                <RotateCcw size={16} />
                                Reactivar
                            </button>
                        )}
                    </div>
                )}
            </DeparturePointPageHeader>

            {isLoading && (
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                    Cargando punto de partida
                </p>
            )}

            {!isLoading && departurePoint && (
                <FadeInUp>
                    <div className="flex max-w-5xl flex-col gap-6">
                        <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-4 bg-ink-deep px-7 py-6 text-canvas">
                                <div className="flex flex-col gap-2 p-5">
                                    <DeparturePointName name={departurePoint.name} size="lg" />
                                </div>

                                <span className="font-mono text-[12px] text-canvas/70">
                                    {departurePoint.latitude}, {departurePoint.longitude}
                                </span>
                            </div>

                            <DeparturePointPinPreview departurePoint={departurePoint} height="h-[24rem]" />
                        </div>

                        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8">
                            <div className="flex flex-wrap items-start justify-between gap-4 pb-4">
                                <p className="max-w-[60ch] text-sm text-ink-muted">
                                    {departurePoint.description ?? "Sin descripción."}
                                </p>

                                <DeparturePointStatus status={departurePoint.status} />
                            </div>

                            <dl className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
                                <Field label="Registró">
                                    {departurePoint.registeredByName ?? '—'}
                                </Field>

                                <Field label="Fecha de registro">
                                    <DeparturePointMoment value={departurePoint.createdAt} withTime />
                                </Field>

                                <Field label="Última actualización">
                                    <DeparturePointMoment value={departurePoint.updatedAt} withTime />
                                </Field>
                            </dl>
                        </div>
                    </div>
                </FadeInUp>
            )}
        </div>
    );
}
