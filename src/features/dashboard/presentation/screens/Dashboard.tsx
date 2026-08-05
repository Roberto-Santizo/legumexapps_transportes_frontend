import { AttentionTable, ColdChainChart, ComplianceChart, CorridorBoard, OperationStrip } from "@/features/dashboard/dashboard";
import { StaggerContainer, StaggerItem, Title } from "@/features/shared/shared";

const TODAY = new Intl.DateTimeFormat("es-GT", {
    weekday: "long",
    day: "numeric",
    month: "long",
}).format(new Date());

export function Dashboard() {
    return (
        <StaggerContainer>
            <div className="flex flex-col gap-8">
                <StaggerItem>
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <Title
                            title="Operación de hoy"
                            subtitle="Un vistazo a la carga en movimiento, la cadena de frío y lo que no puede esperar."
                        />

                        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                            {TODAY} · corte 08:00
                        </p>
                    </div>
                </StaggerItem>

                <StaggerItem>
                    <OperationStrip />
                </StaggerItem>

                <StaggerItem>
                    <CorridorBoard />
                </StaggerItem>

                <StaggerItem>
                    <div className="grid gap-6 xl:grid-cols-2">
                        <ColdChainChart />
                        <ComplianceChart />
                    </div>
                </StaggerItem>

                <StaggerItem>
                    <AttentionTable />
                </StaggerItem>
            </div>
        </StaggerContainer>
    );
}
