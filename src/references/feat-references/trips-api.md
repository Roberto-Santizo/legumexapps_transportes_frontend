# Viajes de exportación — referencia de integración para el frontend

Referencia completa del dominio **Trips** de la API de Legumex Transportes: ocho endpoints REST bajo `/api/trips` para publicar viajes de exportación, que una empresa transportista toma y un piloto ejecuta.

Todo lo que hay aquí está verificado contra la implementación real de la rama `spec-24-trips` (rutas, FormRequests, Resource, Service y su suite de 243 tests). Los mensajes de error son literales: se pueden mostrar tal cual al usuario.

> Documentación OpenAPI viva: `/api/documentation`.

---

## 1. Lo mínimo que hay que saber antes de escribir código

1. **Un viaje no pertenece a ninguna empresa: la empresa se lo queda al tomarlo.** No existe `carrierId` en la tabla. Un viaje nace sin dueño operativo, y cuando una empresa lo asigna, ese acto es lo que lo hace suyo. Todo el ámbito de lectura sale de ahí — es lo que el contrato no puede contarte y está entero en §3.
2. **Un viaje que nadie toma se queda atascado para siempre.** El administrador **no puede asignar** (`/assignment` es solo del `carrier`) y **nadie puede desasignar** (ninguna vía devuelve `pilotId`/`vehicleId` a `null`). Si ninguna empresa lo toma, o lo toma la equivocada y no lo suelta, la única salida por API es **borrar el viaje y crearlo de nuevo**. Diseña la pantalla contando con eso.
3. **La polilínea no se recalcula sola, nunca.** La manda el front, resuelta antes con `GET /api/places/directions`. Si un `PATCH` cambia `locationId` o `departurePointId` y no remandas `polyline` en el **mismo** `PATCH`, la guardada queda mintiendo y **la API no avisa de nada**: el mapa dibujará una ruta que ya no corresponde.
4. **`status` no tiene máquina de estados y puede contradecir a las fechas.** El administrador lo mueve a mano en cualquier orden: un `finished` puede volver a `pending` conservando `startDate` y `endDate`. Cuando el estado y las fechas se contradigan, **pinta el relato desde las fechas**.
5. **El `PATCH` general ignora en silencio lo que no le toca.** Mandar `pilotId`, `vehicleId`, `assignedBy` o `registeredBy` responde **200 sin cambiar nada**. No hay error que te avise de que tu campo no se aplicó.
6. **Reparto 422 / 400: un id inventado es 422, un id borrado o inservible es 400.** Las cuatro claves foráneas llevan `exists:`, que lee la tabla en crudo y **no ve el borrado lógico**: un `clientId` de un cliente borrado pasa la validación y lo para el service con un 400. Son dos formatos de respuesta distintos (§5).
7. **Toda respuesta viaja en un sobre** `{ statusCode, message, data }`… **salvo el 422**, que usa el formato de Laravel `{ message, errors }`.
8. **`DELETE` borra de verdad** (baja lógica irreversible): el viaje desaparece del listado y del detalle, **no hay `/restore`** y no existe ningún parámetro que devuelva los borrados.
9. **El cuerpo va en camelCase y las fechas vuelven en `d-m-Y h:i:s A`, no en ISO 8601.** Lo que envías y lo que recibes **no tienen el mismo formato de fecha** (§4).

---

## 2. Autenticación y permisos

Todos los endpoints exigen el token JWT que devuelve el login:

```
Authorization: Bearer {token}
Accept: application/json
```

Sin token, o con uno expirado, las ocho rutas responden **401**:

```json
{ "statusCode": 401, "message": "El token de sesión no es válido o ha expirado", "data": null }
```

| Acción | `administrator` | `carrier` | `pilot` | `manager` |
|---|:--:|:--:|:--:|:--:|
| `GET /api/trips` — listar | ✅ | ✅ | ✅ | ✅ |
| `GET /api/trips/{trip}` — detalle | ✅ | ✅ | ✅ | ✅ |
| `POST /api/trips` — publicar | ✅ | 403 | 403 | 403 |
| `PATCH /api/trips/{trip}` — editar | ✅ | 403 | 403 | 403 |
| `DELETE /api/trips/{trip}` — dar de baja | ✅ | 403 | 403 | 403 |
| `PATCH /api/trips/{trip}/assignment` — tomar | 403 | ✅ + empresa | 403 | 403 |
| `PATCH /api/trips/{trip}/start` — arrancar | 403 | 403 | ✅ asignado | 403 |
| `PATCH /api/trips/{trip}/finish` — cerrar | 403 | 403 | ✅ asignado | 403 |

