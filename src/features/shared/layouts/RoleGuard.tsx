import type { RootState } from "@/config/config";
import { can, homeRoute, type Permission } from "@/features/shared/shared";
import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";

type Props = {
    permission: Permission;
    /** A dónde mandar a quien no tiene el permiso; por defecto, su pantalla de inicio. */
    redirectTo?: string;
};

/**
 * Corta la ruta antes de montar la pantalla cuando el rol recibiría 403 del
 * middleware `role:`. Va anidado dentro de `ProtectedLayout`, que ya resolvió
 * la sesión.
 */
export function RoleGuard({ permission, redirectTo }: Props) {
    const role = useSelector((state: RootState) => state.auth.user?.role);

    if (!can(role, permission)) return <Navigate to={redirectTo ?? homeRoute(role)} replace />;

    return <Outlet />;
}
