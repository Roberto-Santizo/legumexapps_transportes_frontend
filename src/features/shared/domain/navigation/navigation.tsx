import type { NavItem, UserRole } from "@/features/shared/shared";
// Import directo, no por el barrel: `NAVIGATION` usa `PERMISSIONS` al evaluarse el
// módulo y el barrel de `shared` forma un ciclo que lo deja sin inicializar.
import { PERMISSIONS } from "@/features/shared/domain/permissions/permissions";
import { Apple, Building2, Car, Fuel, IdCard, LayoutDashboard, MapPin, Route, Ship, Sparkles, Warehouse, Wrench } from "lucide-react";

/**
 * El menú sigue los flujos por rol de `roles-api.md` §6, no solo la matriz de
 * lectura: `carrier` y `pilot` pueden leer los catálogos (los usan dentro de
 * otras pantallas), pero no los administran, así que no se les ofrecen como
 * sección. Las rutas sí se protegen con el permiso de lectura (`RoleGuard`).
 */
const CORE_CATALOGS: UserRole[] = ['administrator', 'manager'];
const TRIP_CATALOGS: UserRole[] = ['administrator', 'manager', 'export'];

export const NAVIGATION: NavItem[] = [
    { to: "/dashboard", text: "Dashboard", icon: <LayoutDashboard />, roles: PERMISSIONS.dashboard },
    { to: "/vehiculos", text: "Vehículos", icon: <Car />, roles: PERMISSIONS.readVehicles },
    { to: "/gasolina-precios", text: "Combustible", icon: <Fuel />, roles: CORE_CATALOGS },
    { to: "/productos", text: "Productos", icon: <Apple />, roles: CORE_CATALOGS },
    // { to: "/zonas", text: "Zonas", icon: <MapPinned />, roles: CORE_CATALOGS },
    { to: "/puntos-de-partida", text: "Puntos de partida", icon: <Warehouse />, roles: TRIP_CATALOGS },
    { to: "/ubicaciones", text: "Ubicaciones", icon: <MapPin />, roles: TRIP_CATALOGS },
    { to: "/accesorios", text: "Accesorios", icon: <Wrench />, roles: CORE_CATALOGS },
    { to: "/clientes", text: "Clientes", icon: <Building2 />, roles: TRIP_CATALOGS },
    { to: "/navieras", text: "Navieras", icon: <Ship />, roles: TRIP_CATALOGS },
    { to: "/pilotos", text: "Pilotos", icon: <IdCard />, roles: PERMISSIONS.readPilots },
    { to: "/viajes", text: "Viajes", icon: <Route />, roles: [...PERMISSIONS.readTrips] },
    { to: "/inteligencia-artificial", text: "Inteligencia Artificial", icon: <Sparkles />, roles: PERMISSIONS.assistant },
];
