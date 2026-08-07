import type { RootState } from "@/config/config";
import { AdminNavItem, NAVIGATION, type UserRole } from "@/features/shared/shared";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";

const LOGO = "https://legumexappsapi-storage.s3.us-east-1.amazonaws.com/resources/LOGO_LX_V2.png";

type Props = {
    collapsed: boolean;
    onNavigate?: () => void;
};

export function AdminSidebar({ collapsed, onNavigate }: Props) {
    const role = useSelector((state: RootState) => state.auth.user?.role);

    const items = NAVIGATION.filter(
        (item) => !item.roles || item.roles.includes(role as UserRole)
    );

    return (
        <aside
            className={`flex h-full shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200 ease-out ${collapsed ? "w-16" : "w-64"
                }`}
        >
            <Link
                to="/dashboard"
                onClick={onNavigate}
                className="group flex h-16 shrink-0 items-center border-b border-line px-3 focus-visible:outline-none"
            >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-canvas ring-1 ring-line transition-colors duration-150 group-hover:ring-line-strong group-focus-visible:ring-2 group-focus-visible:ring-ink/25">
                    <img src={LOGO} alt="Legumex" className="size-5 object-contain" />
                </span>

                <span className="min-w-0 flex-1 overflow-hidden pl-3">
                    <span
                        className={`block transition-[opacity,transform] duration-200 ease-out ${collapsed ? "-translate-x-1 opacity-0" : "translate-x-0 opacity-100"
                            }`}
                    >
                        <span className="block whitespace-nowrap font-mono text-[10px] leading-none tracking-[0.18em] text-ink-subtle uppercase">
                            Legumex
                        </span>
                        <span className="mt-1.5 block whitespace-nowrap font-display text-[15px] leading-none font-semibold tracking-tight text-ink">
                            Transportes
                        </span>
                    </span>
                </span>
            </Link>

            <nav className="flex-1 overflow-x-hidden overflow-y-auto py-4">
                <ul className="flex flex-col gap-1 px-3">
                    {items.map((item) => (
                        <AdminNavItem
                            key={item.to}
                            item={item}
                            collapsed={collapsed}
                            onNavigate={onNavigate}
                        />
                    ))}
                </ul>
            </nav>
        </aside>
    );
}
