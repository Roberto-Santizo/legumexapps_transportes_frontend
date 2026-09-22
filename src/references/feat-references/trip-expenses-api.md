# Viáticos del viaje — referencia de integración para el frontend

Referencia completa del dominio **Trip Expenses** de la API de Legumex Transportes: **tres endpoints**, dos anidados bajo `/api/trips/{trip}/expenses` y uno suelto en `/api/trip-expenses/{tripExpense}/confirm`, para que la empresa transportista registre el dinero de viáticos que entrega al piloto de un viaje y el piloto confirme que lo recibió.

Es el **calco de Trip Fuels (SPEC 27)** con dinero en vez de galones: si ya integraste las cargas de combustible, todo lo de aquí te va a sonar. Las diferencias importantes están en la §1: el viático es **opcional** al asignar y **no bloquea** el arranque del viaje.

Todo lo que hay aquí está verificado contra la implementación real de la rama `spec-31-trip-expenses` (Laravel 13) y contra su suite de tests (62 tests de Feature + 31 de Unit del service, más los casos nuevos de `/assignment` en `TripTest` y `TripServiceTest`). Los mensajes de error son literales: se pueden mostrar tal cual al usuario.

> Documentación OpenAPI viva: `/api/documentation`, tag **Trip Expenses**.

---

## 1. Lo mínimo que hay que saber antes de escribir código

1. **`PATCH /api/trips/{trip}/assignment` gana dos campos opcionales y no rompe nada.** `expenseAmount` y `expenseDescription` se pueden mandar o no. Si mandas `expenseAmount`, la asignación crea el primer viático; si no, todo sigue igual que con SPEC 27. Ver §10.1.
2. **El viático NO bloquea `/start`.** A diferencia del combustible, un viaje arranca con o sin viáticos, registrados o confirmados. No hay guarda nueva en ningún endpoint de `trips`.
3. **Registrar no es confirmar.** El `carrier` registra (`POST`) y el `pilot` asignado confirma haber recibido el dinero (`PATCH .../confirm`). Hasta que el piloto confirma, el viático existe con `isConfirmed: false` y **no suma** en ningún total.
4. **La tabla es append-only.** No hay `PATCH` del monto ni `DELETE`. Un `3500` tecleado en vez de `350` se queda para siempre. **Pide confirmación en la UI antes de mandar el `POST`.**
5. **Reconfirmar es 200 sin escribir nada.** `receivedAt` se escribe una vez y no se pisa. Reintentar es seguro.
6. **El piloto asignado SÍ lee** el listado de sus viajes, como con las cargas.
7. **Asimetría sobre la bolsa libre**: un viaje `pending` sin asignar se puede **listar** (200, `data: []`, `totalAmount: "0.00"`) pero el `POST` sobre él es **403**.
8. **Toda respuesta viaja en un sobre** `{ statusCode, message, data }`… **salvo el 422**, que usa `{ message, errors }`.
9. **`amount` sale como `string` de dos decimales** (`"350.00"`), no como número. `parseFloat` antes de sumar. Es GTQ por convención: no hay campo de moneda.
10. **Las fechas no son ISO 8601.** `receivedAt` sale en `d-m-Y h:i:s A` (`18-09-2026 08:14:03 AM`).
11. **`description` es texto libre opcional**, solo `trim`. Sin categorías, sin comprobante.

---

## 2. Autenticación y permisos

Los tres endpoints exigen el token JWT:

```
Authorization: Bearer {token}
Accept: application/json
```

Sin token, o con uno expirado, **401**:

```json
{ "statusCode": 401, "message": "El token de sesión no es válido o ha expirado", "data": null }
```

| Acción | `administrator` | `carrier` | `pilot` | `manager` |
|---|:--:|:--:|:--:|:--:|
| `POST .../expenses` registrar un viático | 403 | ✅ **solo si su empresa tomó el viaje** | 403 | 403 |
| `GET .../expenses` listar los viáticos | ✅ todos los viajes | ✅ los de su ámbito | ✅ **sus propios viajes** | ✅ todos los viajes |
| `PATCH /trip-expenses/{id}/confirm` confirmar | 403 | 403 | ✅ **solo el piloto asignado** | 403 |

