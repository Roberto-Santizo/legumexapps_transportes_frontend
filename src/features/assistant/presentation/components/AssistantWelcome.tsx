import { ASSISTANT_STARTERS } from "@/features/assistant/assistant";
import { ArrowUpRight } from "lucide-react";

/**
 * La conversación vacía es una invitación: cuatro preguntas que cubren lo
 * que el asistente sabe hacer (consultar y exportar) y una línea con lo que
 * no, para que nadie le pida crear un viaje.
 */

type Props = {
    userName: string;
    onPick: (question: string) => void;
    disabled: boolean;
};

export function AssistantWelcome({ userName, onPick, disabled }: Props) {
    const firstName = userName.trim().split(/\s+/)[0] || userName;

    return (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 py-6 sm:py-10">
            <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                    Asistente del tablero
                </p>

                <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">
                    {firstName}, ¿qué quieres saber de la operación?
                </h2>

                <p className="mt-3 max-w-[58ch] text-sm leading-6 text-ink-muted">
                    Responde con los datos de viajes, flota y gastos de mantenimiento que ya ves en el tablero, y genera reportes en Excel cuando se lo pides. Solo consulta y exporta: no crea, asigna ni modifica nada.
                </p>
            </div>

            <ul className="grid gap-3 sm:grid-cols-2">
                {ASSISTANT_STARTERS.map((starter) => (
                    <li key={starter.title}>
                        <button
                            type="button"
                            disabled={disabled}
                            onClick={() => onPick(starter.question)}
                            className="group flex h-full w-full cursor-pointer flex-col gap-2 rounded-2xl border border-line bg-surface p-4 text-left transition-colors hover:border-line-strong hover:bg-canvas/60 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/25"
                        >
                            <span className="flex items-center justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-subtle">
                                {starter.title}
                                <ArrowUpRight size={14} className="text-ink-subtle transition-colors group-hover:text-primary" />
                            </span>

                            <span className="text-sm leading-6 text-ink">
                                {starter.question}
                            </span>
                        </button>
                    </li>
                ))}
            </ul>

            <p className="text-xs leading-5 text-ink-subtle">
                Fuera de su alcance: accesorios, salarios, tarifas de flete, catálogos y el trazado GPS de un viaje. Para eso están sus pantallas.
            </p>
        </div>
    );
}
