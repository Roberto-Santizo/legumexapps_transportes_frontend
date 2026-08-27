import {
    CLIENT_ALREADY_DELETED_MESSAGE,
    ClientCode,
    ClientDeleteDialog,
    ClientMoment,
    ClientName,
    ClientPageHeader,
    canWriteClients,
    clientProvider
} from "@/features/clients/clients";
import { CustomFilledButton, ErrorComponent, FadeInUp, useNotification } from "@/features/shared/shared";
import { Pencil, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
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

export function ShowClient() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();

    const role = useSelector((state: RootState) => state.auth.user?.role);
    const canWrite = canWriteClients(role);

    const [isDeleting, setIsDeleting] = useState(false);

    const { data: client, isLoading, isError, error } = useQuery({
        queryKey: ['getClientById', id],
        queryFn: () => clientProvider.getClientById(id!),
        enabled: Boolean(id)
    });

    const { mutate, isPending } = useMutation({
        mutationFn: () => clientProvider.deleteClientById(id!),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getClients'] });
            setIsDeleting(false);
            /** La ficha ya no se puede volver a abrir: el detalle respondería 404. */
            navigate('/clientes');
        },
        /**
         * Si responde «ya fue eliminado» la ficha abierta es un fantasma: otro
         * administrador se adelantó y este id ya no es alcanzable. Se vuelve al
         * listado en lugar de dejar en pantalla un detalle que no existe.
         */
        onError: (err) => {
            notification.error(err.message);
            setIsDeleting(false);

            if (err.message.startsWith(CLIENT_ALREADY_DELETED_MESSAGE)) {
                queryClient.invalidateQueries({ queryKey: ['getClients'] });
                navigate('/clientes');
            }
        }
    });

    /**
     * Un cliente eliminado responde 404 con el mismo mensaje que un id que
     * nunca existió, y desde este endpoint no hay forma de distinguirlos. Se
     * dice en pantalla para que nadie lo lea como un error de la aplicación.
     */
    if (isError) {
        return (
            <ErrorComponent
                message={`${error.message}. Un cliente eliminado responde igual que uno que nunca se registró: en los dos casos deja de ser alcanzable.`}
            />
        );
    }

    return (
        <div className="flex flex-col gap-8">
            <ClientPageHeader
                title="Detalle del cliente"
                subtitle="Cómo quedó guardado el cliente y quién lo dio de alta."
            >
                {client && canWrite && (
                    <div className="flex items-center gap-2">
                        <CustomFilledButton
                            label="Editar"
                            type="button"
                            icon={<Pencil size={16} />}
                            onClick={() => navigate(`/clientes/${client.id}/editar`)}
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
            </ClientPageHeader>

            {isLoading && (
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                    Cargando cliente
                </p>
            )}

            {!isLoading && client && (
                <FadeInUp>
                    <div className="max-w-4xl overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
                        <div className="grid lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
                            {/* El código es la referencia externa por la que se busca al cliente: manda en la placa. */}
                            <div className="flex flex-col justify-center gap-3 bg-ink-deep px-7 py-9 text-canvas">
                                <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-canvas/50">
                                    Registro {client.id}
                                </span>

                                <ClientCode code={client.code} size="lg" />

                                <ClientName name={client.name} size="lg" />
                            </div>

                            <div className="flex flex-col gap-6 p-6 sm:p-8">
                                <dl className="grid gap-x-8 sm:grid-cols-2">
                                    <Field label="Registró">
                                        {client.registeredByName ?? (
                                            <span className="text-ink-subtle">Sin registro</span>
                                        )}
                                    </Field>

                                    <Field label="Fecha de alta">
                                        <ClientMoment value={client.createdAt} withTime />
                                    </Field>

                                    <Field label="Última actualización">
                                        <ClientMoment value={client.updatedAt} withTime />
                                    </Field>
                                </dl>

                                <p className="text-sm text-ink-muted">
                                    El cliente no se relaciona con tarifas, cotizaciones ni viajes:
                                    es un dato de catálogo. Editarlo pisa el valor anterior sin
                                    dejar historial.
                                </p>
                            </div>
                        </div>
                    </div>
                </FadeInUp>
            )}

            <ClientDeleteDialog
                client={isDeleting ? client ?? null : null}
                isPending={isPending}
                onClose={() => setIsDeleting(false)}
                onConfirm={() => mutate()}
            />
        </div>
    );
}
