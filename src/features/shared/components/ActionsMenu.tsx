import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { EllipsisVertical } from "lucide-react";
import type { ReactNode } from "react";

export type ActionMenuItem = {
    label: string;
    icon: ReactNode;
    onClick: () => void;
    danger?: boolean;
};

type Props = {
    items: ActionMenuItem[];
};

export function ActionsMenu({ items }: Props) {
    return (
        <Menu as="div" className="relative inline-block text-left">
            <MenuButton
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center justify-center rounded-lg p-2 text-ink-muted transition-colors duration-150 hover:bg-canvas hover:text-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
            >
                <EllipsisVertical size={18} />
            </MenuButton>

            <MenuItems
                anchor="bottom end"
                portal
                transition
                className="z-20 w-44 origin-top-right rounded-xl border border-line bg-surface p-1 shadow-lg transition duration-150 ease-out [--anchor-gap:6px] focus:outline-none data-closed:scale-95 data-closed:opacity-0"
            >
                {items.map((item, index) => (
                    <MenuItem key={index}>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                item.onClick();
                            }}
                            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors duration-100 [&>svg]:h-4 [&>svg]:w-4 data-focus:outline-none ${item.danger ? "text-red-600 data-focus:bg-red-50" : "text-ink data-focus:bg-canvas"
                                }`}
                        >
                            {item.icon}
                            {item.label}
                        </button>
                    </MenuItem>
                ))}
            </MenuItems>
        </Menu>
    );
}
