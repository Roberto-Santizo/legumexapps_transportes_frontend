import type { NavItem } from "@/features/shared/shared";
import { Apple, Car, Fuel, LayoutDashboard, MapPinned } from "lucide-react";

export const NAVIGATION: NavItem[] = [
    { to: "/dashboard", text: "Dashboard", icon: <LayoutDashboard /> },
    { to: "/vehiculos", text: "Vehículos", icon: <Car />, disabled: false, roles: ['carrier', 'administrator'] },
    { to: "/gasolina-precios", text: "Combustible", icon: <Fuel />, disabled: false, roles: ['administrator'] },
    { to: "/productos", text: "Productos", icon: <Apple />, disabled: false, roles: ['administrator'] },
    { to: "/zonas", text: "Zonas", icon: <MapPinned />, disabled: false, roles: ['administrator'] },
];
