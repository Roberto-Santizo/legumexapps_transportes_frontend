import { describeReportRows, downloadAssistantReport, formatAssistantMoney, type AssistantReport } from "@/features/assistant/assistant";
import { Download, FileSpreadsheet } from "lucide-react";
import { useState } from "react";

/**
 * El `.xlsx` que dejó `export_trips` / `export_vehicle_expenses`. La URL es
 * pública y permanente pero no hay listado ni borrado en el servidor: esta
 * tarjeta (y el enlace en el texto) son la única forma de volver al archivo.
 */

type Props = {
    report: AssistantReport;
};

export function AssistantReportCard({ report }: Props) {
    const [downloading, setDownloading] = useState(false);

    const download = async () => {
        if (downloading) return;

        setDownloading(true);

        try {
            await downloadAssistantReport(report);
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="mt-2 flex max-w-md flex-col gap-3 rounded-xl border border-line bg-canvas/60 p-3">
            <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
                    <FileSpreadsheet size={18} strokeWidth={1.75} />
                </span>

                <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-[13px] text-ink" title={report.fileName}>
                        {report.fileName}
                    </p>

                    <p className="mt-0.5 text-xs text-ink-muted">
                        {describeReportRows(report)}
                        {report.totalAmount && ` · total ${formatAssistantMoney(report.totalAmount)}`}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={download}
                    disabled={downloading}
                    className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-ink/90 disabled:cursor-wait disabled:bg-ink/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/25 focus-visible:ring-offset-2"
                >
                    <Download size={13} />
                    {downloading ? "Descargando" : "Descargar"}
                </button>
            </div>

            {report.truncated && (
                <p className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs text-ink">
                    El archivo se recortó: el tope es 5 000 filas por reporte. Pide un rango más corto para tenerlo completo.
                </p>
            )}
        </div>
    );
}
