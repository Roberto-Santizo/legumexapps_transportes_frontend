import type { RootState } from "@/config/config";
import { AdminSidebar } from "@/features/shared/shared";
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
    // el setter se cablea al toggle del header en el paso 9
    const [collapsed] = useState(readCollapsed);

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
                <main className="flex-1 overflow-y-auto bg-canvas">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
