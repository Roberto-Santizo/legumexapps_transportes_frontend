import {
    DASHBOARD_VEHICLE_STATUSES,
    PanelEmpty,
    PanelError,
    PanelShell,
    PanelSkeleton,
    dashboardProvider,
    formatDashboardMoment,
    formatInteger,
    type DashboardVehicleStatus
} from "@/features/dashboard/dashboard";
import { Pagination, Table, Tbody, Td, Th, Thead, Tr, usePagination } from "@/features/shared/shared";
import { VEHICLE_CONDITION_LABELS, VEHICLE_STATUS_LABELS, VEHICLE_TYPE_LABELS } from "@/features/vehicles/vehicles";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";

type Props = {
    carrierId?: number;
};

/**
 * `inactive` y `under_repair` se listan igual que `active`: el tablero no
 * filtra por defecto, así que el estado se lleva a un chip para que una
 * unidad fuera de servicio no se lea como disponible.
 */
const STATUS_CHIP: Record<DashboardVehicleStatus, string> = {
    active: "border-success/40 bg-success/10 text-success",
    inactive: "border-line-strong bg-canvas text-ink-subtle",
    under_repair: "border-primary/40 bg-primary/10 text-ink",
};

const IN_ROUTE_OPTIONS = [
    { value: "", label: "Todas" },
    { value: "true", label: "En ruta" },
    { value: "false", label: "Disponibles" },
];

const selectClass = "cursor-pointer rounded-full border border-line bg-surface px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/25";

/**
 * La flota con su viaje en curso. Se pagina siempre (`limit` numérico) para
 * leer `total` de la raíz del sobre; los filtros propios del bloque viven en
 * la URL junto a los globales y `inRoute` se aplica antes de paginar.
 */
export function FleetTable({ carrierId }: Props) {
    const [searchParams, setSearchParams] = useSearchParams();
    const { page, rowsPerPage } = usePagination(searchParams);

    const status = searchParams.get('estado') ?? '';
    const inRouteParam = searchParams.get('enRuta') ?? '';
    const inRoute = inRouteParam === 'true' ? true : inRouteParam === 'false' ? false : undefined;

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['dashboardVehicles', carrierId, status, inRoute, page, rowsPerPage],
        queryFn: () => dashboardProvider.getVehicles({ carrierId, status, inRoute, limit: rowsPerPage, page }),
    });

    const setFilter = (key: string, value: string) => {
        setSearchParams((params) => {
            if (value) params.set(key, value);
            else params.delete(key);

            params.delete('page');

            return params;
        });
    };

    const vehicles = data?.data ?? [];
    const isFiltered = Boolean(status || inRouteParam || carrierId);

    return (
        <PanelShell
            eyebrow="Flota"
            title="Unidades y su viaje en curso"
            description="Toda la flota, también la que está inactiva o en taller. Una unidad en ruta puede seguir marcada como inactiva: el tablero no lo corrige."
            aside={
                <div className="flex flex-wrap items-center gap-2">
                    <label className="contents">
                        <span className="sr-only">Estado</span>

                        <select value={status} onChange={(event) => setFilter('estado', event.target.value)} className={selectClass}>
                            <option value="">Todos los estados</option>

                            {DASHBOARD_VEHICLE_STATUSES.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="contents">
                        <span className="sr-only">En ruta</span>

                        <select value={inRouteParam} onChange={(event) => setFilter('enRuta', event.target.value)} className={selectClass}>
                            {IN_ROUTE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
            }
        >
            <div className="px-6 pb-6 pt-5">
                {isLoading && !data && <PanelSkeleton rows={5} />}

                {error && <PanelError message={error.message} onRetry={() => refetch()} />}

                {data && vehicles.length === 0 && (
                    <PanelEmpty
                        title={isFiltered ? "Ninguna unidad coincide con el filtro" : "Todavía no hay unidades registradas"}
                        hint={isFiltered ? "Prueba con otro estado u otra empresa." : undefined}
                    />
                )}

                {vehicles.length > 0 && (
                    <>
                        <Table>
                            <Thead>
                                <Th text="Placa" />
                                <Th text="Tipo" />
                                <Th text="Estado" />
                                <Th text="Condición" />
                                <Th text="Kilometraje" />
                                <Th text="Km / gal" />
                                <Th text="Empresa" />
                                <Th text="Viaje en curso" />
                            </Thead>

                            <Tbody>
                                {vehicles.map((vehicle) => (
                                    <Tr key={vehicle.id}>
                                        <Td>
                                            <Link
                                                to={`/vehiculos/${vehicle.id}`}
                                                className="font-mono text-[13px] font-medium tracking-[0.08em] text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/25"
                                            >
                                                {vehicle.plate}
                                            </Link>
                                        </Td>

                                        <Td>
                                            {VEHICLE_TYPE_LABELS[vehicle.type] ?? vehicle.type}
                                        </Td>

                                        <Td>
                                            <span className={`inline-flex rounded-full border px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.14em] ${STATUS_CHIP[vehicle.status]}`}>
                                                {VEHICLE_STATUS_LABELS[vehicle.status] ?? vehicle.status}
                                            </span>
                                        </Td>

                                        <Td>
                                            {VEHICLE_CONDITION_LABELS[vehicle.condition] ?? vehicle.condition}
                                        </Td>

                                        <Td>
                                            <span className="whitespace-nowrap font-mono text-[13px]">
                                                {formatInteger(vehicle.mileage)} km
                                            </span>
                                        </Td>

                                        <Td>
                                            <span className="font-mono text-[13px]">
                                                {vehicle.kilometersPerGallon}
                                            </span>
                                        </Td>

                                        <Td>
                                            {vehicle.carrierName ?? "—"}
                                        </Td>

                                        <Td>
                                            {vehicle.currentTrip
                                                ? (
                                                    <div className="min-w-0">
                                                        <Link
                                                            to={`/viajes/${vehicle.currentTrip.tripId}/seguimiento`}
                                                            className="font-mono text-[13px] font-medium tracking-[0.08em] text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/25"
                                                        >
                                                            {vehicle.currentTrip.order}
                                                        </Link>

                                                        <p className="mt-0.5 whitespace-nowrap text-xs text-ink-subtle">
                                                            {vehicle.currentTrip.pilotName ?? "Piloto sin nombre"}
                                                            {vehicle.currentTrip.startDate && ` · ${formatDashboardMoment(vehicle.currentTrip.startDate)}`}
                                                        </p>
                                                    </div>
                                                )
                                                : <span className="text-ink-subtle">Sin viaje</span>}
                                        </Td>
                                    </Tr>
                                ))}
                            </Tbody>
                        </Table>

                        <Pagination
                            page={page}
                            rowsPerPage={rowsPerPage}
                            count={data?.total ?? vehicles.length}
                            setSearchParams={setSearchParams}
                        />
                    </>
                )}
            </div>
        </PanelShell>
    );
}
