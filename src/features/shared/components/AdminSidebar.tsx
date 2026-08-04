import type { RootState } from "@/config/config";
import { AdminNavItem, NAVIGATION, type UserRole } from "@/features/shared/shared";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";

const LOGO = "https://legumexappsapi-storage.s3.us-east-1.amazonaws.com/resources/LOGO_LX_V2.png";

type Props = {
    collapsed: boolean;
};

export function AdminSidebar({ collapsed }: Props) {
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
                className="flex h-16 shrink-0 items-center border-b border-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink/20"
            >
                <span className="flex w-16 shrink-0 justify-center">
                    <img src={LOGO} alt="Legumex" className="size-6 object-contain" />
                </span>

                <span className="min-w-0 flex-1 overflow-hidden">
                    <span
                        className={`block whitespace-nowrap font-display text-[15px] font-semibold tracking-tight text-ink transition-[opacity,transform] duration-200 ease-out ${collapsed ? "-translate-x-1 opacity-0" : "translate-x-0 opacity-100"
                            }`}
                    >
                        Transportes
                    </span>
                </span>
            </Link>

            <nav className="flex-1">
                <ul>
                    {items.map((item) => (
                        <AdminNavItem key={item.to} item={item} collapsed={collapsed} />
                    ))}
                </ul>
            </nav>
        </aside>
    );
}
