# Tablero de administración — referencia de integración para el frontend

Referencia completa del dominio **Dashboard** de la API de Legumex Transportes: cuatro endpoints REST de **solo lectura** bajo `/api/dashboard` que resumen viajes, gastos de vehículos, flota y viajes en curso a partir de lo que los demás dominios ya guardan. No hay tabla propia, ni escritura, ni caché: cada llamada consulta la base en vivo.

Todo lo que hay aquí está verificado contra la implementación real (Laravel 13 + PostgreSQL) y contra su suite de tests. Los mensajes de error son literales: se pueden mostrar tal cual al usuario.

> Documentación OpenAPI viva: `/api/documentation`.

---

## 1. Lo mínimo que hay que saber antes de escribir código

1. **Solo `administrator` y `manager`.** Los cuatro endpoints responden 403 a `carrier` y a `pilot`. No existe un tablero por empresa: si el producto lo necesita, es otra spec. Y los dos roles admitidos reciben **exactamente la misma respuesta**: no hay ámbito, todas las empresas.
2. **Ningún filtro falla nunca.** No hay 422 en este dominio. `carrierId` inexistente o no numérico, `dateFrom=01/09/2026`, `inRoute=basura`, `status=ACTIVE`… todo se **ignora en silencio** y se devuelve el histórico completo. Si el tablero muestra «todo» cuando esperabas un recorte, revisa el filtro: la API no te lo va a decir.
3. **Sin fechas = todo el histórico**, no el mes en curso. Si la vista quiere «este mes», el frontend manda `dateFrom` y `dateTo` explícitos en `Y-m-d`. Y dos de los cuatro endpoints (`/trips/in-route`, `/vehicles`) **ignoran las fechas siempre**: no tienen fecha de negocio.
4. **En `/trips`, `byCarrier` no suma `total`.** Los viajes sin asignar no tienen empresa y no aparecen en ese desglose; sí cuentan en `total` y en `unassigned`. No pintes «total − suma de byCarrier» como error.
5. **`stoppedMinutes` cambia en cada lectura.** Se mide contra `now()` del servidor, al revés que `durationMinutes` de `GET /api/trips/{trip}/timeouts`. `/trips/in-route` es una foto; se refresca por polling del frontend, no hay websocket del tablero.
6. **`byMonth` solo trae meses con datos**, como `YYYY-MM` y en orden ascendente. Los huecos los rellena el frontend con el rango que pidió.
7. **Todo el dinero y los galones son `string` de dos decimales** (`"15300.50"`), nunca `number`. Las coordenadas, `string` de ocho decimales. Las fechas, `d-m-Y h:i:s A`, **no ISO 8601**.
8. **`/vehicles` lista toda la flota, incluidos los `inactive`**, y no trae `purchasePrice` ni `monthlyInsuranceCost`.

---

## 2. Autenticación y permisos

Todos los endpoints exigen el token JWT que devuelve el login:

```
Authorization: Bearer {token}
Accept: application/json
```

Sin token, o con uno expirado, la respuesta es **401**:

```json
{ "statusCode": 401, "message": "El token de sesión no es válido o ha expirado", "data": null }
```

| Acción | `administrator` | `carrier` | `pilot` | `manager` |
|---|:--:|:--:|:--:|:--:|
| `GET /api/dashboard/trips` | ✅ | 403 | 403 | ✅ |
| `GET /api/dashboard/trips/in-route` | ✅ | 403 | 403 | ✅ |
| `GET /api/dashboard/vehicle-expenses` | ✅ | 403 | 403 | ✅ |
| `GET /api/dashboard/vehicles` | ✅ | 403 | 403 | ✅ |

Ninguna ruta lleva `carrier.required`: los dos roles admitidos están exentos y, además, no tienen empresa. `carrierId` es un **filtro voluntario**, no una restricción: un `manager` ve los montos de gasto y la flota de todas las empresas, igual que ya los ve en `GET /api/vehicle-expenses`.

Un rol sin permiso recibe **403**:

```json
{ "statusCode": 403, "message": "No tienes permisos para acceder a este recurso", "data": null }
```

---

## 3. Los cuatro objetos del dominio

Este dominio no envuelve un modelo: cada endpoint devuelve una forma propia. Las cuatro salen en camelCase y con las claves siempre en el orden indicado.

