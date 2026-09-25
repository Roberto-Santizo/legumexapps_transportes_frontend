/**
 * Matriz de permisos por rol. Réplica en el cliente de
 * `src/references/feat-references/roles-api.md` §4: la API no expone un
 * endpoint «¿qué puedo hacer?», así que esta tabla es la única fuente para
 * pintar menús, rutas y botones.
 *
 * Esconder una opción es cortesía, no seguridad: el backend decide siempre y
 * los 403 de ámbito (recurso de otra empresa u otro piloto) solo se conocen al
 * llamar.
 */

export const USER_ROLES = ['administrator', 'manager', 'carrier', 'pilot', 'export', 'user', 'shipment'] as const;

export type UserRole = typeof USER_ROLES[number];

/** Las etiquetas de `UserRole::label()` del backend. */
export const ROLE_LABEL: Record<UserRole, string> = {
    administrator: 'Administrador',
    manager: 'Encargado',
    carrier: 'Transportista',
    pilot: 'Piloto',
    export: 'Exportación',
    user: 'Usuario',
    shipment: 'Embarque',
};

const ALL: readonly UserRole[] = USER_ROLES;
const except = (...excluded: UserRole[]): UserRole[] => USER_ROLES.filter((role) => !excluded.includes(role));

export const PERMISSIONS = {
    /** Entrar a la web. El piloto opera solo desde la app móvil. */
    webAccess: except('pilot'),

    /* Catálogos: todos leen menos `user` y `shipment`, que ven los nombres ya embebidos en el viaje. */
    readCatalogs: except('user', 'shipment'),
    /** `products`, `zones`, `fuel-prices`, `freight-rates`, `accessories`, `accessory-characteristics`. */
    writeCoreCatalogs: ['administrator'],
    /** `clients`, `shipping-lines`, `locations`, `departure-points`. */
    writeTripCatalogs: ['administrator', 'export'],
    /** `finished-products`: al revés que el resto de catálogos, `user` y `shipment` leen y el `pilot` no. Escribe `writeTripCatalogs`. */
    readFinishedProducts: except('pilot'),

    /* Viajes */
    readTrips: ALL,
    manageTrips: ['administrator', 'export'],
    /** Tomar de la bolsa: solo `carrier`, y con empresa (ver `canAssignTrips`). */
    assignTrip: ['carrier'],
    /** Arrancar, cerrar, reportar posición y confirmar cargas/viáticos. */
    driveTrip: ['pilot'],
    /** Rastro, paradas y canal en vivo: el piloto emite pero no observa. */
    readTripTracking: except('pilot'),
    readTripFuels: ALL,
    /** Viáticos y el total de viáticos del viaje: `shipment` no ve dinero. */
    readTripExpenses: except('shipment'),
    /** El desglose revela el salario del piloto. */
    readTripCost: except('shipment', 'pilot'),
    /** El administrador solo sobre viajes ya asignados; el `carrier`, con empresa. */
    registerTripFuelOrExpense: ['administrator', 'carrier'],

    /* Vehículos */
    readVehicles: ['administrator', 'manager', 'carrier', 'export'],
    writeVehicles: ['administrator', 'carrier'],
    editVehicleMileage: ['administrator'],
    readVehicleExpenses: ['administrator', 'manager', 'carrier'],
    writeVehicleExpenses: ['administrator', 'carrier'],

    /* Pilotos */
    readPilots: ['administrator', 'manager', 'carrier', 'export'],
    editSalary: ['administrator', 'carrier'],
    readSalaryHistory: ['administrator', 'manager', 'carrier'],

    /* Empresas: `carrierId` en filtros solo lo honran estos dos. */
    readCarriers: ['administrator', 'manager'],

    /* Tablero y asistente */
    dashboard: ['administrator', 'manager', 'carrier', 'export'],
    assistant: ['administrator', 'manager', 'carrier', 'export'],
} satisfies Record<string, readonly UserRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export const isUserRole = (role?: string): role is UserRole =>
    USER_ROLES.includes(role as UserRole);

/** `role` llega crudo del token: un valor desconocido no tiene ningún permiso. */
export const can = (role: string | undefined, permission: Permission): boolean =>
    isUserRole(role) && (PERMISSIONS[permission] as readonly UserRole[]).includes(role);

/** La etiqueta en español, o el valor crudo si el backend agregó un rol nuevo. */
export const roleLabel = (role?: string): string =>
    isUserRole(role) ? ROLE_LABEL[role] : role ?? '';

/** Pantalla de inicio de cada rol: el tablero si lo tiene, si no los viajes (los siete los leen). */
export const homeRoute = (role?: string): string =>
    can(role, 'dashboard') ? '/dashboard' : '/viajes';
