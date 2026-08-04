import { Menu, MenuButton, MenuItems } from "@headlessui/react";
import { Bell } from "lucide-react";

export function NotificationsMenu() {
    return (
        <Menu as="div" className="relative inline-block text-left">
            <MenuButton
                aria-label="Notificaciones"
                className="inline-flex items-center justify-center rounded-lg p-2 text-ink-muted transition-colors duration-150 hover:bg-canvas hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
            >
                <Bell size={18} />
            </MenuButton>

            <MenuItems
                anchor="bottom end"
                portal
                transition
                className="z-20 w-72 origin-top-right rounded-xl border border-line bg-surface p-1 shadow-lg transition duration-150 ease-out [--anchor-gap:6px] focus:outline-none data-closed:scale-95 data-closed:opacity-0"
            >
                <p className="px-3 py-6 text-center text-sm text-ink-muted">
                    No tienes notificaciones
                </p>
            </MenuItems>
        </Menu>
    );
}
