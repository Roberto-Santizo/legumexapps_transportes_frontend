import { ConfirmNotificationDialog } from "@/features/shared/components/ConfirmNotificationDialog";
import { NotificationContext } from "@/features/shared/core/notifications/NotificationContext";
import { notificationProvider } from "@/features/shared/core/notifications/notificationInstance";
import { ToastViewport } from "@/features/shared/components/ToastViewport";

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
    return (
        <NotificationContext.Provider value={notificationProvider}>
            {children}
            <ToastViewport />
            <ConfirmNotificationDialog />
        </NotificationContext.Provider>
    );
};