**Ninguna de las tres rutas lleva `carrier.required`.** Un `carrier` sin empresa lo rechaza el service con 403 «No perteneces a ninguna empresa transportista».

Los 403 del middleware de rol llegan **antes** que cualquier validación de cuerpo:

```json
{ "statusCode": 403, "message": "No tienes permisos para acceder a este recurso", "data": null }
```

### El ámbito de lectura es el de SPEC 24

- `administrator` y `manager`: cualquier viaje.
- `carrier`: los que **asignó su empresa** más la **bolsa libre**.
- `pilot`: **solo los viajes donde él es el `pilot_id`**.
- Fuera de ámbito es **403**, no 404.

```json
{ "statusCode": 403, "message": "No puedes acceder a un viaje que no tienes asignado", "data": null }
```
```json
{ "statusCode": 403, "message": "No puedes acceder a un viaje que no pertenece a tu empresa transportista", "data": null }
```

### Escribir no hereda el ámbito de leer

El `POST` exige que el viaje lo haya tomado **la empresa de quien llama** (se compara la empresa del `assigned_by`, no la persona: cualquier usuario de esa empresa puede registrar).

---

## 3. El objeto `TripExpense`

`data` en el `POST` y en el `PATCH`, y cada elemento de `data` en el `GET`. **Ocho claves**, siempre en este orden:

```json
{
  "id": 12,
  "tripId": 16,
  "amount": "350.00",
  "description": "Alimentación y peajes",
  "isConfirmed": false,
  "receivedAt": null,
  "confirmedByName": null,
  "registeredByName": "Ana López"
}
```

Confirmado:

```json
{
  "id": 12,
  "tripId": 16,
  "amount": "350.00",
  "description": "Alimentación y peajes",
  "isConfirmed": true,
  "receivedAt": "18-09-2026 08:14:03 AM",
  "confirmedByName": "Marco Pérez",
  "registeredByName": "Ana López"
}
```

| Campo | Tipo | Notas para el front |
|---|---|---|
| `id` | `number` | Parámetro de `PATCH /api/trip-expenses/{id}/confirm`. **No** es el id del viaje. |
| `tripId` | `number` | Sí viaja: la confirmación se pide fuera del viaje. |
| `amount` | `string` | ⚠️ **String** de dos decimales. `parseFloat` antes de sumar. GTQ por convención. |
| `description` | `string \| null` | Texto libre tal como se tecleó (solo `trim`). `null` si no se mandó o iba en blanco. |
| `isConfirmed` | `boolean` | **Derivado** de `receivedAt`. `false` = registrado y esperando al piloto. |
| `receivedAt` | `string \| null` | ⚠️ **No es ISO 8601.** `d-m-Y h:i:s A`. Hora del servidor al confirmar; no se pisa jamás. |
| `confirmedByName` | `string \| null` | Nombre del piloto que confirmó. Sin id. |
| `registeredByName` | `string` | Nombre del usuario de la empresa que registró. Sin id. |

### Tipos TypeScript sugeridos

```ts
export interface TripExpense {
  /** Id del VIÁTICO: es el parámetro de /api/trip-expenses/{id}/confirm. */
  id: number;
  tripId: number;
  /** ⚠️ String de 2 decimales, no number. GTQ. */
  amount: string;
  description: string | null;
  /** Derivado de receivedAt !== null. */
  isConfirmed: boolean;
  /** Formato 'd-m-Y h:i:s A', no ISO 8601. null = sin confirmar. */
  receivedAt: string | null;
  confirmedByName: string | null;
  registeredByName: string;
}

/** Respuesta del listado SIN limit. */
export interface TripExpenseListResponse {
  statusCode: number;
  message: string;
  data: TripExpense[];
  /** ⚠️ Solo los CONFIRMADOS. String de 2 decimales. Viaja con y sin limit. */
  totalAmount: string;
}

/** Respuesta del listado CON limit numérico: la metadata va en la raíz. */
export interface PaginatedTripExpenseListResponse extends TripExpenseListResponse {
  total: number;
  currentPage: number;
  lastPage: number;
}

/** Cuerpo del POST. */
export interface StoreTripExpensePayload {
  amount: number;
  description?: string | null;
}

/** Cuerpo del PATCH /assignment — cuatro obligatorios (SPEC 27) + dos opcionales (SPEC 31). */
export interface AssignTripPayload {
  pilotId: number;
  vehicleId: number;
  fuelGallons: number;
  fuelType: 'regular' | 'premium' | 'diesel' | 'diesel_premium';
  expenseAmount?: number | null;
  expenseDescription?: string | null;
}
```

