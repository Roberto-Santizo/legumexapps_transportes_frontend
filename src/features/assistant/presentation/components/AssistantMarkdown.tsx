import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * El texto del asistente es Markdown (enlaces a reportes, listas, tablas
 * cortas, negritas). Los estilos viven en `.assistant_markdown` dentro de
 * `index.css`; aquí solo se fuerza que los enlaces abran en otra pestaña:
 * la conversación no se guarda en el servidor y perderla por un clic sería
 * un mal negocio.
 */

const components: Components = {
    a: ({ href, children }) => (
        <a href={href} target="_blank" rel="noopener noreferrer">
            {children}
        </a>
    ),
};

type Props = {
    text: string;
};

export function AssistantMarkdown({ text }: Props) {
    return (
        <div className="assistant_markdown">
            <Markdown remarkPlugins={[remarkGfm]} components={components}>
                {text}
            </Markdown>
        </div>
    );
}
