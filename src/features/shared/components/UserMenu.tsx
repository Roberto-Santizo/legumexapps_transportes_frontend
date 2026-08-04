import type { AppDispatch, RootState } from "@/config/config";
import { logout } from "@/features/auth/slices/authSlice";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { LogOut } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";

function getInitials(name: string): string {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word.charAt(0))
        .join("")
        .toUpperCase();
}

export function UserMenu() {
    const user = useSelector((state: RootState) => state.auth.user);
    const dispatch = useDispatch<AppDispatch>();

    if (!user) return null;

    return (
        <Menu as="div" className="relative inline-block text-left">
            <MenuButton className="flex items-center gap-2 rounded-lg p-1 transition-colors duration-150 hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-[11px] font-semibold text-ink-muted">
                    {getInitials(user.name)}
                </span>

                <span className="hidden min-w-0 flex-col items-start sm:flex">
                    <span className="max-w-40 truncate text-[13px] font-medium text-ink">
                        {user.name}
                    </span>

                    <span className="max-w-40 truncate font-mono text-[10px] uppercase tracking-wider text-ink-subtle">
                        {user.role}
                    </span>
                </span>
            </MenuButton>

            <MenuItems
                anchor="bottom end"
                portal
                transition
                className="z-20 w-52 origin-top-right rounded-xl border border-line bg-surface p-1 shadow-lg transition duration-150 ease-out [--anchor-gap:6px] focus:outline-none data-closed:scale-95 data-closed:opacity-0"
            >
                <MenuItem>
                    <button
                        type="button"
                        onClick={() => dispatch(logout())}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger transition-colors duration-100 data-focus:bg-danger/8 data-focus:outline-none [&>svg]:size-4"
                    >
                        <LogOut />
                        Cerrar sesión
                    </button>
                </MenuItem>
            </MenuItems>
        </Menu>
    );
}