---

## 4. `totalAmount` y `totalExpensesAmount`: la trampa del `"0.00"`

Misma regla en los dos: suma de los viáticos **confirmados**, como string de dos decimales.

| Clave | Dónde aparece | Qué suma |
|---|---|---|
| `totalAmount` | Raíz del sobre de `GET /api/trips/{trip}/expenses` | Confirmados de ese viaje |
| `totalExpensesAmount` | `TripResource` (clave 37, tras `totalFuelGallons`) | Confirmados de ese viaje |

1. **`totalAmount` NO es `total`.** `total` es el conteo del paginador y solo aparece con `limit`; `totalAmount` viaja siempre.
2. **Se calcula antes de paginar.** Con `?limit=10` sobre 25 viáticos sigue siendo el total del viaje.
3. **Un viaje recién asignado con `expenseAmount` da `"0.00"`** teniendo un viático en `data`: nace sin confirmar. Muestra los `isConfirmed: false` al lado del cero.

---

## 5. Formato de las respuestas

### Éxito

```json
{ "statusCode": 201, "message": "Viático registrado correctamente", "data": { /* TripExpense */ } }
```

### Listado sin paginar

```json
{ "statusCode": 200, "message": "Viáticos obtenidos correctamente", "data": [ /* TripExpense[] */ ], "totalAmount": "425.00" }
```

### Listado paginado (con `limit` numérico)

```json
{ "statusCode": 200, "message": "Viáticos obtenidos correctamente", "data": [], "total": 25, "currentPage": 1, "lastPage": 3, "totalAmount": "250.00" }
```

### 422 — formato distinto

```json
{ "message": "El monto es obligatorio", "errors": { "amount": ["El monto es obligatorio"] } }
```

### Errores de negocio (400, 401, 403, 404) — sobre

```json
{ "statusCode": 400, "message": "El viaje ya fue finalizado", "data": null }
```

---

## 6. Endpoints

### 6.1 `POST /api/trips/{trip}/expenses` — registrar un viático

Solo `carrier`, y solo si **su empresa tomó el viaje**.

**Cuerpo:**

```json
{ "amount": 350, "description": "Alimentación y peajes" }
```

| Campo | Reglas | Notas |
|---|---|---|
| `amount` | `required`, `numeric`, `min:0.01`, `max:99999999.99` | Número o cadena numérica. Cero y negativos son 422. Sin validación cruzada. |
| `description` | opcional, `string`, `max:255` | Solo `trim`. Ausente, `null` o solo espacios → `null`. |

`tripId`, `receivedAt`, `confirmedBy` y `registeredBy` **no se aceptan** y se ignoran en silencio.

**El viático nace sin confirmar.**

**Cuatro guardas del service, en orden fijo** (solo con cuerpo válido):

| Orden | Situación | Código | Mensaje |
|:--:|---|:--:|---|
| 1 | El viaje no existe | 404 | `El viaje no existe` |
| 2 | El viaje fue eliminado | 400 | `El viaje ya fue eliminado` |
| 3 | El viaje **no está asignado**, o lo tomó otra empresa | 403 | `No puedes registrar viáticos en un viaje que no tomó tu empresa transportista` |
| 4 | El viaje está `finished` | 400 | `El viaje ya fue finalizado` |

Un viaje **borrado y ajeno** devuelve el 400, no el 403. Un `carrier` sin empresa: **403 «No perteneces a ninguna empresa transportista»**.

**Se registra en `pending` y en `in_route`**, nunca después. Dos viáticos idénticos seguidos son dos filas.

