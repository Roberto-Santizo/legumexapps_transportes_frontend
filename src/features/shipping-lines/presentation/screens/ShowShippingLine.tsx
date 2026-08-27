import {
    SHIPPING_LINE_ALREADY_DELETED_MESSAGE,
    ShippingLineDeleteDialog,
    ShippingLineMoment,
    ShippingLineName,
    ShippingLinePageHeader,
    canWriteShippingLines,
    shippingLineProvider
} from "@/features/shipping-lines/shipping-lines";
import { CustomFilledButton, ErrorComponent, FadeInUp, useNotification } from "@/features/shared/shared";
import { Pencil, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { useState, type ReactNode } from "react";
import type { RootState } from "@/config/config";

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

export function ShowShippingLine() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();

    const role = useSelector((state: RootState) => state.auth.user?.role);
    const canWrite = canWriteShippingLines(role);

    const [isDeleting, setIsDeleting] = useState(false);

    const { data: shippingLine, isLoading, isError, error } = useQuery({
        queryKey: ['getShippingLineById', id],
        queryFn: () => shippingLineProvider.getShippingLineById(id!),
        enabled: Boolean(id)
    });

    const { mutate, isPending } = useMutation({
        mutationFn: () => shippingLineProvider.deleteShippingLineById(id!),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getShippingLines'] });
            setIsDeleting(false);
            /** La ficha ya no se puede volver a abrir: el detalle respondería 404. */
            navigate('/navieras');
        },
        /**
         * Si responde «ya fue eliminada» la ficha abierta es un fantasma: otro
         * administrador se adelantó y este id ya no es alcanzable. Se vuelve al
         * listado en lugar de dejar en pantalla un detalle que no existe.
         */
        onError: (err) => {
            notification.error(err.message);
            setIsDeleting(false);

            if (err.message.startsWith(SHIPPING_LINE_ALREADY_DELETED_MESSAGE)) {
                queryClient.invalidateQueries({ queryKey: ['getShippingLines'] });
                navigate('/navieras');
            }
        }
    });

    /**
     * Una naviera eliminada responde 404 con el mismo mensaje que un id que
     * nunca existió, y desde este endpoint no hay forma de distinguirlos. Se
     * dice en pantalla para que nadie lo lea como un error de la aplicación.
     */
    if (isError) {
        return (
            <ErrorComponent
                message={`${error.message}. Una naviera eliminada responde igual que una que nunca se registró: en los dos casos deja de ser alcanzable.`}
            />
        );
    }

    return (
        <div className="flex flex-col gap-8">
            <ShippingLinePageHeader
                title="Detalle de la naviera"
                subtitle="Cómo quedó guardado el nombre y quién dio de alta la naviera."
            >
                {shippingLine && canWrite && (
                    <div className="flex items-center gap-2">
                        <CustomFilledButton
                            label="Editar"
                            type="button"
                            icon={<Pencil size={16} />}
                            onClick={() => navigate(`/navieras/${shippingLine.id}/editar`)}
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
            </ShippingLinePageHeader>

            {isLoading && (
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                    Cargando naviera
                </p>
            )}

            {!isLoading && shippingLine && (
                <FadeInUp>
                    <div className="max-w-4xl overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
                        <div className="grid lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
                            {/* El nombre es todo lo que hay: manda en la placa, sin nada que lo acompañe. */}
                            <div className="flex flex-col justify-center gap-3 bg-ink-deep px-7 py-9 text-canvas">
                                <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-canvas/50">
                                    Registro {shippingLine.id}
                                </span>

                                <ShippingLineName name={shippingLine.name} size="lg" />
                            </div>

                            <div className="flex flex-col gap-6 p-6 sm:p-8">
                                <dl className="grid gap-x-8 sm:grid-cols-2">
                                    <Field label="Registró">
                                        {shippingLine.registeredByName ?? (
                                            <span className="text-ink-subtle">Sin registro</span>
                                        )}
                                    </Field>

                                    <Field label="Fecha de alta">
                                        <ShippingLineMoment value={shippingLine.createdAt} withTime />
                                    </Field>

                                    <Field label="Última actualización">
                                        <ShippingLineMoment value={shippingLine.updatedAt} withTime />
                                    </Field>
                                </dl>

                                <p className="text-sm text-ink-muted">
                                    La naviera no se relaciona con puertos, tarifas ni viajes: es un
                                    dato de catálogo. Editar el nombre pisa el valor anterior sin
                                    dejar historial, y eliminarla lo deja ocupado para siempre.
                                </p>
                            </div>
                        </div>
                    </div>
                </FadeInUp>
            )}

            <ShippingLineDeleteDialog
                shippingLine={isDeleting ? shippingLine ?? null : null}
                isPending={isPending}
                onClose={() => setIsDeleting(false)}
                onConfirm={() => mutate()}
            />
        </div>
    );
}
