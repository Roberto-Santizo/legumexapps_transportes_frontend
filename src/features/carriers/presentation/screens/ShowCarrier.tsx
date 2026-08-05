import { CarrierCodeStamp, CarrierMonogram, CarrierPageHeader, CarrierStatus, carrierProvider } from "@/features/carriers/carriers";
import { CustomFilledButton, ErrorComponent, FadeInUp, useNotification } from "@/features/shared/shared";
import { Pencil, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import type { ReactNode } from "react";

type FieldProps = {
    label: string;
    children: ReactNode;
}

function Field({ label, children }: FieldProps) {
    return (
        <div className="border-t border-line py-4">
            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                {label}
            </dt>
            <dd className="mt-2 text-sm text-ink">{children}</dd>
        </div>
    );
}

export function ShowCarrier() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();

    const { data: carrier, isLoading, isError, error } = useQuery({
        queryKey: ['getCarrierById', id],
        queryFn: () => carrierProvider.getCarrierById(id!),
        enabled: Boolean(id)
    });

    const { mutate } = useMutation({
        mutationFn: () => carrierProvider.deleteCarrierById(id!),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getCarriers'] });
            navigate('/transportistas');
        },
        onError: (err) => notification.error(err.message)
    });

    const askToDelete = () => {
        if (!carrier) return;

        notification.question(
            `Eliminar ${carrier.name}`,
            "Eliminar",
            "Los viajes y las unidades de este transportista se quedan sin a quién asignarse.",
            () => mutate()
        );
    };

    if (isError) return <ErrorComponent message={error.message} />

    return (
        <div className="flex flex-col gap-8">
            <CarrierPageHeader
                title="Detalle del transportista"
                subtitle="Datos registrados de este transportista."
            >
                {carrier && (
                    <div className="flex items-center gap-2">
                        <CustomFilledButton
                            label="Editar"
                            type="button"
                            icon={<Pencil size={16} />}
                            onClick={() => navigate(`/transportistas/${carrier.id}/editar`)}
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
            </CarrierPageHeader>

            {isLoading && (
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                    Cargando transportista
                </p>
            )}

            {!isLoading && carrier && (
                <FadeInUp>
                    <div className="max-w-2xl rounded-2xl border border-line bg-surface p-8 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-5">
                            <div className="flex items-center gap-4">
                                <CarrierMonogram name={carrier.name} size="lg" />

                                <div>
                                    <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
                                        {carrier.name}
                                    </h2>
                                    <div className="mt-1">
                                        <CarrierStatus active={carrier.active} />
                                    </div>
                                </div>
                            </div>

                            <CarrierCodeStamp code={carrier.code} size="lg" />
                        </div>

                        <dl className="mt-8">
                            <Field label="Identificador">
                                <span className="font-mono">{carrier.id}</span>
                            </Field>

                            <Field label="Nombre">
                                {carrier.name}
                            </Field>

                            <Field label="Código">
                                <span className="font-mono uppercase tracking-[0.18em]">{carrier.code}</span>
                            </Field>

                            <Field label="Estado">
                                {carrier.active ? "Activo" : "Inactivo"}
                            </Field>

                            <Field label="Imagen">
                                <span className="font-mono break-all">{carrier.image}</span>
                            </Field>
                        </dl>
                    </div>
                </FadeInUp>
            )}
        </div>
    );
}
