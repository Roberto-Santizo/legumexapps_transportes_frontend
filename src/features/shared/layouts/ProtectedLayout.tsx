import type { RootState } from "@/config/config";
import { AdminHeader, AdminSidebar } from "@/features/shared/shared";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";

const SIDEBAR_COLLAPSED = "SIDEBAR_COLLAPSED";

function readCollapsed(): boolean {
    try {
        return localStorage.getItem(SIDEBAR_COLLAPSED) === "true";
    } catch {
        // localStorage deshabilitado: el sidebar arranca expandido
        return false;
    }
}

export function ProtectedLayout() {
    const isSignedIn = useSelector((state: RootState) => state.auth.isSignedIn);
    const [collapsed, setCollapsed] = useState(readCollapsed);
    const [drawerOpen, setDrawerOpen] = useState(false);

    useEffect(() => {
        try {
            localStorage.setItem(SIDEBAR_COLLAPSED, String(collapsed));
        } catch {
            // sin persistencia el sidebar sigue funcionando
        }
    }, [collapsed]);

    if (!isSignedIn) return <Navigate to={'/login'} />

    return (
        <div className="flex h-screen overflow-hidden bg-canvas">
            <div className="hidden shrink-0 lg:flex">
                <AdminSidebar collapsed={collapsed} />
            </div>

            <Dialog open={drawerOpen} onClose={setDrawerOpen} className="relative z-50 lg:hidden">
                <DialogBackdrop
                    transition
                    className="fixed inset-0 bg-ink/40 transition duration-200 ease-out data-closed:opacity-0"
                />

                <div className="fixed inset-0 flex">
                    <DialogPanel
                        transition
                        className="transition duration-200 ease-out data-closed:-translate-x-full"
                    >
                        <DialogTitle className="sr-only">Navegación</DialogTitle>
                        <AdminSidebar collapsed={false} onNavigate={() => setDrawerOpen(false)} />
                    </DialogPanel>
                </div>
            </Dialog>

            <div className="flex min-w-0 flex-1 flex-col">
                <AdminHeader
                    collapsed={collapsed}
                    onToggle={() => setCollapsed((value) => !value)}
                    onOpenDrawer={() => setDrawerOpen(true)}
                />

                <main className="flex-1 overflow-y-auto bg-canvas">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