| Código | Situación | `message` |
|:--:|---|---|
| **201** | Registrado | `Viático registrado correctamente` |
| 400 | Viaje borrado o finalizado | ver guardas |
| 401 | Sin token | `El token de sesión no es válido o ha expirado` |
| 403 | Rol, empresa ajena, sin asignar, o `carrier` sin empresa | ver §2 y guardas |
| 404 | El viaje no existe | `El viaje no existe` |
| 422 | Cuerpo inválido | `{ message, errors }` |

⚠️ **El 422 se adelanta a las cuatro guardas.**

---

### 6.2 `GET /api/trips/{trip}/expenses` — listar los viáticos del viaje

Cualquier autenticado dentro del ámbito de SPEC 24, **incluido el `pilot` asignado**.

| Param | Efecto |
|---|---|
| `limit` | Activa la paginación. Numérico, **acotado a `[10, 100]`**. Omitido o no numérico → todo sin metadatos. |
| `page` | Página, solo con `limit`. |

**Sin filtros.** Orden fijo `id` **ascendente**. Un viaje sin viáticos → **200, `data: []`, `totalAmount: "0.00"`**.

| Código | Situación | `message` |
|:--:|---|---|
| 200 | Devueltos (posiblemente vacío) | `Viáticos obtenidos correctamente` |
| 401 | Sin token | `El token de sesión no es válido o ha expirado` |
| 403 | `pilot` sobre viaje ajeno | `No puedes acceder a un viaje que no tienes asignado` |
| 403 | `carrier` fuera de ámbito | `No puedes acceder a un viaje que no pertenece a tu empresa transportista` |
| 404 | Viaje inexistente **o borrado** | `El viaje no existe` |

---

### 6.3 `PATCH /api/trip-expenses/{tripExpense}/confirm` — confirmar la recepción

Solo el **piloto asignado**. `{tripExpense}` es el **id del viático**. **Sin cuerpo**: mandar `receivedAt`, `amount` o `description` no cambia nada.

**Efecto:** `receivedAt = now()` y `confirmedByName` = el piloto. **Reconfirmar es 200 sin escribir.** No mira el `status` del viaje (se puede confirmar en un viaje `finished`).

| Código | Situación | `message` |
|:--:|---|---|
| **200** | Confirmado, **o ya lo estaba** | `Viático confirmado correctamente` |
| 401 | Sin token | `El token de sesión no es válido o ha expirado` |
| 403 | Rol distinto de `pilot` | `No tienes permisos para acceder a este recurso` |
| 403 | Piloto no asignado a ese viaje | `No puedes confirmar el viático de un viaje que no tienes asignado` |
| 404 | El viático no existe | `El viático no existe` |

⚠️ **El viático de un viaje borrado responde 403, no 400**, como en las cargas.

---

## 7. Tabla de mensajes de error (literales)

### 422

#### `POST /api/trips/{trip}/expenses`

| Campo | Mensaje |
|---|---|
| `amount` | `El monto es obligatorio` · `El monto debe ser un número` · `El monto debe ser mayor a 0` · `El monto no puede superar 99999999.99` |
| `description` | `La descripción debe ser texto` · `La descripción no puede superar los 255 caracteres` |

#### `PATCH /api/trips/{trip}/assignment` (los dos campos nuevos)

| Campo | Mensaje |
|---|---|
| `expenseAmount` | `El monto del viático debe ser un número` · `El monto del viático debe ser mayor a 0` · `El monto del viático no puede superar 99999999.99` |
| `expenseDescription` | `La descripción del viático debe ser texto` · `La descripción del viático no puede superar los 255 caracteres` |

### Errores de sobre

| Código | Mensaje | Cuándo |
|:--:|---|---|
| 400 | `El viaje ya fue eliminado` | `POST` sobre viaje borrado |
| 400 | `El viaje ya fue finalizado` | `POST` sobre viaje `finished` |
| 401 | `El token de sesión no es válido o ha expirado` | Sin token |
| 403 | `No tienes permisos para acceder a este recurso` | Middleware de rol |
| 403 | `No perteneces a ninguna empresa transportista` | `POST` de `carrier` sin empresa |
| 403 | `No puedes registrar viáticos en un viaje que no tomó tu empresa transportista` | `POST` ajeno o sin asignar |
| 403 | `No puedes confirmar el viático de un viaje que no tienes asignado` | `confirm` de otro piloto o viaje borrado |
| 403 | `No puedes acceder a un viaje que no tienes asignado` | `GET` de `pilot` ajeno |
| 403 | `No puedes acceder a un viaje que no pertenece a tu empresa transportista` | `GET` de `carrier` fuera de ámbito |
| 404 | `El viaje no existe` | `POST` inexistente; `GET` inexistente o borrado |
| 404 | `El viático no existe` | `confirm` con id inexistente |

