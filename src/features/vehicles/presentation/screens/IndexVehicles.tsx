import {
    canCreateVehicle,
    canFilterByCarrier,
    CARRIER_REQUIRED_MESSAGE,
    VehicleCapacity,
    VehicleCondition,
    VehicleEngineNumber,
    VehicleFiltersBar,
    VehicleMoney,
    VehicleOdometer,
    VehiclePlate,
    VehicleSpec,
    VehicleStatus,
    VehicleThumb,
    VehicleTypeTag,
    vehicleProvider,
    type Vehicle
} from "@/features/vehicles/vehicles";
import { ActionsMenu, CustomFilledButton, ErrorComponent, FadeInUp, Pagination, Table, Tbody, Td, Th, Thead, Title, Tr, useNotification, usePagination } from "@/features/shared/shared";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@/config/store/store";

export function IndexVehicles() {
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const { page, rowsPerPage } = usePagination(searchParams);

    const role = useSelector((state: RootState) => state.auth.user?.role);
    /** El alta es de `carrier`: a un `administrator` el backend le responde 403. */
    const canCreate = canCreateVehicle(role);

    const status = searchParams.get('status') ?? '';
    const condition = searchParams.get('condition') ?? '';
    const engineNumber = searchParams.get('engineNumber') ?? '';
    const carrierId = searchParams.get('carrierId') ?? '';

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['getVehicles', page, rowsPerPage, status, condition, engineNumber, carrierId],
        queryFn: () => vehicleProvider.getVehicles(rowsPerPage.toString(), page.toString(), {
            status,
            condition,
            engineNumber,
            carrierId
        })
    });

    const { mutate } = useMutation({
        mutationFn: (id: string) => vehicleProvider.deleteVehicleById(id),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getVehicles'] });
        },
        onError: (err) => notification.error(err.message)
    });

    /**
     * No borra: la unidad pasa a `inactive` y sigue en el listado. Se dice así
     * para que nadie espere que la fila desaparezca.
     */
    const askToDeactivate = (vehicle: Vehicle) => {
        notification.question(
            `Desactivar ${vehicle.plate}`,
            "Desactivar",
            "La unidad deja de estar disponible, pero no se borra: sigue en el listado y se puede reactivar desde la edición.",
            () => mutate(vehicle.id.toString())
        );
    };

    /**
     * Un transportista que todavía no ha registrado su empresa recibe 403 en
     * los cinco endpoints. No es falta de permisos: le falta un paso, y la
     * pantalla lo lleva a darlo.
     */
    if (isError && error.message === CARRIER_REQUIRED_MESSAGE) {
        return (
            <div className="flex flex-col gap-8">
                <Title
                    title="Vehículos"
                    subtitle="La flota disponible para asignar a un viaje."
                />

                <FadeInUp>
                    <div className="rounded-2xl border border-dashed border-line-strong bg-surface px-8 py-14 text-center">
                        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                            Falta tu empresa
                        </p>

                        <p className="mx-auto mt-3 max-w-[34ch] font-display text-xl font-semibold tracking-tight text-ink">
                            Registra tu empresa transportista para ver tu flota.
                        </p>

                        <p className="mx-auto mt-2 max-w-[46ch] text-sm text-ink-muted">
                            Cada unidad queda vinculada a una empresa, así que hasta que la registres
                            no hay flota que administrar.
                        </p>

                        <div className="mt-6 flex justify-center">
                            <CustomFilledButton
                                label="Registrar empresa"
                                type="button"
                                onClick={() => navigate('/completar-perfil')}
                            />
                        </div>
                    </div>
                </FadeInUp>
            </div>
        );
    }

    if (isError) return <ErrorComponent message={error.message} />

    const vehicles = data?.data ?? [];
    const hasFilters = Boolean(status || condition || engineNumber || carrierId);

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <Title
                    title="Vehículos"
                    subtitle="La flota disponible para asignar a un viaje. Cada unidad pertenece a un transportista."
                />

                {canCreate && (
                    <CustomFilledButton
                        label="Nuevo vehículo"
                        type="button"
                        icon={<Plus size={16} />}
                        onClick={() => navigate('/vehiculos/crear')}
                    />
                )}
            </div>

            <VehicleFiltersBar
                status={status}
                condition={condition}
                engineNumber={engineNumber}
                carrierId={carrierId}
                showCarrierFilter={canFilterByCarrier(role)}
                setSearchParams={setSearchParams}
            />

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
                            {hasFilters
                                ? "Ninguna unidad coincide con estos filtros."
                                : "Aún no hay vehículos registrados."}
                        </p>

                        <p className="mx-auto mt-2 max-w-[42ch] text-sm text-ink-muted">
                            {hasFilters
                                ? "Ajusta el número de motor o la condición para ampliar la búsqueda."
                                : canCreate
                                    ? "Registra la primera unidad para empezar a asignarle viajes."
                                    : "Las unidades las registra cada transportista desde su propia cuenta."}
                        </p>

                        {!hasFilters && canCreate && (
                            <div className="mt-6 flex justify-center">
                                <CustomFilledButton
                                    label="Registrar vehículo"
                                    type="button"
                                    icon={<Plus size={16} />}
                                    onClick={() => navigate('/vehiculos/crear')}
                                />
                            </div>
                        )}
                    </div>
                </FadeInUp>
            )}

            {!isLoading && vehicles.length > 0 && (
                <FadeInUp>
                    <Table>
                        <Thead>
                            <Th text="Unidad" />
                            <Th text="Placa" />
                            <Th text="No. de motor" />
                            <Th text="Tipo" />
                            <Th text="Capacidad" />
                            <Th text="Kilometraje" />
                            <Th text="Valor de compra" />
                            <Th text="Seguro" />
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

                                            <div className="flex flex-col gap-1">
                                                <VehicleSpec
                                                    brand={vehicle.brand}
                                                    model={vehicle.model}
                                                    year={vehicle.year}
                                                />

                                                <VehicleCondition condition={vehicle.condition} />
                                            </div>
                                        </div>
                                    </Td>

                                    <Td>
                                        <VehiclePlate plate={vehicle.plate} />
                                    </Td>

                                    <Td>
                                        <VehicleEngineNumber engineNumber={vehicle.engineNumber} />
                                    </Td>

                                    <Td>
                                        <VehicleTypeTag type={vehicle.type} />
                                    </Td>

                                    <Td>
                                        <VehicleCapacity capacity={vehicle.capacity} />
                                    </Td>

                                    <Td>
                                        <VehicleOdometer mileage={vehicle.mileage} />
                                    </Td>

                                    <Td>
                                        <VehicleMoney amount={vehicle.purchasePrice} />
                                    </Td>

                                    <Td>
                                        <VehicleMoney amount={vehicle.monthlyInsuranceCost} period="al mes" />
                                    </Td>

                                    <Td>
                                        {vehicle.carrierName ?? "—"}
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
                                                    label: "Desactivar",
                                                    icon: <Trash2 />,
                                                    onClick: () => askToDeactivate(vehicle),
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