### 3.1 `TripsSummary` — `GET /api/dashboard/trips`

```json
{
  "total": 120,
  "unassigned": 7,
  "byStatus": { "pending": 30, "inRoute": 12, "finished": 78 },
  "byCarrier": [ { "carrierId": 3, "carrierName": "TRANSPORTES X", "total": 40 } ],
  "byClient": [ { "clientId": 1, "clientName": "CLIENTE A", "total": 55 } ],
  "byShippingLine": [ { "shippingLineId": 2, "shippingLineName": "MAERSK", "total": 60 } ],
  "byLocation": [ { "locationId": 5, "locationName": "PUERTO QUETZAL", "total": 90 } ],
  "byMonth": [ { "month": "2026-08", "total": 41 } ]
}
```

| Campo | Tipo | Notas para el front |
|---|---|---|
| `total` | `number` | Viajes no borrados dentro del filtro. Es la suma de las tres claves de `byStatus`. |
| `unassigned` | `number` | Bolsa libre: `pending` con `pilotId` y `vehicleId` nulos. Con `carrierId` es **siempre 0**. |
| `byStatus` | `{ pending, inRoute, finished }` | **Siempre las tres claves**, a `0` si no hay filas. Claves en camelCase (`inRoute`), no el valor crudo del enum. |
| `byCarrier` | `array` | Empresa del viaje = empresa de `assigned_by`. **Los viajes sin asignar no aparecen**: su suma puede ser menor que `total`. Orden `total desc, carrierId asc`. |
| `byClient` / `byShippingLine` / `byLocation` | `array` | Solo filas con al menos un viaje; `[]` con la base vacía. Orden `total desc, id asc`. Un cliente o naviera **borrados** siguen apareciendo si tienen viajes. |
| `byMonth` | `array` | `month` como `YYYY-MM` sobre `recolection_date`, **solo meses con viajes**, orden ascendente. |

### 3.2 `TripInRoute` — `GET /api/dashboard/trips/in-route`

Un elemento por viaje `in_route`. Dieciséis claves:

```json
{
  "tripId": 18,
  "order": "ORD-001",
  "container": "MSKU1234567",
  "carrierId": 3,
  "carrierName": "TRANSPORTES X",
  "pilotId": 9,
  "pilotName": "Juan Pérez",
  "vehicleId": 4,
  "vehiclePlate": "P123ABC",
  "clientName": "CLIENTE A",
  "locationName": "PUERTO QUETZAL",
  "startDate": "14-09-2026 08:15:00 AM",
  "lastPosition": { "latitude": "14.60000000", "longitude": "-90.50000000", "recordedAt": "14-09-2026 09:00:15 AM" },
  "totalFuelGallons": "45.00",
  "unconfirmedFuelGallons": "10.00",
  "openTimeout": { "startedAt": "14-09-2026 08:50:00 AM", "latitude": "14.60000000", "longitude": "-90.50000000", "stoppedMinutes": 10.25 }
}
```

| Campo | Tipo | Notas para el front |
|---|---|---|
| `tripId` | `number` | Es `trips.id`: sirve para `GET /api/trips/{trip}`, `/positions`, `/fuels`, `/timeouts`. **No hay `status`**: siempre es `in_route`. |
| `order` / `container` | `string` | Normalizados a MAYÚSCULAS por el dominio de viajes. |
| `carrierId` / `carrierName` | `number \| null` / `string \| null` | Empresa de `assigned_by`. Un viaje en curso siempre fue asignado, así que en la práctica nunca son `null`. |
| `pilotId` / `pilotName` | `number` / `string \| null` | El piloto asignado. |
| `vehicleId` / `vehiclePlate` | `number` / `string \| null` | El vehículo asignado. |
| `clientName` / `locationName` | `string \| null` | Sin ids: para eso está el detalle del viaje. |
| `startDate` | `string \| null` | ⚠️ `d-m-Y h:i:s A`, no ISO 8601. |
| `lastPosition` | `object \| null` | El punto de mayor `recorded_at` (desempate por `id`). `null` si el viaje no tiene ningún punto. Coordenadas como `string` de ocho decimales. |
| `totalFuelGallons` | `string` | Galones de cargas **confirmadas**. Mismo número que en `TripResource`. |
| `unconfirmedFuelGallons` | `string` | Galones de cargas que el piloto **todavía no confirmó**. No están en ningún otro Resource. |
| `openTimeout` | `object \| null` | La parada con `endedAt` nulo, si la hay. `stoppedMinutes` es `number` con dos decimales, `round((now() − startedAt) / 60, 2)`, **contra el reloj del servidor**. |