### Éxito

| Código | Mensaje |
|:--:|---|
| 201 | `Viático registrado correctamente` |
| 200 | `Viáticos obtenidos correctamente` |
| 200 | `Viático confirmado correctamente` |

---

## 8. Checklist de implementación en el frontend

### Pantalla de asignación (`carrier`)

- [ ] Campos opcionales `expenseAmount` y `expenseDescription` en el formulario de `/assignment`. Si el usuario no entrega dinero, **no mandarlos** (o mandar `null`).
- [ ] Validar `expenseAmount > 0` en cliente si se rellena.
- [ ] Avisar de que **reasignar con monto añade otro viático**.

### Pantalla de viáticos del viaje

- [ ] `GET /api/trips/{trip}/expenses`; `data: []` es «sin viáticos».
- [ ] Leer `totalAmount` de la raíz; no confundir con `total`.
- [ ] Etiquetar como «viáticos confirmados» y listar los `isConfirmed: false` al lado.
- [ ] `parseFloat` sobre `amount` y `totalAmount`.
- [ ] `receivedAt` como texto plano.
- [ ] Sin editar ni borrar: **confirmación antes del `POST`**.

### App del piloto

- [ ] Botón de confirmar por viático: `PATCH /api/trip-expenses/{id}/confirm`, sin cuerpo; 200 idempotente.
- [ ] **No** bloquear el arranque por viáticos: `/start` no los mira.

### Transversal

- [ ] `totalExpensesAmount` en el detalle del viaje (clave 37 de `TripResource`, tras `totalFuelGallons`); solo confirmados.

---

## 9. Lo que este dominio **no** hace

- **No bloquea `/start` ni `/finish`.**
- **No se corrige ni se borra un viático.** Ni se desconfirma.
- **No hay comprobante, categoría, moneda ni cantidad realmente recibida.**
- **No hay liquidación** (gastos reales contra el viático, saldo, devolución).
- **No hay listado global** `GET /api/trip-expenses`, ni filtros en `GET /api/trips`, ni websocket, ni correo.
- **`TripListResource` sigue en 17 claves**; `GET /api/trips/current` no cambia.
- **El Dashboard (SPEC 29) no agrega viáticos.**
- **Ni `administrator` ni `manager` registran o confirman.** El `PATCH` general con `expenseAmount`/`expenseDescription` responde 200 y no escribe nada.

---

## 10. Lo que SPEC 31 cambia en el dominio `trips`

### 10.1 `PATCH /api/trips/{trip}/assignment` — dos campos opcionales

```json
{
  "pilotId": 12,
  "vehicleId": 8,
  "fuelGallons": 45.5,
  "fuelType": "diesel",
  "expenseAmount": 350,
  "expenseDescription": "Alimentación y peajes"
}
```

- **Sin cambio incompatible**: los cuatro campos de SPEC 27 siguen bastando.
- Con `expenseAmount` se inserta el primer viático en la **misma transacción** que la carga; si algo falla, no queda nada.
- `expenseDescription` sin `expenseAmount` se **ignora en silencio** (200, sin fila).
- Reasignar con monto **añade** otro viático.
- La respuesta trae `totalExpensesAmount: "0.00"` justo después, porque nace sin confirmar.

### 10.2 `TripResource` pasa de 39 a 40 claves

Nueva clave **`totalExpensesAmount`**, entre `totalFuelGallons` y `createdAt`: string de dos decimales, `"0.00"` sin confirmados, en los siete endpoints de detalle. `TripListResource` no cambia.

### 10.3 Nada más

`/start`, `/finish`, el `PATCH` general, el `DELETE`, los filtros de `GET /api/trips`, `GET /api/trips/current` y el Dashboard quedan como estaban.