**Los cuatro roles leen** — no hay `role:` en las dos rutas de lectura. Lo que cada uno *ve* lo decide el ámbito (§3), no el middleware.

**`carrier.required` actúa solo en `/assignment`.** Un `carrier` que todavía no ha registrado su empresa recibe 403 **antes de llegar al service**:

```json
{ "statusCode": 403, "message": "Debes estar vinculado a un transportista para acceder a este recurso", "data": null }
```

Un rol sin permiso para la ruta recibe:

```json
{ "statusCode": 403, "message": "No tienes permisos para acceder a este recurso", "data": null }
```

⚠️ **Ojo con `/start` y `/finish`:** el rol `pilot` abre la puerta, pero dentro el service comprueba que seas **el piloto asignado a ese viaje**. Otro piloto recibe 403 con un mensaje distinto (§8).

---

## 3. El ámbito de lectura: quién ve qué

**Esto es lo único que no puedes deducir del contrato, y gobierna el listado y el detalle por igual.**

| Rol | Qué ve |
|---|---|
| `administrator` | **Todos** los viajes, asignados o no. |
| `manager` | **Todos** los viajes, asignados o no. |
| `carrier` | La **bolsa** (`status: "pending"` con `pilotId` **y** `vehicleId` en `null`) **más** todos los viajes asignados por **su propia empresa**. |
| `pilot` | **Solo** aquellos donde `pilotId` es él. **La bolsa no le aparece.** |

Tres consecuencias que se ven en pantalla:

- **En cuanto la empresa A asigna un viaje, ese viaje desaparece del listado de la empresa B.** Para B deja de existir: ni en el listado, ni en el detalle. Si tienes el viaje cacheado en el front, invalídalo.
- **El ámbito es de la empresa, no de la persona.** `assignedById` guarda al **usuario** que asignó, pero la comparación se hace contra su **empresa**: un compañero de la empresa A ve el viaje que tomó su colega, y puede reasignarlo. Sigue viéndose aunque ese colega cause baja.
- **El piloto tiene una agenda, no un catálogo.** No le muestres un buscador de viajes disponibles: no puede tomarlos y su listado solo trae los suyos.

**El ámbito se aplica antes que los filtros.** Ninguna combinación de query params lo salta: `?status=pending` desde la empresa B **no** revela los viajes que ya tomó la A.

**Fuera de ámbito el detalle responde 403, no 404.** El viaje existe y la API no lo niega; simplemente no es tuyo.

---

## 4. El objeto `Trip`

Es lo que devuelve `data` en los ocho endpoints (o cada elemento de `data` en el listado). **31 claves**, siempre en camelCase y siempre en este orden:

