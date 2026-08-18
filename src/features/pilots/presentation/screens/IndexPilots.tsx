import type { Pilot } from "@/features/pilots/pilots";
import {
    CARRIER_REQUIRED_MESSAGE,
    PilotCarrier,
    PilotCarrierFilter,
    PilotIdentity,
    PilotMoment,
    PilotSalary,
    PilotSalaryHistoryDrawer,
    PilotSalaryModal,
    pilotProvider
} from "@/features/pilots/pilots";
import {
    ActionsMenu,
    CustomFilledButton,
    ErrorComponent,
    FadeInUp,
    Pagination,
    Table,
    Tbody,
    Td,
    Th,
    Thead,
    Title,
    Tr,
    usePagination
} from "@/features/shared/shared";
import type { RootState } from "@/config/store/store";
import { History, Wallet } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { useState } from "react";

export function IndexPilots() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { page, rowsPerPage } = usePagination(searchParams);

    /** Piloto cuyo salario se está ajustando; `null` con el modal cerrado. */
    const [editing, setEditing] = useState<Pilot | null>(null);
    /** Piloto cuya bitácora está abierta; `null` con el drawer cerrado. */
    const [inspecting, setInspecting] = useState<Pilot | null>(null);

    const user = useSelector((state: RootState) => state.auth.user);
    const role = user?.role;

    /** El `manager` ve todos los salarios del país pero no puede tocar ninguno. */
    const canWrite = role === 'administrator' || role === 'carrier';
    /** A un `carrier` el backend le ignora el filtro: solo se pinta a quien sí lo usa. */
    const canFilterByCarrier = role === 'administrator' || role === 'manager';

    const carrierId = searchParams.get('carrierId') ?? '';

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['getPilots', page, rowsPerPage, carrierId],
        queryFn: () => pilotProvider.getPilots(rowsPerPage.toString(), page.toString(), carrierId || undefined)
    });

    /**
     * Un transportista que todavía no ha registrado su empresa recibe 403 en
     * los tres endpoints. No es falta de permisos: le falta un paso, y la
     * pantalla lo lleva a darlo.
     */
    if (isError && error.message === CARRIER_REQUIRED_MESSAGE) {
        return (
            <div className="flex flex-col gap-8">
                <Title
                    title="Pilotos"
                    subtitle="El salario base mensual de cada piloto vinculado a tu empresa."
                />

                <FadeInUp>
                    <div className="rounded-2xl border border-dashed border-line-strong bg-surface px-8 py-14 text-center">
                        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                            Falta tu empresa
                        </p>

                        <p className="mx-auto mt-3 max-w-[34ch] font-display text-xl font-semibold tracking-tight text-ink">
                            Registra tu empresa transportista para ver a tus pilotos.
                        </p>

                        <p className="mx-auto mt-2 max-w-[46ch] text-sm text-ink-muted">
                            Los pilotos se vinculan a una empresa, así que hasta que la registres
                            no hay nómina que administrar.
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

    const pilots = data?.data ?? [];

    const buildActions = (pilot: Pilot) => [
        ...(canWrite
            ? [{
                label: pilot.salary ? "Ajustar salario" : "Asignar salario",
                icon: <Wallet />,
                onClick: () => setEditing(pilot)
            }]
            : []),
        {
            label: "Ver historial",
            icon: <History />,
            onClick: () => setInspecting(pilot)
        }
    ];

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <Title
                    title="Pilotos"
                    subtitle="El salario base mensual de cada piloto vinculado a una empresa transportista."
                />

                {canFilterByCarrier && (
                    <PilotCarrierFilter
                        carrierId={carrierId}
                        setSearchParams={setSearchParams}
                    />
                )}
            </div>

            {isLoading && (
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                    Cargando pilotos
                </p>
            )}

            {!isLoading && pilots.length === 0 && (
                <FadeInUp>
                    <div className="rounded-2xl border border-dashed border-line-strong bg-surface px-8 py-14 text-center">
                        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                            Sin registros
                        </p>

                        <p className="mx-auto mt-3 max-w-[34ch] font-display text-xl font-semibold tracking-tight text-ink">
                            {carrierId
                                ? "Esta empresa todavía no tiene pilotos."
                                : "Todavía no hay pilotos vinculados."}
                        </p>

                        <p className="mx-auto mt-2 max-w-[46ch] text-sm text-ink-muted">
                            Un piloto aparece aquí en cuanto se une a una empresa transportista con
                            el código de la empresa.
                        </p>
                    </div>
                </FadeInUp>
            )}

            {!isLoading && pilots.length > 0 && (
                <FadeInUp>
                    <Table>
                        <Thead>
                            <Th text="Piloto" />
                            {canFilterByCarrier && <Th text="Empresa" />}
                            <Th text="Salario base" />
                            <Th text="Se unió" />
                            <Th text="" />
                        </Thead>

                        <Tbody>
                            {pilots.map((pilot) => (
                                <Tr key={pilot.id}>
                                    <Td>
                                        <PilotIdentity name={pilot.name} email={pilot.email} />
                                    </Td>

                                    {canFilterByCarrier && (
                                        <Td>
                                            <PilotCarrier carrierName={pilot.carrierName} />
                                        </Td>
                                    )}

                                    <Td>
                                        <PilotSalary value={pilot.salary} />
                                    </Td>

                                    <Td>
                                        <PilotMoment value={pilot.joinedAt} />
                                    </Td>

                                    <Td className="text-right">
                                        <ActionsMenu items={buildActions(pilot)} />
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

            <PilotSalaryModal
                pilot={editing}
                closeModal={() => setEditing(null)}
            />

            <PilotSalaryHistoryDrawer
                pilotId={inspecting?.id ?? null}
                pilotName={inspecting?.name ?? null}
                closeDrawer={() => setInspecting(null)}
            />
        </div>
    );
}
