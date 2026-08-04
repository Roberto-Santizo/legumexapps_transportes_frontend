import type { NavItem } from "@/features/shared/shared";
import { NavLink } from "react-router-dom";

type Props = {
    item: NavItem;
    collapsed: boolean;
    onNavigate?: () => void;
};

/* Tramo de la espina de ruta: mismo gradiente punteado que `route_line`, sin la animación. */
const ROUTE_DOTS = "linear-gradient(to bottom, var(--color-line) 0 4px, transparent 4px 8px)";
const ROUTE_DOTS_FAINT =
    "linear-gradient(to bottom, color-mix(in srgb, var(--color-line) 55%, transparent) 0 4px, transparent 4px 8px)";

const ROW =
    "group relative flex h-14 w-full items-center transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink/20";

const TOOLTIP =
    "pointer-events-none invisible absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs text-canvas shadow-sm group-hover:visible group-focus-visible:visible";

export function AdminNavItem({ item, collapsed, onNavigate }: Props) {
    const { to, text, icon, disabled } = item;

    const station = (isActive: boolean) => {
        const chip = disabled
            ? "border-dashed border-line text-ink-subtle"
            : isActive
                ? "border-primary text-ink"
                : "border-line text-ink-muted group-hover:text-ink";

        const label = disabled
            ? "text-ink-subtle"
            : isActive
                ? "text-ink font-medium"
                : "text-ink-muted group-hover:text-ink";

        return (
            <>
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 left-8 w-px -translate-x-1/2"
                    style={{
                        backgroundImage: disabled ? ROUTE_DOTS_FAINT : ROUTE_DOTS,
                        backgroundSize: "1px 8px",
                        backgroundRepeat: "repeat-y",
                    }}
                />

                <span className="relative z-10 flex w-16 shrink-0 justify-center">
                    <span
                        className={`flex size-9 items-center justify-center rounded-full border bg-surface transition-colors duration-150 [&>svg]:size-4.5 ${chip}`}
                    >
                        {icon}
                    </span>
                </span>

                <span className="relative z-10 min-w-0 flex-1 overflow-hidden">
                    <span
                        className={`block whitespace-nowrap text-[13px] transition-[opacity,transform] duration-200 ease-out ${label} ${collapsed ? "-translate-x-1 opacity-0" : "translate-x-0 opacity-100"
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
                <div aria-disabled="true" className={`${ROW} cursor-not-allowed`}>
                    {station(false)}
                </div>
            </li>
        );
    }

    return (
        <li>
            <NavLink to={to} onClick={onNavigate} className={`${ROW} hover:bg-black/4`}>
                {({ isActive }) => station(isActive)}
            </NavLink>
        </li>
    );
}
