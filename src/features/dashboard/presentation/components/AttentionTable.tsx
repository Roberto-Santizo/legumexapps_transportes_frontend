import { ATTENTION_ITEMS, type AttentionSeverity } from "@/features/dashboard/dashboard";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/features/shared/shared";
import { CircleAlert, TriangleAlert } from "lucide-react";

const SEVERITY: Record<AttentionSeverity, { label: string; className: string; icon: typeof CircleAlert }> = {
    critico: {
        label: "Crítico",
        className: "border-danger/30 bg-danger/5 text-danger",
        icon: TriangleAlert,
    },
    advertencia: {
        label: "Advertencia",
        className: "border-line-strong bg-canvas text-ink-muted",
        icon: CircleAlert,
    },
};

function SeverityChip({ severity }: { severity: AttentionSeverity }) {
    const { label, className, icon: Icon } = SEVERITY[severity];

    return (
        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${className}`}>
            <Icon size={13} />

            <span className="font-mono text-[11px] uppercase tracking-[0.14em]">
                {label}
            </span>
        </span>
    );
}

export function AttentionTable() {
    return (
        <div className="flex flex-col gap-5">
            <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                    Bandeja de la mañana
                </p>

                <h2 className="mt-2 font-display text-lg font-semibold tracking-tight text-ink">
                    Requieren una decisión hoy
                </h2>
            </div>

            <Table>
                <Thead>
                    <Th text="Unidad" />
                    <Th text="Transportista" />
                    <Th text="Qué pasó" />
                    <Th text="Desde" />
                    <Th text="Severidad" />
                </Thead>

                <Tbody>
                    {ATTENTION_ITEMS.map((item) => (
                        <Tr key={item.id}>
                            <Td>
                                <span className="font-mono text-[13px] font-medium tracking-[0.08em] text-ink">
                                    {item.plate}
                                </span>
                            </Td>

                            <Td>
                                {item.carrier}
                            </Td>

                            <Td>
                                <span className="text-ink">
                                    {item.reason}
                                </span>
                            </Td>

                            <Td>
                                <span className="whitespace-nowrap font-mono text-xs text-ink-subtle">
                                    {item.since}
                                </span>
                            </Td>

                            <Td>
                                <SeverityChip severity={item.severity} />
                            </Td>
                        </Tr>
                    ))}
                </Tbody>
            </Table>
        </div>
    );
}