### 3.3 `VehicleExpensesSummary` — `GET /api/dashboard/vehicle-expenses`

```json
{
  "totalAmount": "15300.50",
  "count": 42,
  "byCategory": [ { "category": "tires", "count": 10, "totalAmount": "8000.00" } ],
  "byNature": { "preventive": { "count": 30, "totalAmount": "9000.00" }, "corrective": { "count": 12, "totalAmount": "6300.50" } },
  "invoiced": { "count": 25, "totalAmount": "12000.00" },
  "notInvoiced": { "count": 17, "totalAmount": "3300.50" },
  "byCarrier": [ { "carrierId": 3, "carrierName": "TRANSPORTES X", "count": 20, "totalAmount": "7000.00" } ],
  "byMonth": [ { "month": "2026-08", "count": 15, "totalAmount": "5000.00" } ]
}
```

| Campo | Tipo | Notas para el front |
|---|---|---|
| `totalAmount` | `string` | Suma de `amount` en GTQ, dos decimales. `"0.00"` con la base vacía. |
| `count` | `number` | Conteo de gastos. |
| `byCategory` | `array` | `category` con el valor crudo de `VehicleExpenseCategory` (`tires`, `oil_change`, …, `other`). Solo categorías con datos, orden `totalAmount desc`. |
| `byNature` | `{ preventive, corrective }` | **Siempre las dos claves**, cada una `{ count, totalAmount }`, a cero si no hay filas. |
| `invoiced` / `notInvoiced` | `{ count, totalAmount }` | **Siempre presentes.** Se cumple `invoiced.count + notInvoiced.count === count` y los montos suman `totalAmount`. |
| `byCarrier` | `array` | Empresa del gasto = `vehicles.carrier_id`, **sin importar el `status` del vehículo**. Aquí todo gasto tiene empresa: la suma sí coincide con `count`. Orden `totalAmount desc, carrierId asc`. |
| `byMonth` | `array` | `month` como `YYYY-MM` sobre `expense_date`, solo meses con datos, orden ascendente. |

### 3.4 `DashboardVehicle` — `GET /api/dashboard/vehicles`

Un elemento por vehículo. Once claves:

```json
{
  "id": 4,
  "plate": "P123ABC",
  "type": "truck",
  "status": "active",
  "condition": "used",
  "mileage": 90000,
  "kilometersPerGallon": "12.50",
  "carrierId": 3,
  "carrierName": "TRANSPORTES X",
  "inRoute": true,
  "currentTrip": { "tripId": 18, "order": "ORD-001", "container": "MSKU1234567", "pilotName": "Juan Pérez", "startDate": "14-09-2026 08:15:00 AM" }
}
```

| Campo | Tipo | Notas para el front |
|---|---|---|
| `id` | `number` | Es `vehicles.id`: sirve para `GET /api/vehicles/{vehicle}` si hace falta la ficha completa. |
| `plate` | `string` | En MAYÚSCULAS. |
| `type` / `status` / `condition` | `string` | Valor crudo del enum en inglés: `truck\|van\|trailer\|pickup`, `active\|inactive\|under_repair`, `new\|used`. |
| `mileage` | `number` | Entero, en km. |
| `kilometersPerGallon` | `string` | Dos decimales. |
| `carrierId` / `carrierName` | `number` / `string \| null` | Empresa dueña. |
| `inRoute` | `boolean` | `true` exactamente cuando `currentTrip` no es `null`. Un vehículo `inactive` puede salir `inRoute: true` si su viaje sigue `in_route`: el tablero no valida coherencia. |
| `currentTrip` | `object \| null` | El viaje `in_route` de `start_date` más reciente. `null` si no hay ninguno (un viaje `finished` no cuenta). |

**No trae** `brand`, `model`, `year`, `capacity`, `engineNumber`, `image`, `purchasePrice` ni `monthlyInsuranceCost`.

### Tipos TypeScript sugeridos

