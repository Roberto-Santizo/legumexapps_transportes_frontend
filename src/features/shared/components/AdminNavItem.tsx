import type { NavItem } from "@/features/shared/shared";
import { NavLink } from "react-router-dom";

type Props = {
    item: NavItem;
    collapsed: boolean;
    onNavigate?: () => void;
};

const ROW =
    "group relative flex h-10 w-full items-center rounded-xl transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/25";

const TOOLTIP =
    "pointer-events-none invisible absolute top-1/2 left-full z-50 ml-3 -translate-y-1/2 rounded-lg bg-ink-deep px-2.5 py-1.5 text-xs whitespace-nowrap text-canvas shadow-lg group-hover:visible group-focus-visible:visible";

export function AdminNavItem({ item, collapsed, onNavigate }: Props) {
    const { to, text, icon, disabled } = item;

    const station = (isActive: boolean) => {
        const iconTone = disabled
            ? "text-ink-subtle"
            : isActive
                ? "text-primary"
                : "text-ink-subtle group-hover:text-ink-muted";

        const label = disabled
            ? "text-ink-subtle"
            : isActive
                ? "font-medium text-canvas"
                : "";

        return (
            <>
                <span
                    className={`flex w-10 shrink-0 items-center justify-center transition-colors duration-150 [&>svg]:size-4.5 [&>svg]:stroke-[1.75] ${iconTone}`}
                >
                    {icon}
                </span>

                <span className="min-w-0 flex-1 overflow-hidden pr-3">
                    <span
                        className={`block text-[13px] whitespace-nowrap transition-[opacity,transform] duration-200 ease-out ${label} ${collapsed ? "-translate-x-1 opacity-0" : "translate-x-0 opacity-100"
                            }`}
                    >
                        {text}
                    </span>
                </span>

                {collapsed && (
                    <span aria-hidden="true" className={TOOLTIP}>
                        {text}
                    </span>
                )}
            </>
        );
    };

    if (disabled) {
        return (
            <li>
                <div aria-disabled="true" className={`${ROW} cursor-not-allowed text-ink-subtle`}>
                    {station(false)}
                </div>
            </li>
        );
    }

    return (
        <li>
            <NavLink
                to={to}
                onClick={onNavigate}
                className={({ isActive }) =>
                    `${ROW} ${isActive
                        ? "bg-ink-deep text-canvas shadow-sm"
                        : "text-ink-muted hover:bg-canvas hover:text-ink"
                    }`
                }
            >
                {({ isActive }) => station(isActive)}
            </NavLink>
        </li>
    );
}
