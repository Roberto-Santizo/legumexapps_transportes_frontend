import { AssistantComposer, AssistantConversation, AssistantWelcome, useAssistantChat } from "@/features/assistant/assistant";
import { FadeInUp, Title, useNotification } from "@/features/shared/shared";
import { MessageSquarePlus } from "lucide-react";

/**
 * La pantalla completa del asistente: título, la conversación (o la
 * bienvenida cuando está vacía) y la caja de la pregunta pegada abajo. Ocupa
 * el alto disponible del `main` (cabecera de 4rem + padding de 2.5rem arriba
 * y abajo) para que el scroll viva dentro de la conversación y no en la página.
 */

type Props = {
    userId: number;
    userName: string;
};

export function AssistantPanel({ userId, userName }: Props) {
    const notification = useNotification();
    const { messages, busy, recovering, errorInfo, ask, retry, stop, reset } = useAssistantChat(userId);

    const hasConversation = messages.length > 0;

    const confirmReset = () => {
        notification.question(
            "¿Empezar una conversación nueva?",
            "Empezar de nuevo",
            "La conversación actual se descartará. El asistente no la guarda: no se puede recuperar después.",
            reset
        );
    };

    return (
        <FadeInUp>
            <div className="flex h-[calc(100dvh-9rem)] min-h-[32rem] flex-col gap-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <Title
                        title="Inteligencia Artificial"
                        subtitle={recovering
                            ? "Renovando la sesión y reenviando la pregunta…"
                            : "Pregunta en lenguaje natural por viajes, flota y gastos; pide un reporte y te lo devuelve en Excel."}
                    />

                    {hasConversation && (
                        <button
                            type="button"
                            onClick={confirmReset}
                            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm font-medium text-ink transition-colors hover:border-ink hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/25 focus-visible:ring-offset-2"
                        >
                            <MessageSquarePlus size={16} strokeWidth={1.75} />
                            Nueva conversación
                        </button>
                    )}
                </div>

                <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-surface">
                    {hasConversation ? (
                        <AssistantConversation
                            messages={messages}
                            live={busy}
                            error={errorInfo}
                            onRetry={retry}
                        />
                    ) : (
                        <div className="flex-1 overflow-y-auto px-4 sm:px-6">
                            <AssistantWelcome userName={userName} onPick={ask} disabled={busy} />
                        </div>
                    )}

                    <AssistantComposer busy={busy} onSubmit={ask} onStop={() => void stop()} />
                </section>
            </div>
        </FadeInUp>
    );
}
