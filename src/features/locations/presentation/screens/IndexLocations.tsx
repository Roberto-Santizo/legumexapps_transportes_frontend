import { ActionsMenu, CustomFilledButton, ErrorComponent, FadeInUp, Pagination, Table, Tbody, Td, Th, Thead, Title, Tr, useNotification, usePagination } from "@/features/shared/shared";
import { Eye, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { LocationMoment, LocationName, LocationPinGlyph, LocationStatus, locationProvider } from "@/features/locations/locations";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import type { Location } from "@/features/locations/locations";
import type { RootState } from "@/config/store/store";

export function IndexLocations() {
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const { page, rowsPerPage } = usePagination(searchParams);

    const role = useSelector((state: RootState) => state.auth.user?.role);
    const canWrite = role === 'administrator';

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['getLocations', page, rowsPerPage],
        queryFn: () => locationProvider.getLocations(rowsPerPage.toString(), page.toString())
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
                            Todavía no hay destinos dados de alta.
                        </p>

                        <p className="mx-auto mt-2 max-w-[46ch] text-sm text-ink-muted">
                            Registra el primero para poder cotizarle una tarifa de flete.
                        </p>

                        {canWrite && (
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
