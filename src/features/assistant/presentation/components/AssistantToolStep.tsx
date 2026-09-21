import { AssistantReportCard, describeToolInput, getToolLabel, isExportTool, parseToolOutput } from "@/features/assistant/assistant";
import { getToolOrDynamicToolName, type DynamicToolUIPart, type ToolUIPart } from "ai";

/**
 * Una estación de la ruta del turno: la herramienta que el modelo llamó, con
 * qué argumentos y cómo terminó. El nodo pulsa mientras trabaja, se rellena
 * al terminar y se pone en rojo si el dominio rechazó la consulta.
 */

type Props = {
    part: ToolUIPart | DynamicToolUIPart;
};

export function AssistantToolStep({ part }: Props) {
    const toolName = getToolOrDynamicToolName(part);
    const pending = part.state === 'input-streaming' || part.state === 'input-available';
    const outcome = part.state === 'output-error'
        ? { kind: 'error' as const, message: part.errorText }
        : pending ? { kind: 'pending' as const } : parseToolOutput(part.output);
    const input = describeToolInput(part.input);

    const node = outcome.kind === 'error'
        ? "border-danger bg-danger"
        : pending
            ? "border-primary bg-primary route_node_active"
            : "border-ink bg-ink";

    return (
        <div className="contents">
            <span className="relative flex h-6 items-center justify-center">
                <span aria-hidden="true" className={`size-2.5 rounded-full border-2 ${node}`} />
            </span>

            <div className="min-w-0 pb-3">
                <p className="flex flex-wrap items-baseline gap-x-2 leading-6">
                    <span className={`font-mono text-[11px] uppercase tracking-[0.14em] ${pending ? "text-ink" : "text-ink-muted"}`}>
                        {getToolLabel(toolName, pending)}
                        {pending && <span className="assistant_ellipsis" aria-hidden="true" />}
                    </span>

                    {input && (
                        <span className="font-mono text-[11px] text-ink-subtle">
                            {input}
                        </span>
                    )}
                </p>

                {outcome.kind === 'error' && (
                    <p className="mt-0.5 text-xs text-danger">
                        {outcome.message}
                    </p>
                )}

                {outcome.kind === 'report' && isExportTool(toolName) && (
                    <AssistantReportCard report={outcome.report} />
                )}
            </div>
        </div>
    );
}
