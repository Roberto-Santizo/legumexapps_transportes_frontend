import { AssistantMarkdown, AssistantToolStep } from "@/features/assistant/assistant";
import { isToolOrDynamicToolUIPart, type UIMessage } from "ai";
import { Sparkles } from "lucide-react";

/**
 * Un turno del asistente pintado como un tramo de ruta: el origen es el
 * asistente, cada herramienta es una estación y el texto final es el
 * destino. Mientras el turno está en vuelo la línea avanza y el último nodo
 * pulsa; al terminar todo queda fijo como una bitácora del recorrido.
 *
 * Los parts que no se conocen (`reasoning-*`, futuros `data-*`) se ignoran
 * sin romper el render: solo se pintan texto y herramientas.
 */

type Props = {
    message: UIMessage;
    live: boolean;
};

export function AssistantTurn({ message, live }: Props) {
    const parts = message.parts.filter((part) => part.type === 'text' || isToolOrDynamicToolUIPart(part));
    const textParts = parts.filter((part) => part.type === 'text');
    const hasVisibleText = textParts.some((part) => part.type === 'text' && part.text.trim().length > 0);
    const hasPendingTool = parts.some((part) => isToolOrDynamicToolUIPart(part) && (part.state === 'input-streaming' || part.state === 'input-available'));

    /** Sin nada que enseñar y sin turno en vuelo (un `error` antes del primer token): no ocupa sitio. */
    if (!live && parts.length === 0) return null;

    return (
        <article className="relative grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-3" aria-live={live ? "polite" : undefined}>
            <span
                aria-hidden="true"
                className={`assistant_rail absolute top-6 bottom-3 left-[calc(0.75rem-0.5px)] w-px ${live ? "assistant_rail_live" : ""}`}
            />

            <span className="relative flex size-6 items-center justify-center rounded-md bg-ink-deep text-canvas">
                <Sparkles size={12} strokeWidth={2} />
            </span>

            <p className="pb-3 font-mono text-[11px] leading-6 uppercase tracking-[0.14em] text-ink-subtle">
                Asistente
            </p>

            {parts.map((part, index) => {
                if (isToolOrDynamicToolUIPart(part)) {
                    return <AssistantToolStep key={part.toolCallId} part={part} />;
                }

                if (part.type !== 'text' || !part.text.trim()) return null;

                const streaming = live && part.state === 'streaming';

                return (
                    <div className="contents" key={index}>
                        <span className="relative flex h-6 items-center justify-center">
                            <span
                                aria-hidden="true"
                                className={`size-2.5 rounded-sm ${streaming ? "bg-primary route_node_active" : "bg-ink-deep"}`}
                            />
                        </span>

                        <div className="min-w-0 pb-3">
                            <AssistantMarkdown text={part.text} />
                        </div>
                    </div>
                );
            })}

            {live && !hasVisibleText && !hasPendingTool && (
                <div className="contents">
                    <span className="relative flex h-6 items-center justify-center">
                        <span aria-hidden="true" className="size-2.5 rounded-full border-2 border-primary bg-primary route_node_active" />
                    </span>

                    <p className="pb-3 font-mono text-[11px] leading-6 uppercase tracking-[0.14em] text-ink">
                        Pensando<span className="assistant_ellipsis" aria-hidden="true" />
                    </p>
                </div>
            )}
        </article>
    );
}
