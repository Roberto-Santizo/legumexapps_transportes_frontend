import { createContext, type Context } from "react";
import { type NotificationAdapter } from "@/features/shared/domain/domain";

interface NotificationHotData {
    notificationContext?: Context<NotificationAdapter | null>;
}

const hotData = import.meta.hot?.data as NotificationHotData | undefined;

export const NotificationContext: Context<NotificationAdapter | null> =
    hotData?.notificationContext ?? createContext<NotificationAdapter | null>(null);

if (import.meta.hot) import.meta.hot.data.notificationContext = NotificationContext;
