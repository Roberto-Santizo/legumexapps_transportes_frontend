import type { NotificationAdapter, ToastItem, ToastVariant } from "@/features/shared/domain/domain";

export type NotificationState = {
    toasts: ToastItem[];
    confirms: ToastItem[];
};

const DEFAULT_DURATION = 4000;
const ERROR_DURATION = 6000;

/**
 * Store externo (fuera de React) que implementa el contrato NotificationAdapter.
 * Vive fuera del árbol de componentes porque los métodos se invocan desde
 * callbacks de mutaciones, interceptores de axios, etc. Los componentes lo leen
 * con useSyncExternalStore.
 */
export class ToastNotificationProvider implements NotificationAdapter {
    private state: NotificationState = { toasts: [], confirms: [] };
    private listeners = new Set<() => void>();
    private timers = new Map<string, ReturnType<typeof setTimeout>>();

    subscribe = (listener: () => void) => {
        this.listeners.add(listener);

        return () => {
            this.listeners.delete(listener);
        };
    };

    /** Devuelve siempre la misma referencia entre mutaciones (requisito de useSyncExternalStore). */
    getSnapshot = (): NotificationState => this.state;

    success = (message: string) => {
        this.push("success", message, DEFAULT_DURATION);
    };

    error = (message: string) => {
        this.push("error", message, ERROR_DURATION);
    };

    warning = (message: string) => {
        this.push("warning", message, DEFAULT_DURATION);
    };

    information = (message: string) => {
        this.push("info", message, DEFAULT_DURATION);
    };

    question = (message: string, buttonLabel: string, desc: string, callBack: () => void) => {
        const item: ToastItem = {
            id: this.createId(),
            variant: "question",
            message,
            description: desc,
            action: { label: buttonLabel, onClick: callBack },
            duration: 0
        };

        this.state = { ...this.state, confirms: [...this.state.confirms, item] };
        this.emit();
    };

    dismiss = (id: string) => {
        const timer = this.timers.get(id);

        if (timer) {
            clearTimeout(timer);
            this.timers.delete(id);
        }

        if (!this.state.toasts.some((toast) => toast.id === id)) return;

        this.state = { ...this.state, toasts: this.state.toasts.filter((toast) => toast.id !== id) };
        this.emit();
    };

    resolveConfirm = (id: string, confirmed: boolean) => {
        const item = this.state.confirms.find((confirm) => confirm.id === id);

        if (!item) return;

        this.state = { ...this.state, confirms: this.state.confirms.filter((confirm) => confirm.id !== id) };
        this.emit();

        if (confirmed) item.action?.onClick();
    };

    private push(variant: ToastVariant, message: string, duration: number) {
        const id = this.createId();

        this.state = { ...this.state, toasts: [...this.state.toasts, { id, variant, message, duration }] };
        this.emit();

        if (duration > 0) {
            this.timers.set(id, setTimeout(() => this.dismiss(id), duration));
        }
    }

    private createId(): string {
        if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
            return crypto.randomUUID();
        }

        return `toast_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    }

    private emit() {
        this.listeners.forEach((listener) => listener());
    }
}
