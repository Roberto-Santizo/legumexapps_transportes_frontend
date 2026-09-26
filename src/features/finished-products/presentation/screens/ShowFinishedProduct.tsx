import {
    FINISHED_PRODUCT_ALREADY_DELETED_MESSAGE,
    FinishedProductAmount,
    FinishedProductCode,
    FinishedProductDeleteDialog,
    FinishedProductMoment,
    FinishedProductName,
    FinishedProductPageHeader,
    canWriteFinishedProducts,
    finishedProductProvider
} from "@/features/finished-products/finished-products";
import { CustomFilledButton, ErrorComponent, FadeInUp, useNotification } from "@/features/shared/shared";
import { Pencil, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { useState, type ReactNode } from "react";
import type { RootState } from "@/config/store/store";

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="border-t border-line py-3.5">
            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                {label}
            </dt>
            <dd className="mt-1.5 text-sm text-ink">{children}</dd>
        </div>
    );
}

export function ShowFinishedProduct() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();

    const role = useSelector((state: RootState) => state.auth.user?.role);
    const canWrite = canWriteFinishedProducts(role);

    const [isDeleting, setIsDeleting] = useState(false);

    const { data: finishedProduct, isLoading, isError, error } = useQuery({
        queryKey: ['getFinishedProductById', id],
        queryFn: () => finishedProductProvider.getFinishedProductById(id!),
        enabled: Boolean(id)
    });

    const { mutate, isPending } = useMutation({
        mutationFn: () => finishedProductProvider.deleteFinishedProductById(id!),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getFinishedProducts'] });
            setIsDeleting(false);
            /** El detalle ya respondería 404. */
            navigate('/productos-terminados');
        },
        onError: (err) => {
            notification.error(err.message);
            setIsDeleting(false);

            if (err.message.startsWith(FINISHED_PRODUCT_ALREADY_DELETED_MESSAGE)) {
                queryClient.invalidateQueries({ queryKey: ['getFinishedProducts'] });
                navigate('/productos-terminados');
            }
        }
    });

    /** Un SKU eliminado responde 404 igual que uno que nunca existió. */
    if (isError) {
        return (
            <ErrorComponent
                message={`${error.message}. Un producto eliminado responde igual que uno que nunca se registró: en los dos casos deja de ser alcanzable.`}
            />
        );
    }

    return (
        <div className="flex flex-col gap-8">
            <FinishedProductPageHeader
                title="Detalle del producto terminado"
                subtitle="Cómo quedó guardado el SKU, de qué cliente es y quién lo dio de alta."
            >
                {finishedProduct && canWrite && (
                    <div className="flex items-center gap-2">
                        <CustomFilledButton
                            label="Editar"
                            type="button"
                            icon={<Pencil size={16} />}
                            onClick={() => navigate(`/productos-terminados/${finishedProduct.id}/editar`)}
                        />

                        <button
                            type="button"
                            onClick={() => setIsDeleting(true)}
                            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm font-medium text-danger transition-colors hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-danger/20"
                        >
                            <Trash2 size={16} />
                            Eliminar
                        </button>
                    </div>
                )}
            </FinishedProductPageHeader>

            {isLoading && (
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                    Cargando producto terminado
                </p>
            )}

            {!isLoading && finishedProduct && (
                <FadeInUp>
                    <div className="max-w-4xl overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
                        <div className="grid lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
                            {/* La placa se lee como la etiqueta de la caja: SKU, nombre y las dos cantidades de empaque. */}
                            <div className="flex flex-col justify-center gap-3 bg-ink-deep px-7 py-9 text-canvas">
                                <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-canvas/50">
                                    {finishedProduct.clientName ?? `Cliente ${finishedProduct.clientId}`}
                                </span>

                                <FinishedProductCode code={finishedProduct.code} size="lg" />

                                <FinishedProductName name={finishedProduct.name} size="lg" />

                                <div className="mt-3 grid grid-cols-2 gap-3 border-t border-canvas/15 pt-4">
                                    <div className="flex flex-col gap-1">
                                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-canvas/50">
                                            Presentación
                                        </span>
                                        <span className="font-mono text-lg tabular-nums">
                                            {finishedProduct.presentation}
                                        </span>
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-canvas/50">
                                            Cajas / tarima
                                        </span>
                                        <span className="font-mono text-lg tabular-nums">
                                            {finishedProduct.boxesPerPallet}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-6 p-6 sm:p-8">
                                <dl className="grid gap-x-8 sm:grid-cols-2">
                                    <Field label="Cliente">
                                        {finishedProduct.clientName ?? (
                                            <span className="text-ink-subtle">Sin nombre</span>
                                        )}
                                    </Field>

                                    <Field label="Presentación">
                                        <FinishedProductAmount value={finishedProduct.presentation} />
                                    </Field>

                                    <Field label="Cajas por tarima">
                                        <FinishedProductAmount value={finishedProduct.boxesPerPallet} />
                                    </Field>

                                    <Field label="Registró">
                                        {finishedProduct.registeredByName ?? (
                                            <span className="text-ink-subtle">Sin registro</span>
                                        )}
                                    </Field>

                                    <Field label="Fecha de alta">
                                        <FinishedProductMoment value={finishedProduct.createdAt} withTime />
                                    </Field>

                                    <Field label="Última actualización">
                                        <FinishedProductMoment value={finishedProduct.updatedAt} withTime />
                                    </Field>
                                </dl>

                                <p className="text-sm text-ink-muted">
                                    El cliente se muestra aunque ya haya sido eliminado del catálogo
                                    de clientes: borrarlo no afecta a sus productos terminados.
                                </p>
                            </div>
                        </div>
                    </div>
                </FadeInUp>
            )}

            <FinishedProductDeleteDialog
                finishedProduct={isDeleting ? finishedProduct ?? null : null}
                isPending={isPending}
                onClose={() => setIsDeleting(false)}
                onConfirm={() => mutate()}
            />
        </div>
    );
}
