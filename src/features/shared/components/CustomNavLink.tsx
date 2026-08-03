import { NavLink } from "react-router-dom";

type Props = {
    to: string;
    text: string;
    icon: React.ReactNode;
}

export function CustomNavLink({ text, icon, to }: Props) {
    return (
        <li>
            <NavLink
                to={to}
                className={({ isActive }) =>
                    `group flex items-center gap-2.5 rounded-lg border px-3 py-2 text-[13px] font-medium transition-colors [&>svg]:size-4 ${isActive
                        ? "border-line bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                        : "border-transparent text-ink-muted hover:bg-black/4 hover:text-ink"
                    }`
                }
            >
                <span className="flex shrink-0 [&>svg]:size-4">
                    {icon}
                </span>

                <span>{text}</span>
            </NavLink>
        </li>
    )
}