```ts
/** Formato 'd-m-Y h:i:s A', no ISO 8601. */
type ApiDate = string;
/** Dinero y galones: cadena con dos decimales. */
type Money = string;
/** Coordenada: cadena con ocho decimales. */
type Coordinate = string;

export interface TripsSummary {
  total: number;
  unassigned: number;
  byStatus: { pending: number; inRoute: number; finished: number };
  byCarrier: { carrierId: number; carrierName: string; total: number }[];
  byClient: { clientId: number; clientName: string; total: number }[];
  byShippingLine: { shippingLineId: number; shippingLineName: string; total: number }[];
  byLocation: { locationId: number; locationName: string; total: number }[];
  /** month como 'YYYY-MM'; solo meses con viajes. */
  byMonth: { month: string; total: number }[];
}

export interface TripInRoute {
  tripId: number;
  order: string;
  container: string;
  carrierId: number | null;
  carrierName: string | null;
  pilotId: number;
  pilotName: string | null;
  vehicleId: number;
  vehiclePlate: string | null;
  clientName: string | null;
  locationName: string | null;
  startDate: ApiDate | null;
  lastPosition: { latitude: Coordinate; longitude: Coordinate; recordedAt: ApiDate } | null;
  totalFuelGallons: Money;
  unconfirmedFuelGallons: Money;
  /** stoppedMinutes se mide contra now() del servidor: cambia en cada lectura. */
  openTimeout: { startedAt: ApiDate; latitude: Coordinate; longitude: Coordinate; stoppedMinutes: number } | null;
}

export interface CountAndAmount {
  count: number;
  totalAmount: Money;
}

export interface VehicleExpensesSummary {
  totalAmount: Money;
  count: number;
  byCategory: ({ category: string } & CountAndAmount)[];
  byNature: { preventive: CountAndAmount; corrective: CountAndAmount };
  invoiced: CountAndAmount;
  notInvoiced: CountAndAmount;
  byCarrier: ({ carrierId: number; carrierName: string } & CountAndAmount)[];
  byMonth: ({ month: string } & CountAndAmount)[];
}

export interface DashboardVehicle {
  id: number;
  plate: string;
  type: 'truck' | 'van' | 'trailer' | 'pickup';
  status: 'active' | 'inactive' | 'under_repair';
  condition: 'new' | 'used';
  mileage: number;
  kilometersPerGallon: string;
  carrierId: number;
  carrierName: string | null;
  inRoute: boolean;
  currentTrip: { tripId: number; order: string; container: string; pilotName: string | null; startDate: ApiDate | null } | null;
}

/** Sobre estándar de la API. */
export interface ApiEnvelope<T> {
  statusCode: number;
  message: string;
  data: T;
}

/** Sobre de listado paginado: los metadatos van en la RAÍZ, no bajo `meta`. */
export interface PaginatedEnvelope<T> extends ApiEnvelope<T[]> {
  total: number;
  currentPage: number;
  lastPage: number;
}
```

---

## 4. Los filtros: tolerantes, sin FormRequest

Ningún endpoint del dominio valida la query string. Un valor inválido **se ignora** y la respuesta es la de «sin ese filtro». Nunca hay 422.

| Filtro | Endpoints | Regla |
|---|---|---|
| `carrierId` | los cuatro | Entero positivo **que exista** en `carriers`. En viajes acota por la empresa de `assigned_by`; en gastos y flota por `vehicles.carrier_id`. `abc`, `-1`, `999999` → se ignora. |
| `dateFrom` / `dateTo` | `/trips`, `/vehicle-expenses` | `Y-m-d` **estricto** (`2026-09-01`); `01/09/2026`, `2026-9-1` y `2026-13-45` se ignoran. Inclusivos y por día completo: `dateTo=2026-09-30` incluye un viaje de ese día a las 23:59. `/trips` corta sobre `recolection_date`; `/vehicle-expenses` sobre `expense_date`. Cada extremo es independiente: se puede mandar solo uno. |
| `status` | `/vehicles` | `active`, `inactive` o `under_repair`, exacto y en minúsculas. |
| `condition` | `/vehicles` | `new` o `used`. |
| `inRoute` | `/vehicles` | `true`/`false` (también `1`/`0`, `yes`/`no`, `on`/`off`). Se aplica **antes** de paginar. |
| `limit` / `page` | `/vehicles` | `limit` numérico activa la paginación, acotado a `[10, 100]`; `limit=abc` o ausente devuelve toda la flota. |

