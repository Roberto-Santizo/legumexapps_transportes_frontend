import { ActionsMenu, CustomFilledButton, ErrorComponent, FadeInUp, Pagination, Table, Tbody, Td, Th, Thead, Title, Tr, useNotification, usePagination } from "@/features/shared/shared";
import { Eye, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { LOCATION_TYPES, LOCATION_TYPE_LABELS, LocationMoment, LocationName, LocationPinGlyph, LocationStatus, LocationTypeTag, isLocationType, locationProvider } from "@/features/locations/locations";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import type { Location, LocationType } from "@/features/locations/locations";
import type { RootState } from "@/config/store/store";

type ChipProps = {
    label: string;
    active: boolean;
    onClick: () => void;
}

function FilterChip({ label, active, onClick }: ChipProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`cursor-pointer rounded-lg border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 ${active
                ? "border-ink-deep bg-ink-deep text-canvas"
                : "border-line bg-surface text-ink-muted hover:border-line-strong"}`}
        >
            {label}
        </button>
    );
}

export function IndexLocations() {
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const { page, rowsPerPage } = usePagination(searchParams);

    const role = useSelector((state: RootState) => state.auth.user?.role);
    const canWrite = role === 'administrator';

    // Un `type` fuera del enum no vacía la lista: la API lo ignora y devuelve el
    // catálogo entero. Se descarta aquí para que la tabla y el filtro coincidan.
    const typeParam = searchParams.get('type');
    const type = isLocationType(typeParam) ? typeParam : undefined;

    const filterByType = (next?: LocationType) => {
        setSearchParams((params) => {
            if (next) {
                params.set('type', next);
            } else {
                params.delete('type');
            }

            params.delete('page');

            return params;
        });
    };

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['getLocations', page, rowsPerPage, type],
        queryFn: () => locationProvider.getLocations(rowsPerPage.toString(), page.toString(), type)
    });

    const { mutate: removeLocation } = useMutation({
        mutationFn: (id: string) => locationProvider.deleteLocationById(id),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getLocations'] });
        },
        onError: (err) => notification.error(err.message)
    });

    const { mutate: toggleLocation } = useMutation({
        mutationFn: (id: string) => locationProvider.toggleLocationStatusById(id),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getLocations'] });
        },
        onError: (err) => notification.error(err.message)
    });

    const askToDeactivate = (location: Location) => {
        notification.question(
            `Dar de baja ${location.name}`,
            "Dar de baja",
            "El destino deja de cotizar y sus tarifas dejan de poder editarse, pero no se borra: sigue en el listado y se puede reactivar.",
            () => removeLocation(location.id.toString())
        );
    };

    if (isError) return <ErrorComponent message={error.message} />

    const locations = data?.data ?? [];

    const buildActions = (location: Location) => [
        {
            label: "Ver detalle",
            icon: <Eye />,
            onClick: () => navigate(`/ubicaciones/${location.id}`)
        },
        ...(canWrite
            ? [
                {
                    label: "Editar",
                    icon: <Pencil />,
                    onClick: () => navigate(`/ubicaciones/${location.id}/editar`)
                },
                location.status
                    ? {
                        label: "Dar de baja",
                        icon: <Trash2 />,
                        onClick: () => askToDeactivate(location),
                        danger: true
                    }
                    : {
                        label: "Reactivar",
                        icon: <RotateCcw />,
                        onClick: () => toggleLocation(location.id.toString())
                    }
            ]
            : [])
    ];

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <Title
                    title="Ubicaciones"
                    subtitle="Los destinos que cotizan flete. Cada uno es un punto dado de alta, no un área."
                />

                {canWrite && (
                    <CustomFilledButton
                        label="Registrar destino"
                        type="button"
                        icon={<Plus size={16} />}
                        onClick={() => navigate('/ubicaciones/crear')}
                    />
                )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                    Tipo
                </span>

                <FilterChip label="Todos" active={!type} onClick={() => filterByType()} />

                {LOCATION_TYPES.map((option) => (
                    <FilterChip
                        key={option}
                        label={LOCATION_TYPE_LABELS[option]}
                        active={type === option}
                        onClick={() => filterByType(option)}
                    />
                ))}
            </div>

            {isLoading && (
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                    Cargando ubicaciones
                </p>
            )}

            {!isLoading && locations.length === 0 && (
                <FadeInUp>
                    <div className="rounded-2xl border border-dashed border-line-strong bg-surface px-8 py-14 text-center">
                        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                            Sin registros
                        </p>

                        <p className="mx-auto mt-3 max-w-[34ch] font-display text-xl font-semibold tracking-tight text-ink">
                            {type
                                ? `Ningún destino está clasificado como ${LOCATION_TYPE_LABELS[type].toLowerCase()}.`
                                : "Todavía no hay destinos dados de alta."}
                        </p>

                        <p className="mx-auto mt-2 max-w-[46ch] text-sm text-ink-muted">
                            {type === 'port'
                                ? "Los destinos registrados antes de que existiera el tipo quedaron todos como destino. Edita cada puerto para reclasificarlo."
                                : type === 'destination'
                                    ? "Cambia el filtro para ver el resto del catálogo."
                                    : "Registra el primero para poder cotizarle una tarifa de flete."}
                        </p>

                        {canWrite && !type && (
                            <div className="mt-6 flex justify-center">
                                <CustomFilledButton
                                    label="Registrar destino"
                                    type="button"
                                    icon={<Plus size={16} />}
                                    onClick={() => navigate('/ubicaciones/crear')}
                                />
                            </div>
                        )}
                    </div>
                </FadeInUp>
            )}

            {!isLoading && locations.length > 0 && (
                <FadeInUp>
                    <Table>
                        <Thead>
                            <Th text="Destino" />
                            <Th text="Tipo" />
                            <Th text="Estado" />
                            <Th text="Registró" />
                            <Th text="Fecha" />
                            <Th text="" />
                        </Thead>

                        <Tbody>
                            {locations.map((location) => (
                                <Tr key={location.id}>
                                    <Td>
                                        <div className="flex items-center gap-3">
                                            <LocationPinGlyph active={location.status} />

                                            <div className="flex flex-col">
                                                <LocationName name={location.name} />

                                                {location.description && (
                                                    <span className="max-w-[38ch] truncate text-xs text-ink-muted">
                                                        {location.description}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </Td>

                                    <Td>
                                        <LocationTypeTag type={location.type} />
                                    </Td>

                                    <Td>
                                        <LocationStatus status={location.status} />
                                    </Td>

                                    <Td>
                                        {location.registeredByName ?? '—'}
                                    </Td>

                                    <Td>
                                        <LocationMoment value={location.createdAt} />
                                    </Td>

                                    <Td className="text-right">
                                        <ActionsMenu items={buildActions(location)} />
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
