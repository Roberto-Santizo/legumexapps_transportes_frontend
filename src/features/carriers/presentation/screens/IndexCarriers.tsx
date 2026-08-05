import { CarrierCodeStamp, CarrierMonogram, CarrierStatus, carrierProvider, type Carrier } from "@/features/carriers/carriers";
import { ActionsMenu, CustomFilledButton, ErrorComponent, FadeInUp, Pagination, Table, Tbody, Td, Th, Thead, Title, Tr, useNotification, usePagination } from "@/features/shared/shared";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";

export function IndexCarriers() {
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const { page, rowsPerPage } = usePagination(searchParams);

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['getCarriers', page, rowsPerPage],
        queryFn: () => carrierProvider.getCarriers(rowsPerPage.toString(), page.toString())
    });

    const { mutate } = useMutation({
        mutationFn: (id: string) => carrierProvider.deleteCarrierById(id),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getCarriers'] });
        },
        onError: (err) => notification.error(err.message)
    });

    const askToDelete = (carrier: Carrier) => {
        notification.question(
            `Eliminar ${carrier.name}`,
            "Eliminar",
            "Los viajes y las unidades de este transportista se quedan sin a quién asignarse.",
            () => mutate(carrier.id.toString())
        );
    };

    if (isError) return <ErrorComponent message={error.message} />

    const carriers = data?.data ?? [];

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <Title
                    title="Transportistas"
                    subtitle="Quiénes mueven la carga. Cada viaje y cada unidad cuelga de uno de estos registros."
                />

                <CustomFilledButton
                    label="Nuevo transportista"
                    type="button"
                    icon={<Plus size={16} />}
                    onClick={() => navigate('/transportistas/crear')}
                />
            </div>

            {isLoading && (
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                    Cargando transportistas
                </p>
            )}

            {!isLoading && carriers.length === 0 && (
                <FadeInUp>
                    <div className="rounded-2xl border border-dashed border-line-strong bg-surface px-8 py-14 text-center">
                        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                            Sin registros
                        </p>

                        <p className="mx-auto mt-3 max-w-[34ch] font-display text-xl font-semibold tracking-tight text-ink">
                            Aún no hay transportistas registrados.
                        </p>

                        <p className="mx-auto mt-2 max-w-[42ch] text-sm text-ink-muted">
                            Registra el primero para empezar a asignarle viajes.
                        </p>

                        <div className="mt-6 flex justify-center">
                            <CustomFilledButton
                                label="Registrar transportista"
                                type="button"
                                icon={<Plus size={16} />}
                                onClick={() => navigate('/transportistas/crear')}
                            />
                        </div>
                    </div>
                </FadeInUp>
            )}

            {!isLoading && carriers.length > 0 && (
                <FadeInUp>
                    <Table>
                        <Thead>
                            <Th text="Transportista" />
                            <Th text="Código" />
                            <Th text="Estado" />
                            <Th text="" />
                        </Thead>

                        <Tbody>
                            {carriers.map((carrier) => (
                                <Tr key={carrier.id}>
                                    <Td>
                                        <div className="flex items-center gap-3">
                                            <CarrierMonogram name={carrier.name} />
                                            <span className="font-medium text-ink">{carrier.name}</span>
                                        </div>
                                    </Td>

                                    <Td>
                                        <CarrierCodeStamp code={carrier.code} />
                                    </Td>

                                    <Td>
                                        <CarrierStatus active={carrier.active} />
                                    </Td>

                                    <Td className="text-right">
                                        <ActionsMenu
                                            items={[
                                                {
                                                    label: "Ver detalle",
                                                    icon: <Eye />,
                                                    onClick: () => navigate(`/transportistas/${carrier.id}`)
                                                },
                                                {
                                                    label: "Editar",
                                                    icon: <Pencil />,
                                                    onClick: () => navigate(`/transportistas/${carrier.id}/editar`)
                                                },
                                                {
                                                    label: "Eliminar",
                                                    icon: <Trash2 />,
                                                    onClick: () => askToDelete(carrier),
                                                    danger: true
                                                }
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
