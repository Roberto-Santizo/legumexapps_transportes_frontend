import type { ReactNode } from "react";

type Props = {
    eyebrow: string;
    title: string;
    description?: string;
    aside?: ReactNode;
    children: ReactNode;
};

export function PanelShell({ eyebrow, title, description, aside, children }: Props) {
    return (
        <section className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface">
            <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-6 py-5">
                <div className="min-w-0">
                    <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                        {eyebrow}
                    </p>

                    <h2 className="mt-2 font-display text-lg font-semibold tracking-tight text-ink">
                        {title}
                    </h2>

                    {description && (
                        <p className="mt-1 max-w-[52ch] text-sm text-ink-muted">
                            {description}
                        </p>
                    )}
                </div>

                {aside}
            </header>

            {children}
        </section>
    );
}
