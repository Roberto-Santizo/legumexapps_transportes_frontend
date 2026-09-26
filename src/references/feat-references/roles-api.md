# Roles y permisos — referencia de integración para el frontend

Qué puede hacer cada uno de los siete roles de la API de Legumex Transportes, endpoint por endpoint, y cómo los rechaza el backend.

Todo lo que hay aquí está verificado contra `routes/*.php`, los middlewares `role:` y `carrier.required` y las guardas de los services. Los mensajes de error son literales: se pueden mostrar tal cual al usuario.

> Documentación OpenAPI viva: `/api/documentation`. Para el detalle de cada endpoint (cuerpos, validaciones, respuestas) ver su `references/<dominio>-api.md`.

---

## 1. Lo mínimo que hay que saber antes de escribir código

1. **Hay siete roles** y cada usuario tiene exactamente uno: `administrator`, `manager`, `carrier`, `pilot`, `export`, `user`, `shipment`. El valor viaja crudo, en inglés.
2. **Solo `pilot` y `carrier` se autorregistran** (`POST /api/auth/register`). Los otros cinco se dan de alta directamente en base de datos: **no existe endpoint de usuarios** ni de cambio de rol.
3. **El rol sale en el JWT** (claim `role`) y en `user.role` de `login`/`check-status`. Úsalo para pintar menús y ocultar botones, **pero el backend decide siempre**: ocultar un botón no es seguridad y la API responde 403 aunque el front se equivoque.
4. **El administrador no tiene "modo dios".** No hay bypass implícito: no puede tomar viajes, arrancarlos, reportar posiciones, confirmar cargas/viáticos, unirse a empresas ni crear una empresa propia. Esas acciones son de `carrier` y `pilot`.
5. **Dos niveles de 403**: el **rol** (middleware, antes de tocar nada) y el **ámbito** (service, cuando el rol pasa pero el recurso es de otra empresa o de otro piloto). Los dos llegan en el mismo sobre; solo cambia el `message`.
6. **`carrierId`/`carrierName`/`carrierCode` del token son informativos** y pueden estar hasta 1 h desfasados. Tras un `POST /api/carriers` o `/carriers/join`, llama a `check-status` para refrescarlos.

---

## 2. Los siete roles de un vistazo

| Rol | Etiqueta sugerida | Se autorregistra | Pertenece a una empresa | Resumen |
|---|---|---|---|---|
| `administrator` | Administrador | No | No | Toda la gestión: catálogos, tarifas, viajes, vehículos de cualquier empresa. No actúa en nombre de transportistas ni pilotos. |
| `manager` | Encargado | No | No | Lee casi todo, **no escribe nada**. |
| `carrier` | Transportista | **Sí** | Sí (es dueño de una) | Gestiona su empresa, su flota, sus pilotos y los viajes que toma de la bolsa. |
| `pilot` | Piloto | **Sí** | Sí (se une con código) | Conduce: ve sus viajes, los arranca/cierra, reporta posición y confirma lo que recibe. |
| `export` | Exportación | No | No | Publica y edita viajes y sus catálogos (clientes, navieras, destinos, puntos de partida). |
| `user` | Usuario | No | No | **Solo lectura de viajes**, de cualquier viaje. Nada más. |
| `shipment` | Embarque | No | No | Como `user`, pero **sin ver dinero** (viáticos y costos). |

> `UserRole::label()` en el backend usa exactamente esas etiquetas en español.

---

## 3. Cómo rechaza la API

### 3.1 Sin token o token vencido → 401

```json
{ "statusCode": 401, "message": "...", "data": null }
```

Acción del front: intentar `check-status` con el `refreshToken`; si también falla, volver al login.

### 3.2 Rol no permitido → 403 (middleware `role:`)

```json
{ "statusCode": 403, "message": "No tienes permisos para acceder a este recurso", "data": null }
```

Siempre el mismo mensaje. Significa "este rol nunca podrá usar este endpoint": el front no debería haber mostrado la opción.

### 3.3 `carrier` o `pilot` sin empresa → 403 (middleware `carrier.required`)

```json
{ "statusCode": 403, "message": "Debes estar vinculado a un transportista para acceder a este recurso", "data": null }
```

Solo afecta a `carrier` y `pilot`; los otros cinco roles están exentos. Se consulta en BD, no en el token. Acción del front: mandar al `carrier` a crear su empresa (`POST /api/carriers`) y al `pilot` a unirse con código (`POST /api/carriers/join`).

