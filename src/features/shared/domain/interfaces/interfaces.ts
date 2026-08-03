export interface NotificationAdapter {
    success(message: string): void;
    error(message: string): void;
    warning(message: string): void;
    information(message: string): void;
    question(message: string, buttonLabel: string, desc: string, callBack: () => void): void;
}
