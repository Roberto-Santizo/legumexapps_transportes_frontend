import { FUEL_TYPE_LABELS, FuelPriceBoard, FuelPriceFigure, FuelPriceMoment, FuelPriceStatus, FuelTypeTag, fuelPriceProvider, type FuelPrice } from "@/features/fuel-prices/fuel-prices";
import { ActionsMenu, CustomFilledButton, ErrorComponent, FadeInUp, Pagination, Table, Tbody, Td, Th, Thead, Title, Tr, useNotification, usePagination } from "@/features/shared/shared";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";

export function IndexFuelPrices() {
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const { page, rowsPerPage } = usePagination(searchParams);

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['getFuelPrices', page, rowsPerPage],
        queryFn: () => fuelPriceProvider.getFuelPrices(rowsPerPage.toString(), page.toString())
    });

    const { mutate } = useMutation({
        mutationFn: (id: string) => fuelPriceProvider.deleteFuelPriceById(id),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getFuelPrices'] });
        },
        onError: (err) => notification.error(err.message)
    });

    const askToDelete = (fuelPrice: FuelPrice) => {
        const label = FUEL_TYPE_LABELS[fuelPrice.fuelType] ?? fuelPrice.fuelType;

        notification.question(
            `Eliminar precio de ${label}`,
            "Eliminar",
            fuelPrice.status === 'active'
                ? "Es el precio vigente: al borrarlo, este combustible se queda sin precio para costear viajes."
                : "El registro sale del historial de precios.",
            () => mutate(fuelPrice.id.toString())
        );
    };

    if (isError) return <ErrorComponent message={error.message} />

    const fuelPrices = data?.data ?? [];

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <Title
                    title="Precios de combustible"
                    subtitle="El precio del galón con el que se costean los viajes. Cada cambio de precio queda registrado."
                />

                <CustomFilledButton
                    label="Registrar precio"
                    type="button"
                    icon={<Plus size={16} />}
                    onClick={() => navigate('/gasolina-precios/crear')}
                />
            </div>

            {/*
              * La pizarra resuelve el vigente entre los registros cargados, así que
              * solo se muestra en la primera página: es donde el historial trae los
              * precios más recientes.
              */}
            {!isLoading && page === 0 && fuelPrices.length > 0 && (
                <FadeInUp>
                    <FuelPriceBoard prices={fuelPrices} />
                </FadeInUp>
            )}

            {isLoading && (
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                    Cargando precios
                </p>
            )}

            {!isLoading && fuelPrices.length === 0 && (
                <FadeInUp>
                    <div className="rounded-2xl border border-dashed border-line-strong bg-surface px-8 py-14 text-center">
                        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                            Sin registros
                        </p>

                        <p className="mx-auto mt-3 max-w-[34ch] font-display text-xl font-semibold tracking-tight text-ink">
                            Aún no hay precios registrados.
                        </p>

                        <p className="mx-auto mt-2 max-w-[42ch] text-sm text-ink-muted">
                            Registra el precio del galón para empezar a costear los viajes.
                        </p>

                        <div className="mt-6 flex justify-center">
                            <CustomFilledButton
                                label="Registrar precio"
                                type="button"
                                icon={<Plus size={16} />}
                                onClick={() => navigate('/gasolina-precios/crear')}
                            />
                        </div>
                    </div>
                </FadeInUp>
            )}

            {!isLoading && fuelPrices.length > 0 && (
                <FadeInUp>
                    <Table>
                        <Thead>
                            <Th text="Combustible" />
                            <Th text="Precio por galón" />
                            <Th text="Estado" />
                            <Th text="Registró" />
                            <Th text="Fecha" />
                            <Th text="" />
                        </Thead>

                        <Tbody>
                            {fuelPrices.map((fuelPrice) => (
                                <Tr key={fuelPrice.id}>
                                    <Td>
                                        <FuelTypeTag fuelType={fuelPrice.fuelType} />
                                    </Td>

                                    <Td>
                                        <FuelPriceFigure price={fuelPrice.price} />
                                    </Td>

                                    <Td>
                                        <FuelPriceStatus status={fuelPrice.status} />
                                    </Td>

                                    <Td>
                                        {fuelPrice.registeredByName}
                                    </Td>

                                    <Td>
                                        <FuelPriceMoment value={fuelPrice.createdAt} />
                                    </Td>

                                    <Td className="text-right">
                                        <ActionsMenu
                                            items={[
                                                {
                                                    label: "Ver detalle",
                                                    icon: <Eye />,
                                                    onClick: () => navigate(`/gasolina-precios/${fuelPrice.id}`)
                                                },
                                                {
                                                    label: "Editar",
                                                    icon: <Pencil />,
                                                    onClick: () => navigate(`/gasolina-precios/${fuelPrice.id}/editar`)
                                                },
                                                {
                                                    label: "Eliminar",
                                                    icon: <Trash2 />,
                                                    onClick: () => askToDelete(fuelPrice),
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