```json
{
  "id": 1,
  "order": "ORD-2026 0148",
  "status": "pending",
  "clientId": 3,
  "clientName": "AGROEXPORT S.A.",
  "shippingLineId": 2,
  "shippingLineName": "MAERSK LINE",
  "departurePointId": 5,
  "departurePointName": "PLANTA SAN JUAN",
  "locationId": 9,
  "locationName": "PUERTO QUETZAL",
  "destination": "Rotterdam, Países Bajos",
  "container": "MSKU 483920 1",
  "transport": "Rastra 40 pies",
  "recolectionDate": "02-09-2026 06:00:00 AM",
  "shipDate": "04-09-2026 11:30:00 PM",
  "startDate": null,
  "endDate": null,
  "polyline": "_p~iF~ps|U_ulLnnqC_mqNvxq`@",
  "points": [[38.5, -120.2], [40.7, -120.95], [43.252, -126.453]],
  "observations": "Carga refrigerada a -2 °C.",
  "pilotId": null,
  "pilotName": null,
  "vehicleId": null,
  "vehiclePlate": null,
  "assignedById": null,
  "assignedByName": null,
  "registeredByName": "Roberto Santizo",
  "createdAt": "27-08-2026 09:14:03 AM",
  "updatedAt": "27-08-2026 09:14:03 AM",
  "deletedAt": null
}
```

| Campo | Tipo | Notas para el front |
|---|---|---|
| `id` | `number` | Es el `{trip}` de las seis rutas de detalle y acción. |
| `order` | `string` | **Siempre en MAYÚSCULAS** con espacios internos colapsados. **No es único**: dos viajes pueden compartirlo. Pinta lo que devuelve la respuesta, no lo que tecleó el usuario. |
| `status` | `"pending" \| "in_route" \| "finished"` | **Valor crudo del enum, en inglés y sin traducir.** La traducción es cosa tuya. No hay `cancelled`. |
| `clientId` / `clientName` | `number` / `string \| null` | Relación **plana**, nunca objeto anidado. |
| `shippingLineId` / `shippingLineName` | `number` / `string \| null` | Ídem. |
| `departurePointId` / `departurePointName` | `number` / `string \| null` | Ídem. |
| `locationId` / `locationName` | `number` / `string \| null` | El **puerto** de destino. Siempre una `location` de tipo `port`. |
| `destination` | `string` | Destino final en el extranjero. **Texto libre**: no lo respalda ningún catálogo, no es una `location` y no se puede filtrar por él. Se guarda **tal como se teclea**. |
| `container` | `string` | **MAYÚSCULAS** con espacios colapsados, como `order`. **Tampoco es único.** |
| `transport` | `string` | Medio o empresa de transporte, **tal como se teclea**. Descriptivo: no tiene relación con el `vehicleId` que asigne después el transportista. |
| `recolectionDate` / `shipDate` | `string` | Lo **planificado**. ⚠️ Formato `d-m-Y h:i:s A`, ver abajo. |
| `startDate` / `endDate` | `string \| null` | Lo **ejecutado**. `null` hasta que el piloto llama a `/start` y `/finish`. Los pone el servidor. |
| `polyline` | `string` | Polilínea codificada de Google, tal como la mandó el front. **Puede quedar obsoleta** tras un `PATCH` (§1.3). |
| `points` | `[number, number][]` | Pares `[lat, lng]` **decodificados de `polyline`** en cada lectura. Campo calculado, sin columna y sin caché. Coincide con lo que devuelve `GET /api/places/directions` para la misma cadena. |
| `observations` | `string` | **Obligatorio**, nunca `null`. Si el alta la hace el administrador y el viaje lo ejecuta otra empresa, es el único canal de instrucciones que hay. |
| `pilotId` / `pilotName` | `number \| null` / `string \| null` | `null` mientras nadie haya tomado el viaje. |
| `vehicleId` / `vehiclePlate` | `number \| null` / `string \| null` | Ídem. Fíjate: aquí el par es id + **placa**, no id + nombre. |
| `assignedById` / `assignedByName` | `number \| null` / `string \| null` | El **usuario** que asignó. El ámbito compara su **empresa** (§3). |
| `registeredByName` | `string \| null` | El administrador que publicó el viaje. Nunca se envía en el body y el `PATCH` **no** lo reescribe. No hay `registeredById`. |
| `createdAt` / `updatedAt` | `string \| null` | ⚠️ Formato `d-m-Y h:i:s A`. |
| `deletedAt` | `string \| null` | **`null` en siete de los ocho endpoints.** Solo trae valor en la respuesta del `DELETE`, que pinta la fila recién dada de baja. |

### ⚠️ Las fechas: entra en un formato, sale en otro

- **De salida**, las siete fechas usan el formato propio **`d-m-Y h:i:s A`** (`02-09-2026 06:00:00 AM`): día-mes-año con reloj de 12 horas y AM/PM. **No es ISO 8601** y `new Date(...)` sobre él **no funciona**. Está pensado para mostrarse tal cual; si necesitas un `Date`, parsea a mano.
- **De entrada**, `recolectionDate` y `shipDate` aceptan cualquier formato que Laravel parsee — usa ISO 8601 o `Y-m-d H:i:s`. **No mandes el formato de salida.**
- Los filtros `dateFrom`/`dateTo` van en **`Y-m-d` estricto** (§6.1).

### Tipos TypeScript sugeridos

```ts
export type TripStatus = 'pending' | 'in_route' | 'finished';

