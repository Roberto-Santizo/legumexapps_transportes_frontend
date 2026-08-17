/**
 * La bitácora es una cadena, no una lista suelta: el `newSalary` de cada
 * entrada es el `previousSalary` de la siguiente, y el eslabón del fondo es
 * siempre la primera asignación —la única con `previousSalary: null`—. Por eso
 * se dibuja como una cadena descendente con un riel a la izquierda, y no como
 * una tabla: la forma es el dato.
 *
 * Llega ordenada del cambio más reciente al más antiguo y se pinta tal cual.
 */

import type { PilotSalaryHistory } from "@/features/pilots/pilots";
import { PilotMoment, PilotSalaryDelta, formatSalary, pilotProvider } from "@/features/pilots/pilots";
import { Drawer, SpinnerComponent } from "@/features/shared/shared";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

/** La bitácora crece sin techo y no se purga nunca: se lee siempre paginada. */
const HISTORY_LIMIT = '10';

type EntryProps = {
    entry: PilotSalaryHistory;
    /** El eslabón del fondo cierra el riel: por debajo no hay nada más. */
    isLast: boolean;
}

function PilotSalaryHistoryEntry({ entry, isLast }: EntryProps) {
    const previous = formatSalary(entry.previousSalary);
    const next = formatSalary(entry.newSalary);

    return (
        <li className="relative flex gap-4 pb-6 last:pb-0">
            {!isLast && (
                <span className="absolute left-[5px] top-4 h-full w-px bg-line" aria-hidden />
            )}

            <span
                className={`relative mt-[6px] h-[11px] w-[11px] shrink-0 rounded-full border ${entry.previousSalary === null
                    ? "border-line-strong bg-surface"
                    : "border-ink bg-ink"
                    }`}
                aria-hidden
            />

            <div className="flex flex-1 flex-col gap-1.5">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    {previous && (
                        <>
                            <span className="font-mono text-[13px] tabular-nums text-ink-subtle line-through">
                                {previous}
                            </span>

                            <span className="text-ink-subtle" aria-hidden>→</span>
                        </>
                    )}

                    <span className="font-mono text-[17px] tabular-nums text-ink">
                        {next}
                    </span>

                    <PilotSalaryDelta
                        previousSalary={entry.previousSalary}
                        newSalary={entry.newSalary}
                    />
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                    <PilotMoment value={entry.changedAt} withTime />
                    <span className="text-ink-subtle" aria-hidden>·</span>
                    <span>{entry.changedByName ?? 'Autor desconocido'}</span>
                </div>
            </div>
        </li>
    );
}

type Props = {
    /** `null` cierra el drawer. El id es el `user_id` del piloto. */
    pilotId: number | null;
    pilotName: string | null;
    closeDrawer: () => void;
}

export function PilotSalaryHistoryDrawer({ pilotId, pilotName, closeDrawer }: Props) {
    /** La página vive aquí y no en la URL: la URL la usa la tabla del listado. */
    const [page, setPage] = useState(0);

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['getPilotSalaryHistory', pilotId, page],
        queryFn: () => pilotProvider.getPilotSalaryHistoryById(String(pilotId), HISTORY_LIMIT, page.toString()),
        enabled: pilotId !== null
    });

    const close = () => {
        setPage(0);
        closeDrawer();
    };

    const entries = data?.data ?? [];
    const lastPage = data?.lastPage ?? 1;

    return (
        <Drawer
            drawer={pilotId !== null}
            closeDrawer={close}
            title="Historial de salario"
            width="sm:max-w-lg"
        >
            <div className="flex flex-col gap-6">
                <p className="text-sm text-ink-muted">
                    {pilotName ?? 'Piloto sin nombre'}
                </p>

                {isLoading && <SpinnerComponent />}

                {isError && (
                    <p className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-ink">
                        {error.message}
                    </p>
                )}

                {!isLoading && !isError && entries.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-line-strong bg-canvas px-6 py-10 text-center">
                        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                            Bitácora vacía
                        </p>

                        <p className="mx-auto mt-3 max-w-[34ch] text-sm text-ink-muted">
                            A este piloto nunca se le ha ajustado el salario. La primera asignación
                            abrirá la bitácora.
                        </p>
                    </div>
                )}

                {!isLoading && !isError && entries.length > 0 && (
                    <ol className="flex flex-col">
                        {entries.map((entry, index) => (
                            <PilotSalaryHistoryEntry
                                key={entry.id}
                                entry={entry}
                                isLast={index === entries.length - 1}
                            />
                        ))}
                    </ol>
                )}

                {lastPage > 1 && (
                    <div className="flex items-center justify-between border-t border-line pt-4">
                        <button
                            type="button"
                            onClick={() => setPage((current) => Math.max(current - 1, 0))}
                            disabled={page === 0}
                            className="inline-flex cursor-pointer items-center gap-1 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:text-ink-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                        >
                            <ChevronLeft size={14} />
                            Recientes
                        </button>

                        <span className="font-mono text-[11px] tabular-nums text-ink-subtle">
                            {page + 1} / {lastPage}
                        </span>

                        <button
                            type="button"
                            onClick={() => setPage((current) => current + 1)}
                            disabled={page + 1 >= lastPage}
                            className="inline-flex cursor-pointer items-center gap-1 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:text-ink-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                        >
                            Anteriores
                            <ChevronRight size={14} />
                        </button>
                    </div>
                )}
            </div>
        </Drawer>
    );
}
