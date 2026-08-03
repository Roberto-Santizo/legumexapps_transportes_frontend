import { ToastNotificationProvider } from "@/features/shared/core/notifications/ToastNotificationProvider";

interface NotificationProviderHotData {
    notificationProvider?: ToastNotificationProvider;
}

const hotData = import.meta.hot?.data as NotificationProviderHotData | undefined;

/** Instancia única del adapter. Se preserva entre recargas de HMR para no perder la cola de toasts. */
export const notificationProvider: ToastNotificationProvider =
    hotData?.notificationProvider ?? new ToastNotificationProvider();

if (import.meta.hot) import.meta.hot.data.notificationProvider = notificationProvider;
