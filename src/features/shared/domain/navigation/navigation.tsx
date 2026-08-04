import type { NavItem } from "@/features/shared/shared";
import { IdCard, LayoutDashboard, Route, Truck } from "lucide-react";

export const NAVIGATION: NavItem[] = [
    { to: "/dashboard", text: "Dashboard", icon: <LayoutDashboard /> },
    { to: "/viajes", text: "Viajes", icon: <Route />, disabled: true },
    { to: "/pilotos", text: "Pilotos", icon: <IdCard />, disabled: true },
    { to: "/vehiculos", text: "Vehículos", icon: <Truck />, disabled: true },
];
