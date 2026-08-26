import { ActionsMenu, CustomFilledButton, ErrorComponent, FadeInUp, Pagination, Table, Tbody, Td, Th, Thead, Title, Tr, useNotification, usePagination } from "@/features/shared/shared";
import { Eye, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { DeparturePointGlyph, DeparturePointMoment, DeparturePointName, DeparturePointStatus, departurePointProvider } from "@/features/departure-points/departure-points";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import type { DeparturePoint } from "@/features/departure-points/departure-points";
import type { RootState } from "@/config/store/store";

export function IndexDeparturePoints() {
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const { page, rowsPerPage } = usePagination(searchParams);

    const role = useSelector((state: RootState) => state.auth.user?.role);
    const canWrite = role === 'administrator';

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['getDeparturePoints', page, rowsPerPage],
        queryFn: () => departurePointProvider.getDeparturePoints(rowsPerPage.toString(), page.toString())
    });

    const { mutate: removeDeparturePoint } = useMutation({
        mutationFn: (id: string) => departurePointProvider.deleteDeparturePointById(id),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getDeparturePoints'] });
        },
        onError: (err) => notification.error(err.message)
    });

    const { mutate: toggleDeparturePoint } = useMutation({
        mutationFn: (id: string) => departurePointProvider.toggleDeparturePointStatusById(id),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getDeparturePoints'] });
        },
        onError: (err) => notification.error(err.message)
    });

    const askToDeactivate = (departurePoint: DeparturePoint) => {
        notification.question(
            `Dar de baja ${departurePoint.name}`,
            "Dar de baja",
            "El punto de partida deja de ofrecerse para registrar viajes, pero no se borra: sigue en el listado y se puede reactivar.",
            () => removeDeparturePoint(departurePoint.id.toString())
        );
    };

    if (isError) return <ErrorComponent message={error.message} />

    const departurePoints = data?.data ?? [];

    const buildActions = (departurePoint: DeparturePoint) => [
        {
            label: "Ver detalle",
            icon: <Eye />,
            onClick: () => navigate(`/puntos-de-partida/${departurePoint.id}`)
        },
        ...(canWrite
            ? [
                {
                    label: "Editar",
                    icon: <Pencil />,
                    onClick: () => navigate(`/puntos-de-partida/${departurePoint.id}/editar`)
                },
                departurePoint.status
                    ? {
                        label: "Dar de baja",
                        icon: <Trash2 />,
                        onClick: () => askToDeactivate(departurePoint),
                        danger: true
                    }
                    : {
                        label: "Reactivar",
                        icon: <RotateCcw />,
                        onClick: () => toggleDeparturePoint(departurePoint.id.toString())
                    }
            ]
            : [])
    ];

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <Title
                    title="Puntos de partida"
                    subtitle="De donde sale el viaje: bodegas, plantas, fincas y centros de acopio. No cotizan flete."
                />

                {canWrite && (
                    <CustomFilledButton
                        label="Registrar punto de partida"
                        type="button"
                        icon={<Plus size={16} />}
                        onClick={() => navigate('/puntos-de-partida/crear')}
                    />
                )}
            </div>

            {isLoading && (
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                    Cargando puntos de partida
                </p>
            )}

            {!isLoading && departurePoints.length === 0 && (
                <FadeInUp>
                    <div className="rounded-2xl border border-dashed border-line-strong bg-surface px-8 py-14 text-center">
                        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                            Sin registros
                        </p>

                        <p className="mx-auto mt-3 max-w-[34ch] font-display text-xl font-semibold tracking-tight text-ink">
                            Todavía no hay puntos de partida dados de alta.
                        </p>

                        <p className="mx-auto mt-2 max-w-[46ch] text-sm text-ink-muted">
                            Registra el primero para poder indicar de dónde sale un viaje.
                        </p>

                        {canWrite && (
                            <div className="mt-6 flex justify-center">
                                <CustomFilledButton
                                    label="Registrar punto de partida"
                                    type="button"
                                    icon={<Plus size={16} />}
                                    onClick={() => navigate('/puntos-de-partida/crear')}
                                />
                            </div>
                        )}
                    </div>
                </FadeInUp>
            )}

            {!isLoading && departurePoints.length > 0 && (
                <FadeInUp>
                    <Table>
                        <Thead>
                            <Th text="Punto de partida" />
                            <Th text="Estado" />
                            <Th text="Registró" />
                            <Th text="Fecha" />
                            <Th text="" />
                        </Thead>

                        <Tbody>
                            {departurePoints.map((departurePoint) => (
                                <Tr key={departurePoint.id}>
                                    <Td>
                                        <div className="flex items-center gap-3">
                                            <DeparturePointGlyph active={departurePoint.status} />

                                            <div className="flex flex-col">
                                                <DeparturePointName name={departurePoint.name} />

                                                {departurePoint.description && (
                                                    <span className="max-w-[38ch] truncate text-xs text-ink-muted">
                                                        {departurePoint.description}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </Td>

                                    <Td>
                                        <DeparturePointStatus status={departurePoint.status} />
                                    </Td>

                                    <Td>
                                        {departurePoint.registeredByName ?? '—'}
                                    </Td>

                                    <Td>
                                        <DeparturePointMoment value={departurePoint.createdAt} />
                                    </Td>

                                    <Td className="text-right">
                                        <ActionsMenu items={buildActions(departurePoint)} />
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
