import { ASSISTANT_MAX_QUESTION_LENGTH } from "@/features/assistant/assistant";
import { ArrowUp, Square } from "lucide-react";
import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";

/**
 * La caja de la pregunta. Enter envía, Shift+Enter salta de línea, y el
 * contador avisa antes de los 4 000 caracteres que la API rechaza con 422.
 * Mientras un turno está en vuelo el botón pasa a «Detener»: no hay cola en
 * el servidor y dos peticiones en paralelo se pisarían el historial.
 */

const MAX_ROWS = 8;

type Props = {
    busy: boolean;
    disabled?: boolean;
    onSubmit: (value: string) => boolean;
    onStop: () => void;
};

export function AssistantComposer({ busy, disabled = false, onSubmit, onStop }: Props) {
    const [value, setValue] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const length = value.trim().length;
    const tooLong = length > ASSISTANT_MAX_QUESTION_LENGTH;
    const canSend = length > 0 && !tooLong && !busy && !disabled;

    useLayoutEffect(() => {
        const textarea = textareaRef.current;

        if (!textarea) return;

        const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight) || 24;

        textarea.style.height = "auto";
        textarea.style.height = `${Math.min(textarea.scrollHeight, lineHeight * MAX_ROWS)}px`;
    }, [value]);

    const submit = () => {
        if (!canSend) return;

        if (onSubmit(value)) setValue("");
    };

    const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;

        event.preventDefault();
        submit();
    };

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                submit();
            }}
            className="border-t border-line bg-surface px-4 py-4 sm:px-6"
        >
            <div
                className={`flex flex-col gap-2 rounded-2xl border bg-canvas/50 px-4 pt-3 pb-2.5 transition-[border-color,box-shadow] focus-within:border-ink focus-within:ring-[3px] focus-within:ring-ink/12 ${tooLong ? "border-danger" : "border-line-strong"
                    }`}
            >
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    onKeyDown={onKeyDown}
                    rows={1}
                    disabled={disabled}
                    placeholder={disabled ? "El asistente no está disponible para tu cuenta" : "Pregunta por viajes, flota o gastos, o pide un reporte en Excel"}
                    aria-label="Pregunta para el asistente"
                    className="max-h-48 w-full resize-none bg-transparent text-sm leading-6 text-ink outline-none placeholder:text-ink-subtle disabled:cursor-not-allowed"
                />

                <div className="flex items-center justify-between gap-3">
                    <p className="hidden font-mono text-[11px] tracking-[0.08em] text-ink-subtle sm:block">
                        Enter envía · Shift + Enter salto de línea
                    </p>

                    <div className="flex items-center gap-3">
                        <span
                            className={`font-mono text-[11px] tabular-nums ${tooLong ? "text-danger" : "text-ink-subtle"}`}
                            aria-live={tooLong ? "polite" : undefined}
                        >
                            {length.toLocaleString('es-GT')} / {ASSISTANT_MAX_QUESTION_LENGTH.toLocaleString('es-GT')}
                        </span>

                        {busy ? (
                            <button
                                type="button"
                                onClick={onStop}
                                className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full bg-ink text-white transition-colors hover:bg-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/25 focus-visible:ring-offset-2"
                                aria-label="Detener respuesta"
                                title="Detener"
                            >
                                <Square size={14} fill="currentColor" />
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={!canSend}
                                className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full bg-ink text-white transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:bg-ink/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/25 focus-visible:ring-offset-2"
                                aria-label="Enviar pregunta"
                                title="Enviar"
                            >
                                <ArrowUp size={16} strokeWidth={2.25} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {tooLong && (
                <p className="mt-2 text-xs text-danger">
                    La pregunta no puede superar los 4 000 caracteres.
                </p>
            )}
        </form>
    );
}
