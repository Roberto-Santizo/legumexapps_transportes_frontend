import { PanelEmpty, percentOf } from "@/features/dashboard/dashboard";

export type RankedRow = {
    id: number | string;
    label: string;
    value: number;
    /** Texto ya formateado a la derecha; si falta se pinta `value` tal cual. */
    display?: string;
};

type Props = {
    heading: string;
    rows: RankedRow[];
    /** Denominador de la barra de participación. */
    total: number;
    limit?: number;
    emptyText: string;
    /** Nota bajo la lista, para lo que el total no explica (viajes sin asignar, etc.). */
    footnote?: string;
};

/**
 * Los desgloses llegan ya ordenados de mayor a menor y **completos**: recortar
 * al top N es del front. La barra es la participación sobre `total`, no sobre
 * la suma de las filas, que en viajes por empresa puede ser menor.
 */
export function RankedList({ heading, rows, total, limit = 5, emptyText, footnote }: Props) {
    const visible = rows.slice(0, limit);
    const hidden = rows.length - visible.length;

    return (
        <div className="flex flex-col gap-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                {heading}
            </p>

            {visible.length === 0
                ? <PanelEmpty title={emptyText} />
                : (
                    <ol className="flex flex-col gap-3">
                        {visible.map((row) => {
                            const share = percentOf(row.value, total);

                            return (
                                <li key={row.id} className="flex flex-col gap-1.5">
                                    <div className="flex items-baseline justify-between gap-4">
                                        <span className="min-w-0 truncate text-sm text-ink">
                                            {row.label}
                                        </span>

                                        <span className="shrink-0 font-mono text-[13px] text-ink">
                                            {row.display ?? row.value}
                                            <span className="ml-1.5 text-ink-subtle">
                                                {share} %
                                            </span>
                                        </span>
                                    </div>

                                    <div className="h-1 overflow-hidden rounded-full bg-line" aria-hidden>
                                        <div className="h-full rounded-full bg-ink-muted" style={{ width: `${share}%` }} />
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                )}

            {(hidden > 0 || footnote) && (
                <p className="text-xs text-ink-subtle">
                    {hidden > 0 && `${hidden} más sin mostrar`}
                    {hidden > 0 && footnote && " · "}
                    {footnote}
                </p>
            )}
        </div>
    );
}
