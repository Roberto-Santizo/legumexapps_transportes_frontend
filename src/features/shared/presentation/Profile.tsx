import { FadeInUp, initials, Title } from "@/features/shared/shared";
import { Mail } from "lucide-react";
import { useSelector } from "react-redux";
import type { RootState } from "@/config/config";

const ROLE_LABEL: Record<string, string> = {
    administrator: "Administrador",
    carrier: "Transportista",
    pilot: "Piloto",
};

export function Profile() {
    const user = useSelector((state: RootState) => state.auth.user);
    if (!user) return null;
    const carrier = user.carrierName && user.carrierCode ? { name: user.carrierName, code: user.carrierCode } : null;

    return (
        <div className="flex flex-col gap-8">
            <Title
                title="Perfil"
                subtitle="Los datos con los que operas en la plataforma."
            />

            <FadeInUp>
                <article className="max-w-2xl overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-ink-deep px-6 py-4 sm:px-8">
                        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-canvas/55">
                            Credencial de operador
                        </span>

                        <span className="rounded-full border border-canvas/20 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-canvas">
                            {ROLE_LABEL[user.role] ?? user.role}
                        </span>
                    </div>

                    <div className="flex items-center gap-5 px-6 pb-7 pt-7 sm:px-8">
                        <span
                            aria-hidden
                            className="flex size-16 shrink-0 items-center justify-center rounded-full bg-ink-deep font-display text-lg font-semibold tracking-tight text-canvas"
                        >
                            {initials(user.name)}
                        </span>

                        <div className="min-w-0">
                            <h2 className="truncate font-display text-2xl font-semibold tracking-tight text-ink">
                                {user.name}
                            </h2>

                            <p className="mt-1 flex items-center gap-2 text-sm text-ink-muted">
                                <Mail size={14} className="shrink-0" />
                                <span className="truncate">{user.email}</span>
                            </p>
                        </div>
                    </div>

                    <div className="border-t border-dashed border-line-strong bg-canvas px-6 py-7 sm:px-8">
                        {carrier ? (
                            <>
                                <dl className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end sm:gap-8">
                                    <div className="min-w-0">
                                        <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                                            Transportista
                                        </dt>
                                        <dd className="mt-2 truncate font-display text-lg font-semibold tracking-tight text-ink">
                                            {carrier.name}
                                        </dd>
                                    </div>

                                    <div>
                                        <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                                            Código
                                        </dt>
                                        <dd className="mt-2 inline-flex items-center gap-2.5 rounded-md border border-line-strong bg-surface px-3.5 py-2">
                                            <span aria-hidden className="size-2 shrink-0 rounded-xs bg-primary" />
                                            <span className="font-mono text-[17px] uppercase leading-none tracking-[0.24em] text-ink">
                                                {carrier.code}
                                            </span>
                                        </dd>
                                    </div>
                                </dl>

                                <p className="mt-6 text-xs leading-5 text-ink-subtle">
                                    Este código identifica al transportista en cada guía de carga.
                                </p>
                            </>
                        ) : (
                            <div>
                                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                                    Transportista
                                </p>
                                <p className="mt-2 text-sm text-ink-muted">
                                    Esta cuenta no opera bajo un transportista.
                                </p>
                            </div>
                        )}
                    </div>
                </article>
            </FadeInUp>
        </div>
    );
}