### 3.4 Fuera de ámbito → 403 (service)

El rol vale, pero el recurso no es tuyo. Mensajes habituales:

| Mensaje | Cuándo |
|---|---|
| `No puedes acceder a un viaje que no pertenece a tu empresa transportista` | `carrier` sobre un viaje que tomó otra empresa |
| `No puedes acceder a un viaje que no tienes asignado` | `pilot` sobre un viaje de otro piloto |
| `No puedes acceder a un vehículo que no pertenece a tu empresa transportista` | `carrier` sobre vehículo ajeno |
| `No puedes acceder a un piloto que no pertenece a tu empresa transportista` | `carrier` sobre piloto ajeno |
| `No puedes acceder a un gasto que no pertenece a tu empresa transportista` | `carrier` sobre gasto de vehículo ajeno |
| `No puedes actualizar una empresa transportista que no te pertenece` | `carrier` editando otra empresa |
| `No tienes permisos para consultar el rastro de un viaje` | `pilot` en `GET /trips/{trip}/positions` |
| `No tienes permisos para consultar las paradas de un viaje` | `pilot` en `GET /trips/{trip}/timeouts` |
| `No tienes permisos para consultar el costo de un viaje` | `pilot` o `shipment` en `GET /trips/{trip}/cost` |
| `No tienes permisos para consultar los viáticos de un viaje` | `shipment` en `GET /trips/{trip}/expenses` |
| `Solo un administrador puede modificar el kilometraje del vehículo` | `carrier` mandando un `mileage` distinto al guardado |

> **Importante:** un recurso fuera de ámbito es **403, no 404**. El 404 solo significa "no existe" (o, en viajes, "borrado" en lectura).

---

## 4. Matriz completa de permisos

Leyenda: ✅ permitido · 🔒 permitido **acotado a su ámbito** (su empresa o sus viajes; ver §5) · ❌ 403.

Columnas: **Adm** administrator · **Mgr** manager · **Car** carrier · **Pil** pilot · **Exp** export · **Usr** user · **Shp** shipment.

### 4.1 Autenticación (`/api/auth`)

