import { Smartphone } from "lucide-react";

type Props = {
    title: string;
    description: string;
};

/**
 * El piloto opera solo desde la app móvil: la web no le abre sesión. Se pinta
 * en el registro (al elegir «Piloto») y en el login (cuando la cuenta resulta
 * ser de piloto).
 */
export function MobileOnlyNotice({ title, description }: Props) {
    return (
        <div
            role="alert"
            className="flex gap-4 rounded-xl border border-line border-l-4 border-l-primary bg-surface px-4 py-4"
        >
            <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-ink-deep text-primary"
            >
                <Smartphone size={18} />
            </span>

            <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-subtle">
                    Solo app móvil
                </p>

                <p className="mt-1.5 font-display text-[15px] font-semibold leading-snug tracking-tight text-ink">
                    {title}
                </p>

                <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                    {description}
                </p>
            </div>
        </div>
    );
}
