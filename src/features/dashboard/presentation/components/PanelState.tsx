import { RefreshCw } from "lucide-react";

/**
 * Los cuatro bloques del tablero se cargan **por separado**: una consulta
 * lenta o caída no bloquea a las otras tres. Estos tres estados se pintan
 * dentro del bloque afectado, sin sacar al usuario de la pantalla.
 */

type SkeletonProps = {
    rows?: number;
    className?: string;
};

export function PanelSkeleton({ rows = 4, className = "" }: SkeletonProps) {
    return (
        <div className={`flex flex-col gap-3 ${className}`} aria-busy aria-label="Cargando">
            {Array.from({ length: rows }, (_, index) => (
                <div
                    key={index}
                    className="h-4 animate-pulse rounded-full bg-line"
                    style={{ width: `${88 - (index % 3) * 14}%` }}
                />
            ))}
        </div>
    );
}

type ErrorProps = {
    message: string;
    onRetry?: () => void;
};

export function PanelError({ message, onRetry }: ErrorProps) {
    return (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3">
            <p className="text-sm text-danger">
                {message}
            </p>

            {onRetry && (
                <button
                    type="button"
                    onClick={onRetry}
                    className="inline-flex cursor-pointer items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink transition-colors hover:text-ink-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/25"
                >
                    <RefreshCw size={12} />
                    Reintentar
                </button>
            )}
        </div>
    );
}

type EmptyProps = {
    title: string;
    hint?: string;
};

export function PanelEmpty({ title, hint }: EmptyProps) {
    return (
        <div className="rounded-xl border border-dashed border-line-strong px-4 py-6 text-center">
            <p className="text-sm font-medium text-ink">
                {title}
            </p>

            {hint && (
                <p className="mt-1 text-xs text-ink-muted">
                    {hint}
                </p>
            )}
        </div>
    );
}
