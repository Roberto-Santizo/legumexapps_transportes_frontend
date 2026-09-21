import type { UIMessage } from "ai";

/** La pregunta del usuario: texto plano, a la derecha, con el mismo tono que el ítem activo del menú. */

type Props = {
    message: UIMessage;
};

export function UserTurn({ message }: Props) {
    const text = message.parts
        .filter((part) => part.type === 'text')
        .map((part) => part.text)
        .join('');

    if (!text.trim()) return null;

    return (
        <div className="flex justify-end pl-8 sm:pl-16">
            <p className="max-w-[60ch] rounded-2xl rounded-br-md bg-ink-deep px-4 py-2.5 text-sm leading-6 whitespace-pre-wrap text-canvas shadow-sm">
                {text}
            </p>
        </div>
    );
}
