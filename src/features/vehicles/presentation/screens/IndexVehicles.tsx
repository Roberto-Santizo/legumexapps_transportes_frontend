import { VehicleCapacity, VehiclePlate, VehicleSpec, VehicleStatus, VehicleThumb, VehicleTypeTag, vehicleProvider, type Vehicle } from "@/features/vehicles/vehicles";
import { ActionsMenu, CustomFilledButton, ErrorComponent, FadeInUp, Pagination, Table, Tbody, Td, Th, Thead, Title, Tr, useNotification, usePagination } from "@/features/shared/shared";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";

export function IndexVehicles() {
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const { page, rowsPerPage } = usePagination(searchParams);

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['getVehicles', page, rowsPerPage],
        queryFn: () => vehicleProvider.getVehicles(rowsPerPage.toString(), page.toString())
    });

    const { mutate } = useMutation({
        mutationFn: (id: string) => vehicleProvider.deleteVehicleById(id),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getVehicles'] });
        },
        onError: (err) => notification.error(err.message)
    });

    const askToDelete = (vehicle: Vehicle) => {
        notification.question(
            `Eliminar ${vehicle.plate}`,
            "Eliminar",
            "Los viajes que tengan asignada esta unidad se quedan sin vehículo.",
            () => mutate(vehicle.id.toString())
        );
    };

    if (isError) return <ErrorComponent message={error.message} />

    const vehicles = data?.data ?? [];

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <Title
                    title="Vehículos"
                    subtitle="La flota disponible para asignar a un viaje. Cada unidad pertenece a un transportista."
                />

                <CustomFilledButton
                    label="Nuevo vehículo"
                    type="button"
                    icon={<Plus size={16} />}
                    onClick={() => navigate('/vehiculos/crear')}
                />
            </div>

            {isLoading && (
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                    Cargando vehículos
                </p>
            )}

            {!isLoading && vehicles.length === 0 && (
                <FadeInUp>
                    <div className="rounded-2xl border border-dashed border-line-strong bg-surface px-8 py-14 text-center">
                        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                            Sin registros
                        </p>

                        <p className="mx-auto mt-3 max-w-[34ch] font-display text-xl font-semibold tracking-tight text-ink">
                            Aún no hay vehículos registrados.
                        </p>

                        <p className="mx-auto mt-2 max-w-[42ch] text-sm text-ink-muted">
                            Registra la primera unidad para empezar a asignarle viajes.
                        </p>

                        <div className="mt-6 flex justify-center">
                            <CustomFilledButton
                                label="Registrar vehículo"
                                type="button"
                                icon={<Plus size={16} />}
                                onClick={() => navigate('/vehiculos/crear')}
                            />
                        </div>
                    </div>
                </FadeInUp>
            )}

            {!isLoading && vehicles.length > 0 && (
                <FadeInUp>
                    <Table>
                        <Thead>
                            <Th text="Unidad" />
                            <Th text="Placa" />
                            <Th text="Tipo" />
                            <Th text="Capacidad" />
                            <Th text="Transportista" />
                            <Th text="Estado" />
                            <Th text="" />
                        </Thead>

                        <Tbody>
                            {vehicles.map((vehicle) => (
                                <Tr key={vehicle.id}>
                                    <Td>
                                        <div className="flex items-center gap-3">
                                            <VehicleThumb />
                                            <VehicleSpec
                                                brand={vehicle.brand}
                                                model={vehicle.model}
                                                year={vehicle.year}
                                            />
                                        </div>
                                    </Td>

                                    <Td>
                                        <VehiclePlate plate={vehicle.plate} />
                                    </Td>

                                    <Td>
                                        <VehicleTypeTag type={vehicle.type} />
                                    </Td>

                                    <Td>
                                        <VehicleCapacity capacity={vehicle.capacity} />
                                    </Td>

                                    <Td>
                                        {vehicle.carrierName}
                                    </Td>

                                    <Td>
                                        <VehicleStatus status={vehicle.status} />
                                    </Td>

                                    <Td className="text-right">
                                        <ActionsMenu
                                            items={[
                                                {
                                                    label: "Ver detalle",
                                                    icon: <Eye />,
                                                    onClick: () => navigate(`/vehiculos/${vehicle.id}`)
                                                },
                                                {
                                                    label: "Editar",
                                                    icon: <Pencil />,
                                                    onClick: () => navigate(`/vehiculos/${vehicle.id}/editar`)
                                                },
                                                {
                                                    label: "Eliminar",
                                                    icon: <Trash2 />,
                                                    onClick: () => askToDelete(vehicle),
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
