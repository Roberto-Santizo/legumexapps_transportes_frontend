import {
    CLIENT_ALREADY_DELETED_MESSAGE,
    ClientCode,
    ClientDeleteDialog,
    ClientMoment,
    ClientName,
    ClientSearchBar,
    canWriteClients,
    clientProvider,
    type Client
} from "@/features/clients/clients";
import { ActionsMenu, CustomFilledButton, ErrorComponent, FadeInUp, Pagination, Table, Tbody, Td, Th, Thead, Title, Tr, useNotification, usePagination } from "@/features/shared/shared";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { useState } from "react";
import type { RootState } from "@/config/store/store";

export function IndexClients() {
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const { page, rowsPerPage } = usePagination(searchParams);

    const role = useSelector((state: RootState) => state.auth.user?.role);
    /** Los cuatro roles leen el catálogo; solo `administrator` lo mantiene. */
    const canWrite = canWriteClients(role);

    const search = searchParams.get('search') ?? '';

    /** El cliente pendiente de confirmar el borrado, o `null` sin diálogo abierto. */
    const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['getClients', page, rowsPerPage, search],
        queryFn: () => clientProvider.getClients(rowsPerPage.toString(), page.toString(), { search })
    });

    const { mutate, isPending } = useMutation({
        mutationFn: (id: string) => clientProvider.deleteClientById(id),
        /**
         * El borrado es real: la fila no vuelve en el siguiente listado y el
         * `total` deja de contarla, así que basta con recargar la consulta.
         */
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getClients'] });
            setClientToDelete(null);
        },
        /**
         * El 400 «El cliente ya fue eliminado» solo pasa con una tabla obsoleta
         * —alguien lo borró antes—, así que se recarga para que la fila fantasma
         * desaparezca. Un 404 es otra cosa: el id nunca existió.
         */
        onError: (err) => {
            notification.error(err.message);

            if (err.message.startsWith(CLIENT_ALREADY_DELETED_MESSAGE)) {
                queryClient.invalidateQueries({ queryKey: ['getClients'] });
            }

            setClientToDelete(null);
        }
    });

    if (isError) return <ErrorComponent message={error.message} />

    const clients = data?.data ?? [];
    const isFiltered = Boolean(search);

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <Title
                    title="Clientes"
                    subtitle="Las empresas a las que Legumex presta servicio. Cada una se identifica por el código que trae de su facturación."
                />

                {canWrite && (
                    <CustomFilledButton
                        label="Agregar cliente"
                        type="button"
                        icon={<Plus size={16} />}
                        onClick={() => navigate('/clientes/crear')}
                    />
                )}
            </div>

            <ClientSearchBar search={search} setSearchParams={setSearchParams} />

            {isLoading && (
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                    Cargando clientes
                </p>
            )}

            {!isLoading && clients.length === 0 && (
                <FadeInUp>
                    <div className="rounded-2xl border border-dashed border-line-strong bg-surface px-8 py-14 text-center">
                        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                            Sin registros
                        </p>

                        <p className="mx-auto mt-3 max-w-[34ch] font-display text-xl font-semibold tracking-tight text-ink">
                            {isFiltered
                                ? "Ningún cliente coincide con la búsqueda."
                                : "El catálogo está vacío."}
                        </p>

                        <p className="mx-auto mt-2 max-w-[46ch] text-sm text-ink-muted">
                            {isFiltered
                                ? "Prueba con otra parte del código o de la razón social."
                                : "Agrega el primer cliente con el código y la razón social que usa su facturación."}
                        </p>

                        {canWrite && !isFiltered && (
                            <div className="mt-6 flex justify-center">
                                <CustomFilledButton
                                    label="Agregar cliente"
                                    type="button"
                                    icon={<Plus size={16} />}
                                    onClick={() => navigate('/clientes/crear')}
                                />
                            </div>
                        )}
                    </div>
                </FadeInUp>
            )}

            {!isLoading && clients.length > 0 && (
                <FadeInUp>
                    <Table>
                        <Thead>
                            <Th text="Código" />
                            <Th text="Razón social" />
                            <Th text="Registró" />
                            <Th text="Alta" />
                            <Th text="" />
                        </Thead>

                        <Tbody>
                            {clients.map((client) => (
                                <Tr key={client.id}>
                                    <Td>
                                        <ClientCode code={client.code} />
                                    </Td>

                                    <Td>
                                        <ClientName name={client.name} />
                                    </Td>

                                    <Td>
                                        {client.registeredByName ?? (
                                            <span className="text-ink-subtle">Sin registro</span>
                                        )}
                                    </Td>

                                    <Td>
                                        <ClientMoment value={client.createdAt} />
                                    </Td>

                                    <Td className="text-right">
                                        <ActionsMenu
                                            items={[
                                                {
                                                    label: "Ver detalle",
                                                    icon: <Eye />,
                                                    onClick: () => navigate(`/clientes/${client.id}`)
                                                },
                                                ...(canWrite ? [
                                                    {
                                                        label: "Editar",
                                                        icon: <Pencil />,
                                                        onClick: () => navigate(`/clientes/${client.id}/editar`)
                                                    },
                                                    {
                                                        label: "Eliminar",
                                                        icon: <Trash2 />,
                                                        onClick: () => setClientToDelete(client),
                                                        danger: true
                                                    }
                                                ] : [])
                                            ]}
                                        />
                                    </Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>

                    <Pagination
                        page={page}
                        rowsPerPage={rowsPerPage}
                        count={data?.total ?? 0}
                        setSearchParams={setSearchParams}
                    />
                </FadeInUp>
            )}

            <ClientDeleteDialog
                client={clientToDelete}
                isPending={isPending}
                onClose={() => setClientToDelete(null)}
                onConfirm={() => clientToDelete && mutate(clientToDelete.id.toString())}
            />
        </div>
    );
}
