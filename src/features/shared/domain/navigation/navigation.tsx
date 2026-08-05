import type { NavItem } from "@/features/shared/shared";
import { Car, LayoutDashboard } from "lucide-react";

export const NAVIGATION: NavItem[] = [
    { to: "/dashboard", text: "Dashboard", icon: <LayoutDashboard /> },
    { to: "/vehiculos", text: "Vehículos", icon: <Car />, disabled: false, roles: ['carrier', 'administrator'] },
];
