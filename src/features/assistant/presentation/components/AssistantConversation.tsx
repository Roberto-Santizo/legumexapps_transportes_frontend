import { AssistantErrorNotice, AssistantTurn, UserTurn, type AssistantErrorInfo } from "@/features/assistant/assistant";
import type { UIMessage } from "ai";
import { useEffect, useRef } from "react";

/**
 * La lista de turnos. Sigue al stream mientras el usuario está abajo del
 * todo; si subió a releer algo, se queda quieta hasta que vuelva a bajar.
 */

const STICK_THRESHOLD = 48;

type Props = {
    messages: UIMessage[];
    live: boolean;
    error: AssistantErrorInfo | null;
    onRetry: () => void;
};

export function AssistantConversation({ messages, live, error, onRetry }: Props) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const stickRef = useRef(true);

    const lastMessage = messages.at(-1);
    const lastText = lastMessage?.parts.map((part) => part.type === 'text' ? part.text : part.type).join('');

    useEffect(() => {
        const element = scrollRef.current;

        if (!element || !stickRef.current) return;

        element.scrollTop = element.scrollHeight;
    }, [messages.length, lastText, live, error]);

    const onScroll = () => {
        const element = scrollRef.current;

        if (!element) return;

        stickRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < STICK_THRESHOLD;
    };

    return (
        <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
                {messages.map((message, index) => {
                    if (message.role === 'user') return <UserTurn key={message.id} message={message} />;

                    if (message.role !== 'assistant') return null;

                    return (
                        <AssistantTurn
                            key={message.id}
                            message={message}
                            live={live && index === messages.length - 1}
                        />
                    );
                })}

                {live && lastMessage?.role === 'user' && (
                    <AssistantTurn
                        message={{ id: 'pending', role: 'assistant', parts: [] }}
                        live
                    />
                )}

                {error && <AssistantErrorNotice error={error} onRetry={onRetry} />}
            </div>
        </div>
    );
}
