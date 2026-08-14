import { ActionsMenu, CustomFilledButton, ErrorComponent, FadeInUp, Pagination, Table, Tbody, Td, Th, Thead, Title, Tr, useNotification, usePagination } from "@/features/shared/shared";
import { Eye, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { ZoneGlyph, ZoneMoment, ZoneName, ZoneStatus, zoneProvider } from "@/features/zones/zones";
import type { RootState } from "@/config/store/store";
import type { Zone } from "@/features/zones/zones";

export function IndexZones() {
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const { page, rowsPerPage } = usePagination(searchParams);

    const role = useSelector((state: RootState) => state.auth.user?.role);
    const canWrite = role === 'administrator';

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['getZones', page, rowsPerPage],
        queryFn: () => zoneProvider.getZones(rowsPerPage.toString(), page.toString())
    });

    const { mutate: removeZone } = useMutation({
        mutationFn: (id: string) => zoneProvider.deleteZoneById(id),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getZones'] });
        },
        onError: (err) => notification.error(err.message)
    });

    const { mutate: toggleZone } = useMutation({
        mutationFn: (id: string) => zoneProvider.toggleZoneStatusById(id),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getZones'] });
        },
        onError: (err) => notification.error(err.message)
    });

    const askToDeactivate = (zone: Zone) => {
        notification.question(
            `Dar de baja ${zone.name}`,
            "Dar de baja",
            "La zona deja de estar disponible, pero no se borra: sigue en el listado y se puede reactivar.",
            () => removeZone(zone.id.toString())
        );
    };

    if (isError) return <ErrorComponent message={error.message} />

    const zones = data?.data ?? [];

    const buildActions = (zone: Zone) => [
        {
            label: "Ver detalle",
            icon: <Eye />,
            onClick: () => navigate(`/zonas/${zone.id}`)
        },
        ...(canWrite
            ? [
                {
                    label: "Editar",
                    icon: <Pencil />,
                    onClick: () => navigate(`/zonas/${zone.id}/editar`)
                },
                zone.status
                    ? {
                        label: "Dar de baja",
                        icon: <Trash2 />,
                        onClick: () => askToDeactivate(zone),
                        danger: true
                    }
                    : {
                        label: "Reactivar",
                        icon: <RotateCcw />,
                        onClick: () => toggleZone(zone.id.toString())
                    }
            ]
            : [])
    ];

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <Title
                    title="Zonas"
                    subtitle="El territorio dibujado sobre el mapa. Cada zona delimita dónde hay cobertura."
                />

                {canWrite && (
                    <CustomFilledButton
                        label="Dibujar zona"
                        type="button"
                        icon={<Plus size={16} />}
                        onClick={() => navigate('/zonas/crear')}
                    />
                )}
            </div>

            {isLoading && (
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                    Cargando zonas
                </p>
            )}

            {!isLoading && zones.length === 0 && (
                <FadeInUp>
                    <div className="rounded-2xl border border-dashed border-line-strong bg-surface px-8 py-14 text-center">
                        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                            Sin registros
                        </p>

                        <p className="mx-auto mt-3 max-w-[34ch] font-display text-xl font-semibold tracking-tight text-ink">
                            Todavía no hay territorio dibujado.
                        </p>

                        <p className="mx-auto mt-2 max-w-[46ch] text-sm text-ink-muted">
                            Traza la primera zona sobre el mapa para delimitar dónde hay cobertura.
                        </p>

                        {canWrite && (
                            <div className="mt-6 flex justify-center">
                                <CustomFilledButton
                                    label="Dibujar zona"
                                    type="button"
                                    icon={<Plus size={16} />}
                                    onClick={() => navigate('/zonas/crear')}
                                />
                            </div>
                        )}
                    </div>
                </FadeInUp>
            )}

            {!isLoading && zones.length > 0 && (
                <FadeInUp>
                    <Table>
                        <Thead>
                            <Th text="Zona" />
                            <Th text="Estado" />
                            <Th text="Registró" />
                            <Th text="Fecha" />
                            <Th text="" />
                        </Thead>

                        <Tbody>
                            {zones.map((zone) => (
                                <Tr key={zone.id}>
                                    <Td>
                                        <div className="flex items-center gap-3">
                                            <ZoneGlyph area={zone.area} color={zone.color} />

                                            <div className="flex flex-col">
                                                <ZoneName name={zone.name} />

                                                {zone.description && (
                                                    <span className="max-w-[38ch] truncate text-xs text-ink-muted">
                                                        {zone.description}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </Td>

                                    <Td>
                                        <ZoneStatus status={zone.status} />
                                    </Td>

                                    <Td>
                                        {zone.registeredByName ?? '—'}
                                    </Td>

                                    <Td>
                                        <ZoneMoment value={zone.createdAt} />
                                    </Td>

                                    <Td className="text-right">
                                        <ActionsMenu items={buildActions(zone)} />
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
