import type { AssistantErrorInfo } from "@/features/assistant/assistant";
import { RefreshCw } from "lucide-react";

/**
 * El turno falló. Un 403 o un 422 no se reintentan (el resultado sería el
 * mismo); un fallo del proveedor o de la red deja el botón para reenviar la
 * misma pregunta. Nunca se reintenta solo: cada turno cuesta y un error de
 * cuota se repetiría.
 */

type Props = {
    error: AssistantErrorInfo;
    onRetry: () => void;
};

export function AssistantErrorNotice({ error, onRetry }: Props) {
    const retryable = error.kind === 'stream' || error.kind === 'unauthorized';

    return (
        <div
            role="alert"
            className="ml-9 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3"
        >
            <p className="text-sm text-danger">
                {error.message}
            </p>

            {retryable && (
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
