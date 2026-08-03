type Props = {
    collapsed?: boolean;
}

export function CustomSideBar({ collapsed = false }: Props) {
    return (
        <aside
            className={`flex h-full shrink-0 flex-col gap-3 overflow-hidden py-3 transition-[width] duration-200 ease-out ${collapsed ? "w-0 px-0" : "w-64 px-3"
                }`}
        >
            <div className="flex h-10 shrink-0 items-center gap-2 px-2">
                <img
                    src="https://legumexappsapi-storage.s3.us-east-1.amazonaws.com/resources/LOGO_LX_V2.png"
                    alt="Logo"
                    className="size-6 object-contain"
                />

                <span className="truncate text-[15px] font-semibold tracking-tight text-ink">
                    Producción
                </span>
            </div>

            <nav className="flex-1 overflow-y-auto">
                
            </nav>
        </aside>
    );
}
