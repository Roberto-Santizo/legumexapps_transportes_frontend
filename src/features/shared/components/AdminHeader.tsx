import { NAVIGATION, NotificationsMenu, UserMenu } from "@/features/shared/shared";
import { PanelLeft } from "lucide-react";
import { useLocation } from "react-router-dom";

type Props = {
    collapsed: boolean;
    onToggle: () => void;
    onOpenDrawer: () => void;
};

const TOGGLE =
    "shrink-0 items-center justify-center rounded-lg p-2 text-ink-muted transition-colors duration-150 hover:bg-canvas hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20";

export function AdminHeader({ collapsed, onToggle, onOpenDrawer }: Props) {
    const { pathname } = useLocation();

    const title = NAVIGATION.find((item) => item.to === pathname)?.text ?? "";

    return (
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-line bg-surface px-3">
            <button
                type="button"
                onClick={onOpenDrawer}
                aria-label="Abrir navegación"
                className={`inline-flex lg:hidden ${TOGGLE}`}
            >
                <PanelLeft size={18} />
            </button>

            <button
                type="button"
                onClick={onToggle}
                aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
                aria-expanded={!collapsed}
                className={`hidden lg:inline-flex ${TOGGLE}`}
            >
                <PanelLeft size={18} />
            </button>

            <h1 className="truncate font-display text-[15px] font-semibold tracking-tight text-ink">
                {title}
            </h1>

            <div className="ml-auto flex shrink-0 items-center gap-1">
                <NotificationsMenu />
                <UserMenu />
            </div>
        </header>
    );
}