/** Par [latitud, longitud]. */
export type LatLng = [number, number];

export interface Trip {
  id: number;
  order: string;
  status: TripStatus;
  clientId: number;
  clientName: string | null;
  shippingLineId: number;
  shippingLineName: string | null;
  departurePointId: number;
  departurePointName: string | null;
  locationId: number;
  locationName: string | null;
  destination: string;
  container: string;
  transport: string;
  /** Formato d-m-Y h:i:s A, NO ISO 8601. */
  recolectionDate: string;
  shipDate: string;
  startDate: string | null;
  endDate: string | null;
  polyline: string;
  points: LatLng[];
  observations: string;
  pilotId: number | null;
  pilotName: string | null;
  vehicleId: number | null;
  vehiclePlate: string | null;
  assignedById: number | null;
  assignedByName: string | null;
  registeredByName: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  deletedAt: string | null;
}

export interface StoreTripBody {
  order: string;
  clientId: number;
  shippingLineId: number;
  departurePointId: number;
  locationId: number;
  destination: string;
  container: string;
  transport: string;
  /** Futura. ISO 8601 o Y-m-d H:i:s. */
  recolectionDate: string;
  /** Futura y >= recolectionDate. */
  shipDate: string;
  polyline: string;
  observations: string;
}

/** El PATCH acepta lo mismo, todo opcional, MÁS status y SIN pilotId/vehicleId. */
export type UpdateTripBody = Partial<Omit<StoreTripBody, never>> & { status?: TripStatus };