| Endpoint | Adm | Mgr | Car | Pil | Exp | Usr | Shp |
|---|---|---|---|---|---|---|---|
| `POST /register` (público) | — | — | ✅ | ✅ | — | — | — |
| `POST /confirm-account`, `/login`, `/forgot-password`, `/reset-password` (públicos) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET /check-status` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

`register` solo acepta `role: "pilot" | "carrier"`; cualquier otro es 422.

### 4.2 Empresas transportistas (`/api/carriers`)

| Endpoint | Adm | Mgr | Car | Pil | Exp | Usr | Shp |
|---|---|---|---|---|---|---|---|
| `GET /` (listado) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `GET /{carrier}` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `POST /` (crear mi empresa, solo una) | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `PATCH /{carrier}` | ✅ | ❌ | 🔒 la suya | ❌ | ❌ | ❌ | ❌ |
| `DELETE /{carrier}` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `GET /me` | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `GET /me/pilots` | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `POST /join` (unirse con código) | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |

### 4.3 Pilotos (`/api/pilots`)

| Endpoint | Adm | Mgr | Car | Pil | Exp | Usr | Shp |
|---|---|---|---|---|---|---|---|
| `GET /` | ✅ | ✅ | 🔒 | ❌ | ✅ | ❌ | ❌ |
| `PATCH /{pilot}/salary` | ✅ | ❌ | 🔒 | ❌ | ❌ | ❌ | ❌ |
| `GET /{pilot}/salary-history` | ✅ | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ |

### 4.4 Vehículos y sus gastos

| Endpoint | Adm | Mgr | Car | Pil | Exp | Usr | Shp |
|---|---|---|---|---|---|---|---|
| `GET /api/vehicles`, `GET /api/vehicles/{vehicle}` | ✅ | ✅ | 🔒 | ❌ | ✅ | ❌ | ❌ |
| `POST /api/vehicles` | ✅ ¹ | ❌ | 🔒 | ❌ | ❌ | ❌ | ❌ |
| `PATCH /api/vehicles/{vehicle}` | ✅ | ❌ | 🔒 ² | ❌ | ❌ | ❌ | ❌ |
| `DELETE /api/vehicles/{vehicle}` | ✅ | ❌ | 🔒 | ❌ | ❌ | ❌ | ❌ |
| `GET /api/vehicle-expenses`, `GET /{id}` | ✅ | ✅ | 🔒 | ❌ | ❌ | ❌ | ❌ |
| `POST/PATCH/DELETE /api/vehicle-expenses` | ✅ | ❌ | 🔒 | ❌ | ❌ | ❌ | ❌ |

¹ El administrador **debe** mandar `carrier_id` (a qué empresa registra el vehículo). Al `carrier` ese campo se le descarta: se usa su empresa.
² El `carrier` puede editar su vehículo, pero **no cambiar `mileage`** (reenviar el mismo valor sí pasa).

### 4.5 Viajes (`/api/trips`)

| Endpoint | Adm | Mgr | Car | Pil | Exp | Usr | Shp |
|---|---|---|---|---|---|---|---|
| `GET /` (listado) | ✅ | ✅ | 🔒 | 🔒 | ✅ | ✅ | ✅ |
| `GET /{trip}` | ✅ | ✅ | 🔒 | 🔒 | ✅ | ✅ | ✅ ³ |
| `POST /` (publicar) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `PATCH /{trip}` (editar) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `DELETE /{trip}` | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `PATCH /{trip}/assignment` (tomar/asignar) | ❌ | ❌ | 🔒 | ❌ | ❌ | ❌ | ❌ |
| `PATCH /{trip}/start` | ❌ | ❌ | ❌ | 🔒 el asignado | ❌ | ❌ | ❌ |
| `PATCH /{trip}/finish` | ❌ | ❌ | ❌ | 🔒 el asignado | ❌ | ❌ | ❌ |
| `GET /current` (mi viaje en ruta) | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `POST /{trip}/positions` | ❌ | ❌ | ❌ | 🔒 el asignado | ❌ | ❌ | ❌ |
| `GET /{trip}/positions` (rastro) | ✅ | ✅ | 🔒 | ❌ | ✅ | ✅ | ✅ |
| `GET /{trip}/timeouts` (paradas) | ✅ | ✅ | 🔒 | ❌ | ✅ | ✅ | ✅ |
| `GET /{trip}/fuels` | ✅ | ✅ | 🔒 | 🔒 | ✅ | ✅ | ✅ |
| `POST /{trip}/fuels` | ✅ ⁴ | ❌ | 🔒 | ❌ | ❌ | ❌ | ❌ |
| `GET /{trip}/expenses` (viáticos) | ✅ | ✅ | 🔒 | 🔒 | ✅ | ✅ | ❌ |
| `POST /{trip}/expenses` | ✅ ⁴ | ❌ | 🔒 | ❌ | ❌ | ❌ | ❌ |
| `GET /{trip}/cost` | ✅ | ✅ | 🔒 | ❌ | ✅ | ✅ | ❌ |
| `PATCH /api/trip-fuels/{tripFuel}/confirm` | ❌ | ❌ | ❌ | 🔒 el asignado | ❌ | ❌ | ❌ |
| `PATCH /api/trip-expenses/{tripExpense}/confirm` | ❌ | ❌ | ❌ | 🔒 el asignado | ❌ | ❌ | ❌ |
| Canal websocket `private-trips.{tripId}` | ✅ | ✅ | 🔒 | ❌ | ✅ | ✅ | ✅ |

³ Para `shipment`, `TripResource.totalExpensesAmount` sale **siempre `"0.00"`**. La forma del objeto no cambia (42 claves), así que no hay que ramificar el tipo: simplemente **no pintes** ese campo para ese rol.
⁴ El administrador registra cargas y viáticos en **cualquier viaje ya asignado**; en uno sin asignar recibe **400 «El viaje aún no fue asignado»**.

> **El piloto emite pero no observa**: reporta posiciones y ve sus propias cargas y viáticos, pero **no** puede leer el rastro, las paradas ni el costo (revela su salario), ni suscribirse al canal en vivo — ni siquiera de su propio viaje.

### 4.6 Tablero y asistente

| Endpoint | Adm | Mgr | Car | Pil | Exp | Usr | Shp |
|---|---|---|---|---|---|---|---|
| `GET /api/dashboard/trips`, `/trips/in-route`, `/vehicle-expenses`, `/vehicles` | ✅ | ✅ | 🔒 | ❌ | ✅ | ❌ | ❌ |
| `POST /api/assistant/chat` | ✅ | ✅ | 🔒 | ❌ | ✅ ⁵ | ❌ | ❌ |

⁵ El asistente hereda los permisos de cada dominio: para `export`, la herramienta de gastos de vehículo devuelve un error y el modelo lo explicará en texto ("no tienes permisos…").

Para `carrier`, el filtro `carrierId` del tablero se **ignora en silencio**: siempre ve su propia empresa.

### 4.7 Catálogos nacionales

Aplica a `products`, `zones`, `fuel-prices`, `freight-rates`, `accessories`, `accessory-characteristics`, `locations`, `departure-points`, `clients`, `shipping-lines` y `places`.

**Lectura: todos los roles excepto `user` y `shipment`** (que reciben 403 en todos estos endpoints — ven los nombres de cliente, naviera, destino, etc. ya embebidos en el viaje).

| Escritura (`POST`, `PATCH`, `DELETE`, `/toggle-status`, `/deactivate`) | Adm | Mgr | Car | Pil | Exp | Usr | Shp |
|---|---|---|---|---|---|---|---|
| `products`, `zones`, `fuel-prices`, `freight-rates`, `accessories`, `accessory-characteristics` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `clients`, `shipping-lines`, `locations`, `departure-points` | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `places` (proxy de Google, solo lectura) | — | — | — | — | — | — | — |

Excepciones de lectura:

| Endpoint | Adm | Mgr | Car | Pil | Exp | Usr | Shp |
|---|---|---|---|---|---|---|---|
| `GET /api/freight-rates/{freightRate}` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `GET /api/freight-rates/quote` (cotizar) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |

Quien no administra tarifas **cotiza** con `/quote` en vez de leer la tarifa.

---

## 5. El ámbito: qué ve cada rol dentro de lo que puede leer

### 5.1 Viajes

| Rol | Ve en `GET /api/trips` |
|---|---|
| `administrator`, `manager`, `export`, `user`, `shipment` | **Todos** los viajes. |
| `carrier` | La **bolsa libre** (`pending`, sin piloto ni vehículo) **+** los viajes que tomó **su empresa** (cualquier miembro, no solo él). |
| `pilot` | **Solo** los viajes donde él es el piloto asignado. **Nunca** la bolsa: los viajes se le asignan, no los elige. |

Con otro viaje fuera de ese ámbito, `GET /api/trips/{trip}` responde **403**, no 404.

### 5.2 Vehículos, pilotos, gastos y tablero

| Rol | Alcance |
|---|---|
| `administrator`, `manager` | Todas las empresas; pueden filtrar por `carrierId`. |
| `export` | Todas las empresas en **vehículos**, **pilotos** y **tablero**. Sin acceso a gastos de vehículo ni a empresas. |
| `carrier` | Solo su empresa; el `carrierId` que mande se ignora. |

---

## 6. Flujos por rol (para diseñar la navegación)

### `carrier`
1. `register` → `confirm-account` → `login`.
2. Sin empresa todo le da 403 «Debes estar vinculado…» → `POST /api/carriers` → `check-status` para refrescar el token.
3. Comparte su `code` (`GET /api/carriers/me`) con sus pilotos.
4. Da de alta vehículos, fija salarios, registra gastos de vehículo.
5. Toma viajes de la bolsa con `/assignment` (piloto + vehículo + primera carga de combustible), añade cargas y viáticos.
6. Sigue el viaje en vivo (canal + `/positions`), revisa paradas y costo al terminar.

### `pilot`
1. `register` (multipart, con foto de DPI y licencia) → `confirm-account` → `login`.
2. `POST /api/carriers/join` con el código de su empresa → `check-status`.
3. Ve sus viajes asignados, **confirma** las cargas de combustible (sin al menos una confirmada no puede arrancar) y los viáticos.
4. `/start` → reporta `POST /positions` cada ≥ 15 s → `/finish`.
5. `GET /api/trips/current` al abrir la app para saber si hay un viaje en ruta (`data: null` si no).

### `export`
Publica viajes (`POST /api/trips`, con la ruta resuelta en `/api/places/directions`), mantiene clientes, navieras, destinos y puntos de partida, y consulta tablero, flota y pilotos. No asigna ni conduce.

### `administrator`
Todo lo de gestión: catálogos, tarifas, precios de combustible, accesorios, viajes, vehículos de cualquier empresa (con `carrier_id`), salarios, y cargas/viáticos sobre viajes ya asignados. No toma viajes ni actúa como piloto.

### `manager`
Pantallas de solo lectura: tablero, flota, empresas, pilotos con salarios, gastos, viajes, catálogos y tarifas. Esconder todos los botones de crear/editar/borrar.

### `user` / `shipment`
Una sola sección: **viajes** (listado, detalle, mapa en vivo, rastro, paradas, cargas). `user` además ve viáticos y costo; `shipment` no. Todo lo demás, oculto.

---

## 7. Implementación sugerida en el front

```ts
export type UserRole =
  | 'administrator'
  | 'manager'
  | 'carrier'
  | 'pilot'
  | 'export'
  | 'user'
  | 'shipment';

