import {
    AccessoryCode,
    AccessoryFiltersBar,
    AccessoryMoney,
    AccessoryName,
    AccessoryStatusTag,
    AccessoryValueRule,
    accessoryProvider,
    canWriteAccessories,
    formatAccessoryDate,
    type Accessory
} from "@/features/accessories/accessories";
import { ActionsMenu, CustomFilledButton, ErrorComponent, FadeInUp, Pagination, Table, Tbody, Td, Th, Thead, Title, Tr, useNotification, usePagination } from "@/features/shared/shared";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@/config/store/store";

export function IndexAccessories() {
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const { page, rowsPerPage } = usePagination(searchParams);

    const role = useSelector((state: RootState) => state.auth.user?.role);
    /** Leer lo puede cualquiera; el alta, la edición y la baja son de `administrator`. */
    const canWrite = canWriteAccessories(role);

    const status = searchParams.get('status') ?? '';
    const search = searchParams.get('search') ?? '';

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['getAccessories', page, rowsPerPage, status, search],
        queryFn: () => accessoryProvider.getAccessories(rowsPerPage.toString(), page.toString(), {
            status,
            search
        })
    });

    const { mutate } = useMutation({
        mutationFn: (id: string) => accessoryProvider.deleteAccessoryById(id),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getAccessories'] });
        },
        onError: (err) => notification.error(err.message)
    });

    /**
     * No borra: el accesorio pasa a «Dado de baja» y sigue en el listado, con su
     * código ocupado para siempre. Se dice así para que nadie espere que la fila
     * desaparezca.
     */
    const askToDeactivate = (accessory: Accessory) => {
        notification.question(
            `Dar de baja ${accessory.code}`,
            "Dar de baja",
            "El accesorio no se borra: queda como dado de baja, sigue en el listado y su código no se puede volver a usar. Se reactiva desde la edición.",
            () => mutate(accessory.id.toString())
        );
    };

    if (isError) return <ErrorComponent message={error.message} />

    const accessories = data?.data ?? [];
    const isFiltered = Boolean(status || search);

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <Title
                    title="Accesorios"
                    subtitle="El inventario nacional: cada fila es una unidad física, con su precio y lo que vale hoy."
                />

                {canWrite && (
                    <CustomFilledButton
                        label="Agregar accesorio"
                        type="button"
                        icon={<Plus size={16} />}
                        onClick={() => navigate('/accesorios/crear')}
                    />
                )}
            </div>

            <AccessoryFiltersBar
                status={status}
                search={search}
                setSearchParams={setSearchParams}
            />

            {isLoading && (
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                    Cargando accesorios
                </p>
            )}

            {!isLoading && accessories.length === 0 && (
                <FadeInUp>
                    <div className="rounded-2xl border border-dashed border-line-strong bg-surface px-8 py-14 text-center">
                        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                            Sin registros
                        </p>

                        <p className="mx-auto mt-3 max-w-[34ch] font-display text-xl font-semibold tracking-tight text-ink">
                            {isFiltered
                                ? "Ningún accesorio coincide con el filtro."
                                : "El inventario está vacío."}
                        </p>

                        <p className="mx-auto mt-2 max-w-[46ch] text-sm text-ink-muted">
                            {isFiltered
                                ? "Cambia el estado o busca por otro nombre o código."
                                : "Registra la primera unidad: cuatro llantas iguales son cuatro accesorios, uno por código."}
                        </p>

                        {canWrite && !isFiltered && (
                            <div className="mt-6 flex justify-center">
                                <CustomFilledButton
                                    label="Agregar accesorio"
                                    type="button"
                                    icon={<Plus size={16} />}
                                    onClick={() => navigate('/accesorios/crear')}
                                />
                            </div>
                        )}
                    </div>
                </FadeInUp>
            )}

            {!isLoading && accessories.length > 0 && (
                <FadeInUp>
                    <Table>
                        <Thead>
                            <Th text="Código" />
                            <Th text="Accesorio" />
                            <Th text="Compra" />
                            <Th text="Precio" />
                            <Th text="Valor hoy" />
                            <Th text="Estado" />
                            <Th text="" />
                        </Thead>

                        <Tbody>
                            {accessories.map((accessory) => (
                                <Tr key={accessory.id}>
                                    <Td>
                                        <AccessoryCode code={accessory.code} />
                                    </Td>

                                    <Td>
                                        <AccessoryName name={accessory.name} />
                                    </Td>

                                    <Td>
                                        <span className="font-mono text-[13px] text-ink-muted">
                                            {formatAccessoryDate(accessory.purchaseDate)}
                                        </span>
                                    </Td>

                                    <Td>
                                        <AccessoryMoney value={accessory.price} muted />
                                    </Td>

                                    <Td>
                                        <AccessoryValueRule accessory={accessory} />
                                    </Td>

                                    <Td>
                                        <AccessoryStatusTag status={accessory.status} />
                                    </Td>

                                    <Td className="text-right">
                                        <ActionsMenu
                                            items={[
                                                {
                                                    label: "Ver detalle",
                                                    icon: <Eye />,
                                                    onClick: () => navigate(`/accesorios/${accessory.id}`)
                                                },
                                                ...(canWrite ? [
                                                    {
                                                        label: "Editar",
                                                        icon: <Pencil />,
                                                        onClick: () => navigate(`/accesorios/${accessory.id}/editar`)
                                                    },
                                                    {
                                                        label: "Dar de baja",
                                                        icon: <Trash2 />,
                                                        onClick: () => askToDeactivate(accessory),
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
        </div>
    );
}
