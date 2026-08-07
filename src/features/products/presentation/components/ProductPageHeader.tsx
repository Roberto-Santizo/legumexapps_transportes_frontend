import { Title } from "@/features/shared/shared";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";

type Props = {
    title: string;
    subtitle: string;
    children?: ReactNode;
}

export function ProductPageHeader({ title, subtitle, children }: Props) {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col gap-5">
            <button
                type="button"
                onClick={() => navigate('/productos')}
                className="inline-flex w-fit cursor-pointer items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle transition-colors hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
            >
                <ArrowLeft size={14} />
                Productos
            </button>

            <div className="flex flex-wrap items-end justify-between gap-4">
                <Title title={title} subtitle={subtitle} />
                {children}
            </div>
        </div>
    );
}