export const ROLE_LABEL: Record<UserRole, string> = {
  administrator: 'Administrador',
  manager: 'Encargado',
  carrier: 'Transportista',
  pilot: 'Piloto',
  export: 'Exportación',
  user: 'Usuario',
  shipment: 'Embarque',
};

const TRIP_READERS: UserRole[] = ['administrator', 'manager', 'carrier', 'export', 'user', 'shipment'];

export const can = {
  readCatalogs: (r: UserRole) => r !== 'user' && r !== 'shipment',
  writeCoreCatalogs: (r: UserRole) => r === 'administrator',
  writeTripCatalogs: (r: UserRole) => r === 'administrator' || r === 'export',
  manageTrips: (r: UserRole) => r === 'administrator' || r === 'export',
  assignTrip: (r: UserRole) => r === 'carrier',
  driveTrip: (r: UserRole) => r === 'pilot',
  readTripTracking: (r: UserRole) => TRIP_READERS.includes(r),
  readTripMoney: (r: UserRole) => r !== 'shipment',
  readTripCost: (r: UserRole) => r !== 'shipment' && r !== 'pilot',
  registerTripFuelOrExpense: (r: UserRole) => r === 'administrator' || r === 'carrier',
  readVehicles: (r: UserRole) => ['administrator', 'manager', 'carrier', 'export'].includes(r),
  writeVehicles: (r: UserRole) => r === 'administrator' || r === 'carrier',
  editVehicleMileage: (r: UserRole) => r === 'administrator',
  readVehicleExpenses: (r: UserRole) => ['administrator', 'manager', 'carrier'].includes(r),
  readPilots: (r: UserRole) => ['administrator', 'manager', 'carrier', 'export'].includes(r),
  editSalary: (r: UserRole) => r === 'administrator' || r === 'carrier',
  readCarriers: (r: UserRole) => r === 'administrator' || r === 'manager',
  dashboard: (r: UserRole) => ['administrator', 'manager', 'carrier', 'export'].includes(r),
  assistant: (r: UserRole) => ['administrator', 'manager', 'carrier', 'export'].includes(r),
};
```

`can.*` decide **qué se muestra**; los 403 de ámbito (§3.4) solo se conocen al llamar y hay que manejarlos igual.

---

## 8. Checklist de implementación en el frontend

- [ ] Leer `role` del token/`user` tras `login` y `check-status`; guardar en el store de sesión.
- [ ] Menú y rutas protegidas por rol según §4; `user`/`shipment` solo ven la sección de viajes.
- [ ] Interceptor HTTP: 401 → refrescar con `check-status`; 403 → mostrar `message` tal cual, sin cerrar sesión.
- [ ] Detectar el 403 «Debes estar vinculado a un transportista…» y redirigir al onboarding (crear empresa / unirse).
- [ ] Tras crear empresa o unirse, llamar a `check-status` para refrescar `carrierId` en el token.
- [ ] En el detalle de viaje: ocultar viáticos y costo para `shipment`; ocultar rastro, paradas, costo y mapa en vivo para `pilot`.
- [ ] No suscribir al piloto al canal `private-trips.{id}` (la autorización fallará).
- [ ] Formulario de vehículo: pedir `carrier_id` solo si es administrador; bloquear `mileage` para `carrier`.
- [ ] `manager`: todas las vistas en modo lectura.

---

## 9. Lo que la API **no** hace (para no diseñarlo en el front)

- **No hay gestión de usuarios**: ni listado, ni alta de roles internos, ni cambio de rol, ni baja. Se hace en BD.
- **No hay permisos granulares** ni roles combinados: un usuario = un rol, y la matriz es fija en código.
- **No hay endpoint "¿qué puedo hacer?"**: la matriz de este documento es la fuente; el front la replica.
- **No hay suplantación**: el administrador no puede actuar como transportista o piloto.
- **No hay `/logout`** ni revocación de tokens: cerrar sesión es borrar los tokens en el cliente.