`/trips/in-route` y `/vehicles` **ignoran `dateFrom` y `dateTo`** aunque se manden.

---

## 5. Formato de las respuestas

### Éxito

```json
{ "statusCode": 200, "message": "…", "data": … }
```

En `/trips` y `/vehicle-expenses`, `data` es **un objeto** (el resumen). En `/trips/in-route` y `/vehicles` es **un array**.

### Listado sin paginar

`/trips/in-route` siempre, y `/vehicles` sin `limit`:

```json
{ "statusCode": 200, "message": "Flota obtenida correctamente", "data": [ { … }, { … } ] }
```

### Listado paginado (solo `/vehicles` con `limit` numérico)

Los metadatos van **en la raíz**, no bajo `meta`:

```json
{
  "statusCode": 200,
  "message": "Flota obtenida correctamente",
  "data": [ { … } ],
  "total": 12,
  "currentPage": 1,
  "lastPage": 2
}
```

`total` cuenta los vehículos que pasan los filtros (incluido `inRoute`), no los de la página.

### Error de negocio (401, 403)

```json
{ "statusCode": 403, "message": "No tienes permisos para acceder a este recurso", "data": null }
```

### Error de validación (422)

**No existe en este dominio.** No hay FormRequest y ningún filtro se valida. Si alguna vez recibes un `{ message, errors }` de Laravel de estas rutas, es un bug.

---

## 6. Endpoints

### 6.1 `GET /api/dashboard/trips` — resumen de viajes

**Query params (opcionales, tolerantes):** `carrierId`, `dateFrom`, `dateTo` (sobre `recolection_date`).

**200** — `"Resumen de viajes obtenido correctamente"`, `data: TripsSummary`.

- Con la base vacía: `total: 0`, `unassigned: 0`, `byStatus: { pending: 0, inRoute: 0, finished: 0 }` y los cinco desgloses `[]`. Nunca 404.
- Los viajes borrados no cuentan en ningún bloque.
- Con `carrierId`, los ocho bloques se acotan a esa empresa y `unassigned` es `0`.

### 6.2 `GET /api/dashboard/trips/in-route` — viajes en curso

**Query params:** solo `carrierId`. `dateFrom`/`dateTo` se ignoran.

**200** — `"Viajes en curso obtenidos correctamente"`, `data: TripInRoute[]`, **sin paginar**, orden `startDate desc, tripId desc`.

- Solo `status = in_route`. Un `pending` con `startDate` puesto **no sale**.
- Sin viajes en curso: `data: []` con 200.
- `lastPosition` y `openTimeout` son `null` cuando no hay punto o no hay parada abierta.
- El número de consultas que ejecuta no depende de cuántos viajes haya: se puede llamar en polling sin miedo.

### 6.3 `GET /api/dashboard/vehicle-expenses` — resumen de gastos

**Query params (opcionales, tolerantes):** `carrierId` (sobre `vehicles.carrier_id`), `dateFrom`, `dateTo` (sobre `expense_date`).

**200** — `"Resumen de gastos de vehículos obtenido correctamente"`, `data: VehicleExpensesSummary`.

- Con la base vacía: `totalAmount: "0.00"`, `count: 0`, `byNature`, `invoiced` y `notInvoiced` a cero, los tres desgloses `[]`.
- Los gastos de un vehículo `inactive` cuentan igual.

### 6.4 `GET /api/dashboard/vehicles` — flota con su viaje en curso

**Query params (opcionales, tolerantes):** `carrierId`, `status`, `condition`, `inRoute`, `limit`, `page`.

**200** — `"Flota obtenida correctamente"`, `data: DashboardVehicle[]` en orden `id asc`; con `limit` numérico, sobre paginado con `total/currentPage/lastPage` en la raíz.

- Todos los vehículos, incluidos `inactive` y `under_repair`.
- `?inRoute=true` devuelve solo los que tienen un viaje `in_route` y `total` refleja ese recorte; `?inRoute=false`, los demás.
- Con dos viajes `in_route` sobre el mismo vehículo, `currentTrip` es el de `startDate` más reciente.

---

## 7. Tabla de mensajes de error (literales)

| HTTP | Mensaje | Cuándo |
|---|---|---|
| 401 | `El token de sesión no es válido o ha expirado` | Sin token, token manipulado o expirado. |
| 403 | `No tienes permisos para acceder a este recurso` | El usuario es `carrier` o `pilot`, en cualquiera de las cuatro rutas. |

