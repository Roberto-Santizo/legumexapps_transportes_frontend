import type { RootState } from "@/config/config";
import { homeRoute } from "@/features/shared/shared";
import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";

export function PublicLayout() {
    const isSignedIn = useSelector((state: RootState) => state.auth.isSignedIn);
    const role = useSelector((state: RootState) => state.auth.user?.role);

    if (isSignedIn) return <Navigate to={homeRoute(role)} />
    return (
        <Outlet />
    )
}
