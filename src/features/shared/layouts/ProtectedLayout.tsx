import type { RootState } from "@/config/config";
import { AdminHeader, AdminSidebar } from "@/features/shared/shared";
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
            <AdminSidebar collapsed={collapsed} />

            <div className="flex min-w-0 flex-1 flex-col">
                <AdminHeader
                    collapsed={collapsed}
                    onToggle={() => setCollapsed((value) => !value)}
                />

                <main className="flex-1 overflow-y-auto bg-canvas">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
