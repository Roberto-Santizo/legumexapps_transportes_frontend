import {
    SHIPPING_LINE_ALREADY_DELETED_MESSAGE,
    ShippingLineDeleteDialog,
    ShippingLineMoment,
    ShippingLineName,
    ShippingLineSearchBar,
    canWriteShippingLines,
    shippingLineProvider,
    type ShippingLine
} from "@/features/shipping-lines/shipping-lines";
import { ActionsMenu, CustomFilledButton, ErrorComponent, FadeInUp, Pagination, Table, Tbody, Td, Th, Thead, Title, Tr, useNotification, usePagination } from "@/features/shared/shared";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { useState } from "react";
import type { RootState } from "@/config/config";

export function IndexShippingLines() {
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const { page, rowsPerPage } = usePagination(searchParams);

    const role = useSelector((state: RootState) => state.auth.user?.role);
    /** Los cuatro roles leen el catálogo; solo `administrator` lo mantiene. */
    const canWrite = canWriteShippingLines(role);

    const search = searchParams.get('search') ?? '';

    /** La naviera pendiente de confirmar el borrado, o `null` sin diálogo abierto. */
    const [shippingLineToDelete, setShippingLineToDelete] = useState<ShippingLine | null>(null);

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['getShippingLines', page, rowsPerPage, search],
        queryFn: () => shippingLineProvider.getShippingLines(rowsPerPage.toString(), page.toString(), { search })
    });

    const { mutate, isPending } = useMutation({
        mutationFn: (id: string) => shippingLineProvider.deleteShippingLineById(id),
        /**
         * El borrado es real: la fila no vuelve en el siguiente listado y el
         * `total` deja de contarla, así que basta con recargar la consulta.
         */
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getShippingLines'] });
            setShippingLineToDelete(null);
        },
        /**
         * El 400 «La naviera ya fue eliminada» solo pasa con una tabla obsoleta
         * —alguien la borró antes—, así que se recarga para que la fila fantasma
         * desaparezca. Un 404 es otra cosa: el id nunca existió.
         */
        onError: (err) => {
            notification.error(err.message);

            if (err.message.startsWith(SHIPPING_LINE_ALREADY_DELETED_MESSAGE)) {
                queryClient.invalidateQueries({ queryKey: ['getShippingLines'] });
            }

            setShippingLineToDelete(null);
        }
    });

    if (isError) return <ErrorComponent message={error.message} />

    const shippingLines = data?.data ?? [];
    const isFiltered = Boolean(search);

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <Title
                    title="Navieras"
                    subtitle="El catálogo de navieras con las que se opera. Cada una es solo un nombre, y ese nombre no se repite."
                />

                {canWrite && (
                    <CustomFilledButton
                        label="Agregar naviera"
                        type="button"
                        icon={<Plus size={16} />}
                        onClick={() => navigate('/navieras/crear')}
                    />
                )}
            </div>

            <ShippingLineSearchBar search={search} setSearchParams={setSearchParams} />

            {isLoading && (
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                    Cargando navieras
                </p>
            )}

            {!isLoading && shippingLines.length === 0 && (
                <FadeInUp>
                    <div className="rounded-2xl border border-dashed border-line-strong bg-surface px-8 py-14 text-center">
                        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                            Sin registros
                        </p>

                        <p className="mx-auto mt-3 max-w-[34ch] font-display text-xl font-semibold tracking-tight text-ink">
                            {isFiltered
                                ? "Ninguna naviera coincide con la búsqueda."
                                : "El catálogo está vacío."}
                        </p>

                        <p className="mx-auto mt-2 max-w-[46ch] text-sm text-ink-muted">
                            {isFiltered
                                ? "Prueba con otra parte del nombre antes de darla de alta: puede estar escrita de otra forma."
                                : "Agrega la primera naviera con el nombre comercial con el que se le factura."}
                        </p>

                        {canWrite && !isFiltered && (
                            <div className="mt-6 flex justify-center">
                                <CustomFilledButton
                                    label="Agregar naviera"
                                    type="button"
                                    icon={<Plus size={16} />}
                                    onClick={() => navigate('/navieras/crear')}
                                />
                            </div>
                        )}
                    </div>
                </FadeInUp>
            )}

            {!isLoading && shippingLines.length > 0 && (
                <FadeInUp>
                    <Table>
                        <Thead>
                            <Th text="Naviera" />
                            <Th text="Registró" />
                            <Th text="Alta" />
                            <Th text="" />
                        </Thead>

                        <Tbody>
                            {shippingLines.map((shippingLine) => (
                                <Tr key={shippingLine.id}>
                                    <Td>
                                        <ShippingLineName name={shippingLine.name} />
                                    </Td>

                                    <Td>
                                        {shippingLine.registeredByName ?? (
                                            <span className="text-ink-subtle">Sin registro</span>
                                        )}
                                    </Td>

                                    <Td>
                                        <ShippingLineMoment value={shippingLine.createdAt} />
                                    </Td>

                                    <Td className="text-right">
                                        <ActionsMenu
                                            items={[
                                                {
                                                    label: "Ver detalle",
                                                    icon: <Eye />,
                                                    onClick: () => navigate(`/navieras/${shippingLine.id}`)
                                                },
                                                ...(canWrite ? [
                                                    {
                                                        label: "Editar",
                                                        icon: <Pencil />,
                                                        onClick: () => navigate(`/navieras/${shippingLine.id}/editar`)
                                                    },
                                                    {
                                                        label: "Eliminar",
                                                        icon: <Trash2 />,
                                                        onClick: () => setShippingLineToDelete(shippingLine),
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

            <ShippingLineDeleteDialog
                shippingLine={shippingLineToDelete}
                isPending={isPending}
                onClose={() => setShippingLineToDelete(null)}
                onConfirm={() => shippingLineToDelete && mutate(shippingLineToDelete.id.toString())}
            />
        </div>
    );
}
