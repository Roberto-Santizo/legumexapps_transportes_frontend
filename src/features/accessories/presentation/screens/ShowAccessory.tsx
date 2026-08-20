import {
    AccessoryCode,
    AccessoryName,
    AccessoryPageHeader,
    AccessoryStatusTag,
    AccessoryValueRule,
    accessoryProvider,
    canWriteAccessories,
    formatAccessoryDate,
    formatAccessoryMoment,
    formatDepreciation,
    formatQuetzales
} from "@/features/accessories/accessories";
import { CustomFilledButton, ErrorComponent, FadeInUp, useNotification } from "@/features/shared/shared";
import { Pencil, Trash2 } from "lucide-react";
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

export function ShowAccessory() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();

    const role = useSelector((state: RootState) => state.auth.user?.role);
    const canWrite = canWriteAccessories(role);

    const { data: accessory, isLoading, isError, error } = useQuery({
        queryKey: ['getAccessoryById', id],
        queryFn: () => accessoryProvider.getAccessoryById(id!),
        enabled: Boolean(id)
    });

    const { mutate } = useMutation({
        mutationFn: () => accessoryProvider.deleteAccessoryById(id!),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getAccessories'] });
            queryClient.invalidateQueries({ queryKey: ['getAccessoryById', id] });
        },
        onError: (err) => notification.error(err.message)
    });

    const askToDeactivate = () => {
        if (!accessory) return;

        notification.question(
            `Dar de baja ${accessory.code}`,
            "Dar de baja",
            "El accesorio no se borra: queda como dado de baja, sigue en el inventario y su código no se puede volver a usar. Se reactiva desde la edición.",
            () => mutate()
        );
    };

    if (isError) return <ErrorComponent message={error.message} />

    return (
        <div className="flex flex-col gap-8">
            <AccessoryPageHeader
                title="Detalle del accesorio"
                subtitle="Lo que costó, lo que vale hoy y quién lo registró."
            >
                {accessory && canWrite && (
                    <div className="flex items-center gap-2">
                        <CustomFilledButton
                            label="Editar"
                            type="button"
                            icon={<Pencil size={16} />}
                            onClick={() => navigate(`/accesorios/${accessory.id}/editar`)}
                        />

                        {accessory.status !== 'inactive' && (
                            <button
                                type="button"
                                onClick={askToDeactivate}
                                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm font-medium text-danger transition-colors hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-danger/20"
                            >
                                <Trash2 size={16} />
                                Dar de baja
                            </button>
                        )}
                    </div>
                )}
            </AccessoryPageHeader>

            {isLoading && (
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                    Cargando accesorio
                </p>
            )}

            {!isLoading && accessory && (
                <FadeInUp>
                    <div className="max-w-4xl overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
                        <div className="grid lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
                            {/* La etiqueta física: el código manda, el nombre acompaña. */}
                            <div className="flex flex-col justify-center gap-3 bg-ink-deep px-7 py-9 text-canvas">
                                <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-canvas/50">
                                    Registro {accessory.id}
                                </span>

                                <AccessoryCode code={accessory.code} size="lg" />

                                <AccessoryName name={accessory.name} size="lg" />
                            </div>

                            <div className="flex flex-col gap-6 p-6 sm:p-8">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                                        Valor de hoy
                                    </span>

                                    <AccessoryStatusTag status={accessory.status} />
                                </div>

                                <AccessoryValueRule accessory={accessory} size="lg" />

                                <dl className="grid gap-x-8 sm:grid-cols-2">
                                    <Field label="Precio de compra">
                                        <span className="font-mono tabular-nums">
                                            {formatQuetzales(accessory.price)}
                                        </span>
                                    </Field>

                                    <Field label="Fecha de compra">
                                        <span className="font-mono">
                                            {formatAccessoryDate(accessory.purchaseDate)}
                                        </span>
                                    </Field>

                                    <Field label="Depreciación anual">
                                        <span className="font-mono tabular-nums">
                                            {formatDepreciation(accessory.annualDepreciation)}
                                        </span>
                                    </Field>

                                    <Field label="Registró">
                                        {accessory.registeredBy ?? "Sin registro"}
                                    </Field>

                                    <Field label="Capturado">
                                        <span className="font-mono text-[13px]">
                                            {accessory.createdAt
                                                ? formatAccessoryMoment(accessory.createdAt)
                                                : "Sin fecha"}
                                        </span>
                                    </Field>
                                </dl>

                                <div className="border-t border-line pt-3.5">
                                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                                        Descripción
                                    </p>

                                    <p className="mt-1.5 text-sm text-ink-muted">
                                        {accessory.description ?? "Sin descripción."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </FadeInUp>
            )}
        </div>
    );
}
