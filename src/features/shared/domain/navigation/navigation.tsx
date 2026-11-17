import type { NavItem, UserRole } from "@/features/shared/shared";
// Import directo, no por el barrel: `NAVIGATION` usa `PERMISSIONS` al evaluarse el
// módulo y el barrel de `shared` forma un ciclo que lo deja sin inicializar.
import { PERMISSIONS } from "@/features/shared/domain/permissions/permissions";
import { Apple, Boxes, Building2, Car, Fuel, IdCard, LayoutDashboard, MapPin, Route, Ship, Sparkles, Warehouse, Wrench } from "lucide-react";

/**
 * El menú es más estrecho que la matriz de lectura: cada rol ve solo las
 * secciones de su flujo de trabajo, aunque pueda leer más (los catálogos se
 * usan dentro de otras pantallas). Las rutas siguen protegidas con el permiso
 * de lectura (`RoleGuard`).
 *
 * - `administrator`: todo.
 * - `export`: tablero, catálogos de viaje, productos terminados y viajes.
 * - `manager`: viajes e inteligencia artificial.
 * - `shipment`: viajes.
 * - `carrier`: tablero, vehículos, pilotos, viajes e inteligencia artificial.
 * - `user`: productos terminados y viajes.
 */
const ADMIN_ONLY: UserRole[] = ['administrator'];
const TRIP_CATALOGS: UserRole[] = ['administrator', 'export'];
const CARRIER_FLEET: UserRole[] = ['administrator', 'carrier'];

export const NAVIGATION: NavItem[] = [
    { to: "/dashboard", text: "Dashboard", icon: <LayoutDashboard />, roles: PERMISSIONS.dashboard },
    { to: "/vehiculos", text: "Vehículos", icon: <Car />, roles: CARRIER_FLEET },
    { to: "/gasolina-precios", text: "Combustible", icon: <Fuel />, roles: ADMIN_ONLY },
    { to: "/productos", text: "Productos", icon: <Apple />, roles: ADMIN_ONLY },
    // { to: "/zonas", text: "Zonas", icon: <MapPinned />, roles: ADMIN_ONLY },
    { to: "/puntos-de-partida", text: "Puntos de partida", icon: <Warehouse />, roles: TRIP_CATALOGS },
    { to: "/ubicaciones", text: "Ubicaciones", icon: <MapPin />, roles: TRIP_CATALOGS },
    { to: "/accesorios", text: "Accesorios", icon: <Wrench />, roles: ADMIN_ONLY },
    { to: "/clientes", text: "Clientes", icon: <Building2 />, roles: TRIP_CATALOGS },
    { to: "/productos-terminados", text: "Productos terminados", icon: <Boxes />, roles: [...TRIP_CATALOGS, 'user'] },
    { to: "/navieras", text: "Navieras", icon: <Ship />, roles: TRIP_CATALOGS },
    { to: "/pilotos", text: "Pilotos", icon: <IdCard />, roles: CARRIER_FLEET },
    { to: "/viajes", text: "Viajes", icon: <Route />, roles: [...PERMISSIONS.readTrips] },
    { to: "/inteligencia-artificial", text: "Inteligencia Artificial", icon: <Sparkles />, roles: ['administrator', 'manager'] },
];
