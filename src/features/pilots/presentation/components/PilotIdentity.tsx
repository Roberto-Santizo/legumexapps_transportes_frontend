/**
 * Piezas de lectura de un piloto. La distinción que carga toda la vista es
 * `salary: null` frente a un importe: un piloto recién unido nace sin salario
 * asignado y eso NO es ganar cero. Se pinta como una casilla vacía —contorno
 * discontinuo, sin cifra— para que se lea como trabajo pendiente y no como un
 * dato más de la fila.
 */

import { formatSalary, getSalaryChangeDirection, getSalaryDifference } from "@/features/pilots/pilots";
import { initials } from "@/features/shared/shared";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

type IdentityProps = {
    name: string | null;
    email: string | null;
}

export function PilotIdentity({ name, email }: IdentityProps) {
    return (
        <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-canvas font-mono text-[11px] tracking-[0.08em] text-ink-muted">
                {name ? initials(name) : '—'}
            </span>

            <div className="flex flex-col">
                <span className="font-display text-[15px] font-semibold tracking-tight text-ink">
                    {name ?? 'Piloto sin nombre'}
                </span>

                {email && (
                    <span className="max-w-[32ch] truncate text-xs text-ink-muted">
                        {email}
                    </span>
                )}
            </div>
        </div>
    );
}

type CarrierProps = {
    carrierName: string | null;
}

export function PilotCarrier({ carrierName }: CarrierProps) {
    return (
        <span className="inline-flex items-center rounded-full border border-line px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
            {carrierName ?? 'Sin empresa'}
        </span>
    );
}

type SalarySize = "sm" | "lg";

const SALARY_SIZES: Record<SalarySize, string> = {
    sm: "text-[17px]",
    lg: "text-[28px] leading-none",
};

type SalaryProps = {
    /** Cadena de la API. `null` es «sin asignar», nunca cero. */
    value: string | null;
    size?: SalarySize;
}

export function PilotSalary({ value, size = "sm" }: SalaryProps) {
    const amount = formatSalary(value);

    if (!amount) {
        return (
            <span className="inline-flex items-center gap-2 rounded-lg border border-dashed border-line-strong px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-subtle">
                Sin asignar
            </span>
        );
    }

    return (
        <span className="inline-flex items-baseline gap-1 font-mono tabular-nums text-ink">
            <span className={SALARY_SIZES[size]}>{amount}</span>
            <span className="text-[11px] text-ink-subtle">/mes</span>
        </span>
    );
}

type DeltaProps = {
    previousSalary: string | null;
    newSalary: string;
}

/**
 * Bajar el salario está permitido y se registra igual que una subida, así que
 * la dirección se muestra sin cargarla de juicio: flecha y signo, nada más.
 */
export function PilotSalaryDelta({ previousSalary, newSalary }: DeltaProps) {
    const direction = getSalaryChangeDirection(previousSalary, newSalary);
    const difference = getSalaryDifference(previousSalary, newSalary);

    if (direction === 'initial' || !difference) {
        return (
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                Asignación inicial
            </span>
        );
    }

    const isRaise = direction === 'up';

    return (
        <span className={`inline-flex items-center gap-1 font-mono text-[11px] tabular-nums ${isRaise ? "text-success" : "text-danger"}`}>
            {isRaise ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {isRaise ? '+' : '−'}{difference}
        </span>
    );
}

type MomentProps = {
    /** Llega como `d-m-Y h:i:s A`, no como ISO: se muestra tal cual, sin parsear. */
    value: string | null;
    withTime?: boolean;
}

export function PilotMoment({ value, withTime = false }: MomentProps) {
    if (!value) return <span className="text-sm text-ink-subtle">—</span>;

    const [date, ...rest] = value.trim().split(/\s+/);
    const time = rest.join(' ');

    return (
        <span className="font-mono text-[13px] text-ink">
            {date}
            {withTime && time && <span className="ml-2 text-ink-subtle">{time}</span>}
        </span>
    );
}