export interface AssignTripBody {
  pilotId: number;
  vehicleId: number;
}
```

---

## 5. Formato de las respuestas

### Sobre estándar

Todo lo que no sea un 422 viaja así:

```json
{ "statusCode": 200, "message": "Viaje obtenido correctamente", "data": { } }
```

### Listado sin paginar (sin `limit`)

`data` es el array completo y **no viajan metadatos**:

```json
{ "statusCode": 200, "message": "Viajes obtenidos correctamente", "data": [ { }, { } ] }
```

### Listado paginado (con `limit`)

`total`, `currentPage` y `lastPage` van **aplanados en la raíz del sobre**, no bajo `meta`:

```json
{
  "statusCode": 200,
  "message": "Viajes obtenidos correctamente",
  "data": [ { } ],
  "total": 57,
  "currentPage": 1,
  "lastPage": 6
}
```

### Error de negocio (400, 401, 403, 404)

```json
{ "statusCode": 400, "message": "El viaje ya fue eliminado", "data": null }
```

### ⚠️ Error de validación (422) — formato distinto

Es el estándar de Laravel y **no lleva `statusCode` ni `data`**:

```json
{
  "message": "La orden es obligatoria (and 3 more errors)",
  "errors": {
    "order": ["La orden es obligatoria"],
    "clientId": ["El cliente es obligatorio"],
    "shipDate": ["La fecha de embarque no puede ser anterior a la de recolección"]
  }
}
```

El manejador de errores del front debe distinguir las dos formas: `errors` presente → pinta por campo; si no → muestra `message`.

---

## 6. Endpoints

### 6.1 `GET /api/trips` — listar

Cualquier autenticado. Devuelve lo que el ámbito del rol permita (§3).

**Query params — los diez son opcionales y todos son tolerantes: un valor inválido se ignora y devuelve el listado completo, nunca 422 ni lista vacía.**

| Param | Formato | Notas |
|---|---|---|
| `status` | `pending` \| `in_route` \| `finished` | Coincidencia exacta y sensible a mayúsculas. `?status=PENDING` se ignora. |
| `clientId` | numérico | |
| `shippingLineId` | numérico | |
| `locationId` | numérico | |
| `pilotId` | numérico | |
| `vehicleId` | numérico | |
| `dateFrom` | `Y-m-d` **estricto** | Sobre `recolectionDate`, por día completo. `31-12-2026` se ignora. |
| `dateTo` | `Y-m-d` **estricto** | Incluye el día entero: un viaje de las 18:00 entra en el `dateTo` de ese día. |
| `search` | texto | `LIKE` sobre `order` **y** `container`. Insensible a mayúsculas (el término se normaliza). |
| `limit` | numérico | **Activa la paginación.** Acotado a `[10, 100]`: `limit=1` → 10 y `limit=500` → 100. Sin él, colección completa. |

- **Orden fijo:** `recolectionDate` descendente y, a igualdad, `id` descendente. **No hay `sortBy` ni `sortDir`.**
- **Los borrados no salen nunca**, con filtro o sin él, y no hay parámetro que los devuelva.
- Sin coincidencias es **200 con `data: []`**, no 404.

**200** · `Viajes obtenidos correctamente`

### 6.2 `POST /api/trips` — publicar

Solo `administrator`. **Doce campos y los doce obligatorios.**

| Campo | Reglas |
|---|---|
| `order` | texto, máx. 255. Se guarda en MAYÚSCULAS con espacios colapsados. |
| `clientId` | entero, `exists:clients,id`. ⚠️ Borrado → **400**. |
| `shippingLineId` | entero, `exists:shipping_lines,id`. ⚠️ Borrada → **400**. |
| `departurePointId` | entero, `exists:departure_points,id`. ⚠️ Inactivo → **400**. |
| `locationId` | entero, `exists:locations,id`. ⚠️ Debe ser de tipo **`port`** y estar **activo**; si no, **400**. |
| `destination` | texto, máx. 255. Solo `trim`. |
| `container` | texto, máx. 255. MAYÚSCULAS con espacios colapsados. |
| `transport` | texto, máx. 255. Solo `trim`. |
| `recolectionDate` | fecha válida y **futura**. |
| `shipDate` | fecha válida, **futura** y **>= `recolectionDate`**. |
| `polyline` | texto. La resuelve el front con `GET /api/places/directions`. |
| `observations` | texto. Obligatorio. |

**Cinco campos se descartan sin error:** `status`, `pilotId`, `vehicleId`, `assignedBy` y `registeredBy`. El viaje nace `pending`, con los tres campos de tripulación en `null`, y `registeredByName` sale del token.

**201** · `Viaje registrado correctamente` · **422** falta un campo o fecha inválida · **400** catálogo inservible.

### 6.3 `GET /api/trips/{trip}` — detalle

Cualquier autenticado, **dentro de su ámbito**.

**200** · `Viaje obtenido correctamente` · **403** fuera de ámbito · **404** id inexistente **o borrado** (indistinguibles).

### 6.4 `PATCH /api/trips/{trip}` — editar

Solo `administrator`. Acepta también `PUT`, pero **no reemplaza el recurso completo**: se comporta igual que el `PATCH`.

- **Todos los campos son opcionales**; un **cuerpo vacío responde 200** sin cambiar nada (ni `updatedAt`).
- Opcional **no** es vaciable: mandar una clave con `null` o en blanco es **422**.
- Son los mismos doce del alta **más `status`** y **menos `pilotId` y `vehicleId`**.
- **Las dos fechas dejan de exigir futuro** aquí: editar un viaje ya arrancado no obliga a reprogramarlo.
- **Los catálogos se revalidan siempre**, aunque solo muevas una fecha: si el puerto se desactivó desde el alta, el `PATCH` responde **400** aunque no toques `locationId`.
- **`status` acepta los tres valores en cualquier orden**, sin tocar las fechas.

**200** · `Viaje actualizado correctamente` · **400** catálogo inservible o viaje borrado · **404** no existe · **422** valor inválido.

### 6.5 `DELETE /api/trips/{trip}` — dar de baja

Solo `administrator`. Baja lógica **irreversible**: desaparece del listado y del detalle, y **no hay `/restore`**.

**200** · `Viaje eliminado correctamente`, con `deletedAt` **con valor** (única vez que lo verás) · **400** segundo intento · **404** id inexistente.

### 6.6 `PATCH /api/trips/{trip}/assignment` — tomar el viaje

Solo `carrier`, **y con empresa registrada**. Sin cuerpo más que estos dos campos, **los dos obligatorios**:

```json
{ "pilotId": 12, "vehicleId": 8 }
```

- **No se puede asignar solo piloto o solo vehículo**: falta cualquiera → **422**.
- **`null` en cualquiera de los dos → 422**: la desasignación no existe.
- `assignedBy` **no se envía**: sale del token.
- **Reasignar solo mientras el viaje siga `pending`**, y solo desde la empresa que ya lo tomó. Un viaje `in_route` o `finished` → **400**.
- Un `carrier` de otra empresa sobre un viaje ya tomado → **403**.
- La escritura corre en transacción con bloqueo de fila: dos transportistas a la vez no se pisan, solo uno gana.

Reglas de negocio, todas **400**: el usuario debe tener rol `pilot`, tener empresa, el vehículo debe estar `active` (`inactive` y `under_repair` se rechazan) y **los dos deben ser de la misma empresa**.

**200** · `Viaje asignado correctamente`

### 6.7 `PATCH /api/trips/{trip}/start` — arrancar

Solo el **piloto asignado**. **No tiene cuerpo**: `startDate` la pone el `now()` del **servidor** y mandar una fecha no la usa. Deja `status: "in_route"`.

**200** · `Viaje iniciado correctamente` · **403** no eres su piloto · **400** ya iniciado o viaje borrado · **404** no existe.

### 6.8 `PATCH /api/trips/{trip}/finish` — cerrar

Solo el **piloto asignado**. Sin cuerpo. Deja `endDate` con la hora del servidor y `status: "finished"`.

**400 si el viaje no tiene `startDate`**: no se cierra un viaje que nunca arrancó.

**200** · `Viaje finalizado correctamente` · **403** no eres su piloto · **400** ya finalizado, sin iniciar, o viaje borrado · **404** no existe.

---

## 7. Impacto sobre Clientes y Navieras

Este dominio **cambia el comportamiento de dos endpoints ya publicados**:

| Endpoint | Antes | Ahora |
|---|---|---|
| `DELETE /api/clients/{client}` | 200 siempre | **400** si el cliente tiene viajes |
| `DELETE /api/shipping-lines/{shippingLine}` | 200 siempre | **400** si la naviera tiene viajes |

La comprobación **cuenta también los viajes borrados**: borrar el viaje no libera al cliente. Un cliente o una naviera **sin** viajes se siguen borrando con 200, exactamente como antes, y el resto de su contrato queda intacto.

---

## 8. Tabla de mensajes de error (literales)

Listos para mostrarse al usuario, tal como los devuelve la API.

### Validación — 422, dentro de `errors[campo]`

| Campo | Mensajes |
|---|---|
| `order` | `La orden es obligatoria` · `La orden debe ser texto` · `La orden no puede superar los 255 caracteres` |
| `clientId` | `El cliente es obligatorio` · `El cliente debe ser un identificador válido` · `El cliente seleccionado no existe` |
| `shippingLineId` | `La naviera es obligatoria` · `La naviera debe ser un identificador válido` · `La naviera seleccionada no existe` |
| `departurePointId` | `El punto de partida es obligatorio` · `El punto de partida debe ser un identificador válido` · `El punto de partida seleccionado no existe` |
| `locationId` | `El puerto de destino es obligatorio` · `El puerto de destino debe ser un identificador válido` · `El puerto de destino seleccionado no existe` |
| `destination` | `El destino final es obligatorio` · `El destino final debe ser texto` · `El destino final no puede superar los 255 caracteres` |
| `container` | `El contenedor es obligatorio` · `El contenedor debe ser texto` · `El contenedor no puede superar los 255 caracteres` |
| `transport` | `El transporte es obligatorio` · `El transporte debe ser texto` · `El transporte no puede superar los 255 caracteres` |
| `recolectionDate` | `La fecha de recolección es obligatoria` · `La fecha de recolección no es válida` · `La fecha de recolección debe ser futura` |
| `shipDate` | `La fecha de embarque es obligatoria` · `La fecha de embarque no es válida` · `La fecha de embarque debe ser futura` · `La fecha de embarque no puede ser anterior a la de recolección` |
| `polyline` | `La ruta es obligatoria` · `La ruta debe ser texto` |
| `observations` | `Las observaciones son obligatorias` · `Las observaciones deben ser texto` |
| `status` (solo PATCH) | `El estado del viaje es obligatorio` · `El estado del viaje no es válido` |
| `pilotId` (solo assignment) | `El piloto es obligatorio` · `El piloto debe ser un identificador válido` · `El piloto seleccionado no existe` |
| `vehicleId` (solo assignment) | `El vehículo es obligatorio` · `El vehículo debe ser un identificador válido` · `El vehículo seleccionado no existe` |

### Negocio — 400, en `message`

| Mensaje | Cuándo |
|---|---|
| `El cliente seleccionado fue eliminado` | `clientId` de un cliente borrado. |
| `La naviera seleccionada fue eliminada` | `shippingLineId` de una naviera borrada. |
| `El destino seleccionado no es un puerto` | `locationId` de una `location` de tipo `destination`. |
| `El puerto de destino está inactivo` | `locationId` de un puerto con `status: false`. |
| `El punto de partida está inactivo` | `departurePointId` con `status: false`. |
| `El usuario seleccionado no es un piloto` | `pilotId` de un usuario que no tiene rol `pilot`. |
| `El piloto seleccionado no pertenece a ninguna empresa transportista` | El piloto no está vinculado a ninguna empresa. |
| `El vehículo seleccionado no está activo` | Vehículo `inactive` o `under_repair`. |
| `El piloto y el vehículo deben pertenecer a la misma empresa transportista` | Tripulación de dos empresas. |
| `Solo se puede asignar un viaje pendiente` | Reasignar un viaje `in_route` o `finished`. |
| `El viaje ya fue iniciado` | Segundo `/start`. |
| `El viaje ya fue finalizado` | Segundo `/finish`. |
| `El viaje no ha sido iniciado` | `/finish` sobre un viaje sin `startDate`. |
| `El viaje ya fue eliminado` | `PATCH`, `/assignment`, `/start`, `/finish` o segundo `DELETE` sobre un viaje borrado. |
| `No se puede eliminar el cliente porque tiene viajes asociados` | `DELETE /api/clients/{client}`. |
| `No se puede eliminar la naviera porque tiene viajes asociados` | `DELETE /api/shipping-lines/{shippingLine}`. |

### Autorización — 401, 403, 404, en `message`

| Código | Mensaje | Cuándo |
|---|---|---|
| 401 | `El token de sesión no es válido o ha expirado` | Sin token o expirado, en las ocho rutas. |
| 403 | `No tienes permisos para acceder a este recurso` | El rol no alcanza la ruta (middleware). |
| 403 | `Debes estar vinculado a un transportista para acceder a este recurso` | `carrier` sin empresa en `/assignment`. |
| 403 | `No puedes acceder a un viaje que no pertenece a tu empresa transportista` | Detalle de un viaje tomado por otra empresa. |
| 403 | `No puedes acceder a un viaje que no tienes asignado` | Un piloto pidiendo el detalle de un viaje ajeno o de la bolsa. |
| 403 | `No puedes asignar un viaje que ya tomó otra empresa transportista` | `/assignment` sobre un viaje de otra empresa. |
| 403 | `No puedes iniciar un viaje que no tienes asignado` | `/start` desde otro piloto. |
| 403 | `No puedes finalizar un viaje que no tienes asignado` | `/finish` desde otro piloto. |
| 403 | `Necesitas pertenecer a una empresa transportista para asignar un viaje` | `/assignment` sin empresa (respaldo del service). |
| 404 | `El viaje no existe` | Id inexistente, y también un viaje borrado en el detalle. |

⚠️ **Orden de las guardas en `/start` y `/finish`:** primero se comprueba si el viaje está borrado y después si eres su piloto. Un piloto ajeno sobre un viaje borrado recibe **400**, no 403.

---

## 9. Checklist de implementación en el frontend

- [ ] Enviar el header `Authorization: Bearer {token}` en las ocho llamadas.
- [ ] Distinguir los dos formatos de error: `errors` presente → 422 por campo; si no → `message`.
- [ ] **Pintar una interfaz distinta por rol.** El `carrier` necesita dos listas (la bolsa y lo suyo, separables por `assignedById === null`); el `pilot`, solo su agenda, **sin buscador de viajes disponibles**; el `administrator`, el CRUD completo **sin** botones de asignar, arrancar ni cerrar.
- [ ] Resolver la ruta con `GET /api/places/directions` **antes** de mandar el alta, y volver a resolverla y **remandarla en el mismo `PATCH`** cada vez que cambies `locationId` o `departurePointId`.
- [ ] Pintar el mapa con `points` (ya viene decodificado); no decodificar `polyline` a mano.
- [ ] Formatear las fechas de entrada como ISO 8601 o `Y-m-d H:i:s`, y **no reenviar el formato de salida** `d-m-Y h:i:s A`.
- [ ] Usar `Y-m-d` estricto en `dateFrom`/`dateTo`.
- [ ] Traducir `status` en el cliente: la API lo devuelve en inglés.
- [ ] **Contar el relato desde las fechas, no desde `status`**, cuando se contradigan.
- [ ] Deshabilitar el botón de asignar cuando `status !== "pending"`: la API responde 400.
- [ ] Deshabilitar el de cerrar cuando `startDate` sea `null`.
- [ ] No ofrecer «desasignar», «cancelar» ni «restaurar»: no existen.
- [ ] Confirmar el `DELETE` con un aviso claro de que **no se puede deshacer**.
- [ ] Invalidar el viaje en caché tras un `/assignment` ajeno: puede haber salido de tu ámbito.
- [ ] No confiar en un 200 del `PATCH` como prueba de que se aplicó `pilotId` o `vehicleId`: se ignoran en silencio.
- [ ] Recordar que `order` y `container` **no son únicos**: no los uses como clave en una lista, usa `id`.
- [ ] Pedir `limit` solo cuando quieras paginar, y leer `total`/`currentPage`/`lastPage` **de la raíz**, no de `meta`.

---

## 10. Lo que este dominio **no** hace (para no diseñarlo en el front)

- **No hay máquina de estados.** Nada impide que un `finished` vuelva a `pending` conservando sus dos fechas de ejecución.
- **No se puede cancelar un viaje.** No existe `cancelled`: un viaje que no se hará **se borra**.
- **No se puede desasignar.** `pilotId` y `vehicleId` no vuelven a `null` por ninguna vía, y el viaje **no regresa nunca a la bolsa**.
- **El administrador no puede asignar** piloto ni vehículo por ninguna ruta.
- **No se puede restaurar un viaje borrado.** Sin `/restore` y sin `?trashed=true`.
- **No se valida el solapamiento** de piloto ni de vehículo: un mismo piloto puede estar en dos viajes con fechas que se pisan.
- **No hay bitácora.** Editar un viaje o reasignarlo pisa el valor anterior sin dejar rastro: no se sabe quién movió el `status` ni cuándo.
- **No hay costos, tarifas ni facturación.** El viaje no cotiza nada y no toca `freight_rates`; `GET /api/freight-rates/quote` no cambió de forma.
- **No hay archivos adjuntos** (ni carta de porte, ni foto de contenedor), **ni notificaciones** (nadie recibe correo ni push cuando un viaje se publica, se asigna o se cierra), **ni seguimiento en tiempo real** (`polyline` es la ruta prevista y se guarda una sola vez; no hay posición del vehículo).
- **La API no llama a Google** ni recalcula la polilínea.
- **El administrador no puede filtrar por empresa asignataria.** No hay `?assignedBy=` ni `?carrierId=`: el ámbito lo aplica el rol, no un parámetro.
- **`order` y `container` no son únicos**, y no hay forma de exigir que lo sean.

### Hueco conocido, aceptado a propósito

**El `PATCH` no compara `shipDate` contra la `recolectionDate` almacenada.** Si mandas **solo** `shipDate` con una fecha anterior a la recolección guardada, la API responde **200** y guarda el viaje incoherente: la regla `after_or_equal` solo actúa cuando las dos fechas viajan en el **mismo** cuerpo. Mientras no se cierre, **manda siempre las dos juntas** cuando toques cualquiera de ellas, o valida el orden en el front antes de enviar.