No hay 400, 404 ni 422 en este dominio: no hay `{id}` en ninguna ruta, no hay cuerpo y ningún filtro se valida. Cualquier otro código es un 500 inesperado.

**Mensajes de éxito:**

| Endpoint | `message` |
|---|---|
| `/trips` | `Resumen de viajes obtenido correctamente` |
| `/trips/in-route` | `Viajes en curso obtenidos correctamente` |
| `/vehicle-expenses` | `Resumen de gastos de vehículos obtenido correctamente` |
| `/vehicles` | `Flota obtenida correctamente` |

---

## 8. Checklist de implementación en el frontend

- [ ] Cliente HTTP que adjunta `Authorization: Bearer` y `Accept: application/json` en las cuatro llamadas.
- [ ] Ocultar el tablero entero a `carrier` y `pilot` (el 403 del servidor es la red, no la UX).
- [ ] Cargar los cuatro bloques **en paralelo y por separado**: una consulta lenta no debe bloquear las otras tres.
- [ ] Mandar `dateFrom`/`dateTo` explícitos en `Y-m-d` cuando la vista sea «este mes» o «últimos 30 días»; la API sin fechas devuelve todo el histórico.
- [ ] Validar los filtros en el cliente antes de mandarlos: la API los ignora en silencio y no avisa.
- [ ] `byStatus`, `byNature`, `invoiced` y `notInvoiced` siempre existen; los desgloses por entidad pueden ser `[]`.
- [ ] Rellenar los meses vacíos de `byMonth` con ceros en el cliente, sobre el rango pedido.
- [ ] No mostrar «total − suma de byCarrier» como inconsistencia en `/trips`: son los viajes sin asignar.
- [ ] Tratar `totalAmount`, `*Gallons`, `kilometersPerGallon` y las coordenadas como `string`; convertir solo para calcular.
- [ ] Fechas: mostrar `startDate`, `recordedAt` y `startedAt` como texto plano; no parsearlas como ISO.
- [ ] `/trips/in-route`: polling con intervalo razonable; `stoppedMinutes` viene ya calculado, no lo recalcules con el reloj del cliente.
- [ ] `/vehicles`: paginación leyendo `total`/`currentPage`/`lastPage` **de la raíz**; modo sin `limit` para un mapa o un selector.
- [ ] Reflejar `status: inactive`/`under_repair` de la flota con un estado visual; el tablero los lista igual.

---

## 9. Lo que este dominio **no** hace (para no diseñarlo en el front)

- **No escribe nada.** Sin `POST`, `PATCH` ni `DELETE`; sin tabla, columna ni migración. Un dato mal en el tablero se corrige en su dominio de origen.
- **No tiene tablero por empresa.** Un `carrier` recibe 403 en las cuatro rutas; `carrierId` es un filtro para administradores, no un ámbito.
- **No valida los filtros.** Nunca 422; los valores inválidos se ignoran.
- **No aplica un periodo por defecto.** Sin fechas, todo el histórico.
- **No rellena meses a cero ni ofrece top N.** Los desgloses salen completos y sin ranking; recortar y ordenar de otra forma es del frontend.
- **No agrega combustible por empresa o periodo, ni empresas y pilotos, ni paradas históricas, ni inventario de accesorios.** Se descartaron en la definición; cada uno cabría como endpoint nuevo bajo el mismo prefijo en otra spec.
- **No lista las cargas de combustible una a una** en `/trips/in-route`: solo las dos sumas. Para el detalle está `GET /api/trips/{trip}/fuels`.
- **No trae `purchasePrice` ni `monthlyInsuranceCost`** en la flota. Para la ficha completa está `GET /api/vehicles/{vehicle}`.
- **No cachea ni materializa.** Cada llamada consulta la base en vivo; si el histórico crece, la primera medida es mandar siempre un rango de fechas.
- **No emite por websocket.** `/trips/in-route` se refresca por polling; el canal `trips.{tripId}` de SPEC 26 sigue siendo por viaje.
- **No exporta ni compara periodos.** Sin CSV, PDF ni «mes actual vs anterior».
- **No comprueba coherencia entre bloques**: un vehículo `inactive` puede salir `inRoute: true`, y `byCarrier` de viajes no suma `total`.
