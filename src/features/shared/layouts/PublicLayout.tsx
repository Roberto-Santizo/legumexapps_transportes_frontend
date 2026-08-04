import type { RootState } from "@/config/config";
import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";

export function PublicLayout() {
    const isSignedIn = useSelector((state: RootState) => state.auth.isSignedIn);

    if (isSignedIn) return <Navigate to={'/dashboard'} />
    return (
        <Outlet />
    )
}
