import {
    FINISHED_PRODUCT_ALREADY_DELETED_MESSAGE,
    FINISHED_PRODUCT_CLIENTS_LIMIT,
    FinishedProductAmount,
    FinishedProductCode,
    FinishedProductDeleteDialog,
    FinishedProductFilterBar,
    FinishedProductName,
    canWriteFinishedProducts,
    finishedProductProvider,
    toFinishedProductClientOptions,
    type FinishedProduct
} from "@/features/finished-products/finished-products";
import { clientProvider } from "@/features/clients/clients";
import { ActionsMenu, can, CustomFilledButton, ErrorComponent, FadeInUp, Pagination, Table, Tbody, Td, Th, Thead, Title, Tr, useNotification, usePagination } from "@/features/shared/shared";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { useState } from "react";
import type { RootState } from "@/config/store/store";

export function IndexFinishedProducts() {
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const { page, rowsPerPage } = usePagination(searchParams);

    const role = useSelector((state: RootState) => state.auth.user?.role);
    const canWrite = canWriteFinishedProducts(role);

    const search = searchParams.get('search') ?? '';
    const clientId = searchParams.get('clientId') ?? '';

    const [toDelete, setToDelete] = useState<FinishedProduct | null>(null);

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['getFinishedProducts', page, rowsPerPage, search, clientId],
        queryFn: () => finishedProductProvider.getFinishedProducts(rowsPerPage.toString(), page.toString(), { search, clientId })
    });

    /**
     * Para el filtro por cliente. `user` y `shipment` leen este catálogo pero no
     * `/clients` (403): a ellos no se les pide y el filtro queda sin opciones.
     */
    const { data: clients, isLoading: isLoadingClients } = useQuery({
        queryKey: ['getClients', FINISHED_PRODUCT_CLIENTS_LIMIT, '0', ''],
        queryFn: () => clientProvider.getClients(FINISHED_PRODUCT_CLIENTS_LIMIT, '0', {}),
        enabled: can(role, 'readCatalogs')
    });

    const { mutate, isPending } = useMutation({
        mutationFn: (id: string) => finishedProductProvider.deleteFinishedProductById(id),
        /** Borrado real: la fila no vuelve y el `total` deja de contarla. */
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getFinishedProducts'] });
            setToDelete(null);
        },
        /** «Ya fue eliminado» = tabla obsoleta: se recarga para quitar la fila fantasma. */
        onError: (err) => {
            notification.error(err.message);

            if (err.message.startsWith(FINISHED_PRODUCT_ALREADY_DELETED_MESSAGE)) {
                queryClient.invalidateQueries({ queryKey: ['getFinishedProducts'] });
            }

            setToDelete(null);
        }
    });

    if (isError) return <ErrorComponent message={error.message} />

    const finishedProducts = data?.data ?? [];
    const isFiltered = Boolean(search || clientId);

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <Title
                    title="Productos terminados"
                    subtitle="Las presentaciones empacadas de cada cliente, con su código de SKU y las cajas que caben en una tarima."
                />

                {canWrite && (
                    <CustomFilledButton
                        label="Agregar producto"
                        type="button"
                        icon={<Plus size={16} />}
                        onClick={() => navigate('/productos-terminados/crear')}
                    />
                )}
            </div>

            <FinishedProductFilterBar
                search={search}
                clientId={clientId}
                clientOptions={toFinishedProductClientOptions(clients?.data ?? [])}
                isLoadingClients={isLoadingClients}
                setSearchParams={setSearchParams}
            />

            {isLoading && (
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                    Cargando productos terminados
                </p>
            )}

            {!isLoading && finishedProducts.length === 0 && (
                <FadeInUp>
                    <div className="rounded-2xl border border-dashed border-line-strong bg-surface px-8 py-14 text-center">
                        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                            Sin registros
                        </p>

                        <p className="mx-auto mt-3 max-w-[34ch] font-display text-xl font-semibold tracking-tight text-ink">
                            {isFiltered
                                ? "Ningún producto coincide con los filtros."
                                : "El catálogo está vacío."}
                        </p>

                        <p className="mx-auto mt-2 max-w-[46ch] text-sm text-ink-muted">
                            {isFiltered
                                ? "Prueba con otra parte del código o del nombre, o con otro cliente."
                                : "Agrega el primer SKU con su cliente, presentación y cajas por tarima."}
                        </p>

                        {canWrite && !isFiltered && (
                            <div className="mt-6 flex justify-center">
                                <CustomFilledButton
                                    label="Agregar producto"
                                    type="button"
                                    icon={<Plus size={16} />}
                                    onClick={() => navigate('/productos-terminados/crear')}
                                />
                            </div>
                        )}
                    </div>
                </FadeInUp>
            )}

            {!isLoading && finishedProducts.length > 0 && (
                <FadeInUp>
                    <Table>
                        <Thead>
                            <Th text="Código" />
                            <Th text="Nombre" />
                            <Th text="Cliente" />
                            <Th text="Presentación" />
                            <Th text="Cajas / tarima" />
                            <Th text="" />
                        </Thead>

                        <Tbody>
                            {finishedProducts.map((finishedProduct) => (
                                <Tr key={finishedProduct.id}>
                                    <Td>
                                        <FinishedProductCode code={finishedProduct.code} />
                                    </Td>

                                    <Td>
                                        <FinishedProductName name={finishedProduct.name} />
                                    </Td>

                                    <Td>
                                        {finishedProduct.clientName ?? (
                                            <span className="text-ink-subtle">Sin cliente</span>
                                        )}
                                    </Td>

                                    <Td>
                                        <FinishedProductAmount value={finishedProduct.presentation} />
                                    </Td>

                                    <Td>
                                        <FinishedProductAmount value={finishedProduct.boxesPerPallet} />
                                    </Td>

                                    <Td className="text-right">
                                        <ActionsMenu
                                            items={[
                                                {
                                                    label: "Ver detalle",
                                                    icon: <Eye />,
                                                    onClick: () => navigate(`/productos-terminados/${finishedProduct.id}`)
                                                },
                                                ...(canWrite ? [
                                                    {
                                                        label: "Editar",
                                                        icon: <Pencil />,
                                                        onClick: () => navigate(`/productos-terminados/${finishedProduct.id}/editar`)
                                                    },
                                                    {
                                                        label: "Eliminar",
                                                        icon: <Trash2 />,
                                                        onClick: () => setToDelete(finishedProduct),
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

            <FinishedProductDeleteDialog
                finishedProduct={toDelete}
                isPending={isPending}
                onClose={() => setToDelete(null)}
                onConfirm={() => toDelete && mutate(toDelete.id.toString())}
            />
        </div>
    );
}
