import { useSyncExternalStore } from "react";
import { notificationProvider } from "@/features/shared/core/notifications/notificationInstance";
import type { NotificationState } from "@/features/shared/core/notifications/ToastNotificationProvider";

/** Suscribe un componente al store de notificaciones. Uso interno de ToastViewport y ConfirmNotificationDialog. */
export const useNotificationState = (): NotificationState =>
    useSyncExternalStore(
        notificationProvider.subscribe,
        notificationProvider.getSnapshot,
        notificationProvider.getSnapshot
    );
