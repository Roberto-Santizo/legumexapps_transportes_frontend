import { AnimatePresence, motion } from "framer-motion";
import { CircleCheck, CircleHelp, CircleX, Info, TriangleAlert, X } from "lucide-react";
import { createPortal } from "react-dom";
import { notificationProvider } from "@/features/shared/core/notifications/notificationInstance";
import { useNotificationState } from "@/features/shared/core/notifications/useNotificationState";
import type { ToastItem, ToastVariant } from "@/features/shared/domain/domain";
import type { LucideIcon } from "lucide-react";

type VariantStyle = {
    label: string;
    icon: LucideIcon;
    text: string;
    rail: string;
};

const VARIANT_STYLES: Record<ToastVariant, VariantStyle> = {
    success: { label: "Éxito", icon: CircleCheck, text: "text-success", rail: "bg-success" },
    error: { label: "Error", icon: CircleX, text: "text-danger", rail: "bg-danger" },
    warning: { label: "Aviso", icon: TriangleAlert, text: "text-primary", rail: "bg-primary" },
    info: { label: "Info", icon: Info, text: "text-ink-muted", rail: "bg-ink-muted" },
    question: { label: "Confirmar", icon: CircleHelp, text: "text-ink", rail: "bg-ink" }
};

function Toast({ toast }: { toast: ToastItem }) {
    const { label, icon: Icon, text, rail } = VARIANT_STYLES[toast.variant];

    return (
        <motion.div
            layout
            role={toast.variant === "error" ? "alert" : "status"}
            initial={{ opacity: 0, x: 24, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto relative flex gap-3 overflow-hidden rounded-lg border border-line bg-surface py-3 pl-4 pr-3 shadow-[0_10px_28px_-12px_rgba(11,23,18,0.28)]"
        >
            <span className="absolute left-0 top-0 h-full w-[3px] bg-line" />
            <motion.span
                className={`absolute left-0 top-0 h-full w-[3px] origin-top ${rail}`}
                initial={{ scaleY: 1 }}
                animate={{ scaleY: toast.duration > 0 ? 0 : 1 }}
                transition={{ duration: toast.duration / 1000, ease: "linear" }}
            />

            <Icon size={16} className={`mt-0.5 shrink-0 ${text}`} />

            <div className="min-w-0 flex-1">
                <p className={`font-mono text-[10px] uppercase tracking-[0.14em] ${text}`}>{label}</p>
                <p className="mt-1 break-words text-sm font-medium text-ink">{toast.message}</p>
                {toast.description && (
                    <p className="mt-0.5 break-words text-[13px] leading-snug text-ink-muted">{toast.description}</p>
                )}
            </div>

            <button
                type="button"
                aria-label="Cerrar"
                onClick={() => notificationProvider.dismiss(toast.id)}
                className="h-fit shrink-0 rounded-md p-1 text-ink-subtle transition-colors hover:bg-canvas hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15"
            >
                <X size={14} />
            </button>
        </motion.div>
    );
}

export function ToastViewport() {
    const { toasts } = useNotificationState();

    return createPortal(
        <div
            aria-live="polite"
            className="pointer-events-none fixed right-4 top-4 z-60 flex w-full max-w-[380px] flex-col gap-2.5"
        >
            <AnimatePresence initial={false}>
                {toasts.map((toast) => (
                    <Toast key={toast.id} toast={toast} />
                ))}
            </AnimatePresence>
        </div>,
        document.body
    );
}
