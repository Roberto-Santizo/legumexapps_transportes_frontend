# Cargas de combustible del viaje — referencia de integración para el frontend

Referencia completa del dominio **Trip Fuels** de la API de Legumex Transportes: **tres endpoints**, dos anidados bajo `/api/trips/{trip}/fuels` y uno suelto en `/api/trip-fuels/{tripFuel}/confirm`, para que la empresa transportista registre cuánto combustible le da a un viaje y el piloto asignado confirme que lo recibió.

El dominio **no se agota en sus tres rutas**: SPEC 27 también cambia dos endpoints ya publicados de `trips` —uno de ellos de forma **incompatible**— y añade una clave a `TripResource`. Si solo lees la sección de endpoints y no la §10, el despliegue te rompe la pantalla de asignación.

Todo lo que hay aquí está verificado contra la implementación real de la rama `spec-27-trip-fuels` (Laravel 13) y contra su suite de tests (39 tests de Feature + 27 de Unit del service; la suite completa pasa con 2 777 tests). Los mensajes de error son literales: se pueden mostrar tal cual al usuario.

> Documentación OpenAPI viva: `/api/documentation`, tag **Trip Fuels**.

---

## 1. Lo mínimo que hay que saber antes de escribir código

1. **`PATCH /api/trips/{trip}/assignment` pasa de dos campos a cuatro, y es cambio incompatible sin periodo de gracia.** Un cliente que siga mandando solo `pilotId` y `vehicleId` recibe **422 en todas sus asignaciones** desde el instante del despliegue. Hay que añadir `fuelGallons` y `fuelType` al cuerpo. Ver §10.1.
2. **El piloto se bloquea a sí mismo hasta confirmar.** `PATCH /api/trips/{trip}/start` tiene una guarda nueva: sin **al menos una carga confirmada**, responde 400 «Debes confirmar al menos una carga de combustible antes de iniciar el viaje». Una carga registrada que nadie confirmó **no sirve**. Ver §10.2.
3. **`totalGallons` y `totalFuelGallons` suman solo las cargas CONFIRMADAS.** Por eso **un viaje recién asignado muestra `"0.00"` teniendo ya una carga registrada**: es el estado normal, no un error. El listado del viaje trae esas cargas con `isConfirmed: false`, así que el front puede explicar el cero en vez de mostrarlo a secas.
4. **La tabla es append-only: una carga mal tecleada es permanente.** No hay `PATCH` ni `DELETE` de una carga, no se puede desconfirmar y **los galones no admiten negativos**, así que ni siquiera se puede compensar con otra carga. Un `450` en vez de `45` contamina el total para siempre —y desde que `/start` mira el combustible, ese total ya no es solo informativo—. **Confirma la cantidad con el usuario antes de mandar el `POST`.**
5. **Reconfirmar responde 200 y no escribe nada**, devolviendo el `loadedAt` original. Es deliberado: un móvil con mala señal reintenta y no debe ver un error. No hay forma de distinguir «acabo de confirmar» de «ya estaba confirmada» por el status; si te hace falta, compara el `loadedAt` que ya tenías.
6. **A diferencia del rastro (SPEC 26), aquí el piloto asignado SÍ lee.** El `GET` lo alcanzan los cuatro roles, acotados por el ámbito de SPEC 24. El dato es sobre él y lo necesita.
7. **Asimetría entre leer y escribir sobre la bolsa libre**: un viaje `pending` **sin asignar** se puede **listar** (200, `data: []`, `totalGallons: "0.00"`, porque la bolsa entra en el ámbito de SPEC 24) pero el `POST` sobre él es **403**. Una carga sin piloto que la confirme nacería atascada.
8. **Toda respuesta viaja en un sobre** `{ statusCode, message, data }`… **salvo el 422**, que usa el formato estándar de Laravel `{ message, errors }`. Son dos formas distintas y el cliente debe distinguirlas.
9. **`gallons` sale como `string` de dos decimales** (`"45.50"`), no como número. Hay que `parseFloat` antes de sumar o comparar.
10. **Las fechas no son ISO 8601.** `loadedAt` sale en el formato propio del proyecto `d-m-Y h:i:s A` (`10-09-2026 03:55:23 PM`). `new Date(...)` sobre él no funciona.
11. **`fuelType` no se valida contra el catálogo de precios.** Se puede cargar `diesel` aunque ningún `FuelPrice` de ese tipo esté vigente: es una etiqueta, no una llave foránea. Y **no se guarda ningún precio ni coste**: este dominio no da ninguna cifra en quetzales.
12. **Los viajes asignados antes de esta spec no pueden arrancar.** Tienen cero cargas y no hubo backfill a propósito. La única salida es que su empresa haga el `POST` —acepta viajes `pending` **y** `in_route`— y el piloto confirme.

---

## 2. Autenticación y permisos

Los tres endpoints exigen el token JWT que devuelve el login:

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
| `POST .../fuels` registrar una carga | 403 | ✅ **solo si su empresa tomó el viaje** | 403 | 403 |
| `GET .../fuels` listar las cargas | ✅ todos los viajes | ✅ los de su ámbito | ✅ **sus propios viajes** | ✅ todos los viajes |
| `PATCH /trip-fuels/{id}/confirm` confirmar | 403 | 403 | ✅ **solo el piloto asignado** | 403 |

**Ninguna de las tres rutas lleva `carrier.required`.** En el `POST`, un `carrier` que todavía no registró su empresa no lo frena el middleware: lo rechaza el service con 403 «No perteneces a ninguna empresa transportista».

Los 403 del middleware de rol llegan **antes** que cualquier validación de cuerpo y traen siempre el mismo mensaje:

```json
{ "statusCode": 403, "message": "No tienes permisos para acceder a este recurso", "data": null }
```

### El ámbito de lectura es el de SPEC 24 y no se reescribe aquí

- `administrator` y `manager` alcanzan las cargas de **cualquier** viaje.
- Un `carrier` alcanza los viajes que **asignó su empresa** más la **bolsa libre** (los `pending` sin piloto ni vehículo).
- Un `pilot` alcanza **solo los viajes donde él es el `pilot_id`**; no ve la bolsa.
- Fuera de ámbito es **403**, no 404: se confirma que el viaje existe.

```json
{ "statusCode": 403, "message": "No puedes acceder a un viaje que no tienes asignado", "data": null }
```
```json
{ "statusCode": 403, "message": "No puedes acceder a un viaje que no pertenece a tu empresa transportista", "data": null }
```

### Escribir no hereda el ámbito de leer

El `POST` es más estricto que el `GET`: exige que el viaje lo haya tomado **la empresa de quien llama**. La comparación va sobre la **empresa** del `assigned_by`, no sobre la persona, así que **cualquier usuario de esa empresa** puede registrar cargas, no solo quien asignó el viaje.

---

## 3. El objeto `TripFuel`

Es lo que devuelve `data` en el `POST` y en el `PATCH`, y cada elemento de `data` en el `GET`. **Ocho claves**, siempre en camelCase y siempre en este orden:

```json
{
  "id": 15,
  "tripId": 16,
  "gallons": "45.50",
  "fuelType": "diesel",
  "isConfirmed": false,
  "loadedAt": null,
  "confirmedByName": null,
  "registeredByName": "Ana López"
}
```

Y una vez confirmada:

```json
{
  "id": 16,
  "tripId": 16,
  "gallons": "8.00",
  "fuelType": "diesel_premium",
  "isConfirmed": true,
  "loadedAt": "10-09-2026 03:55:23 PM",
  "confirmedByName": "Marco Pérez",
  "registeredByName": "Ana López"
}
```

| Campo | Tipo | Notas para el front |
|---|---|---|
| `id` | `number` | Es el parámetro de la ruta de confirmación: `PATCH /api/trip-fuels/{id}/confirm`. **No** es el id del viaje. |
| `tripId` | `number` | Sí viaja, al contrario que en `TripPosition`: la confirmación se pide fuera del viaje y el front necesita saber a qué viaje pertenece la carga. |
| `gallons` | `string` | ⚠️ **String** de dos decimales (`"45.50"`), no número. `parseFloat` antes de sumar. |
| `fuelType` | `string` | Valor **crudo del enum en inglés**, sin traducir: `regular` · `premium` · `diesel` · `diesel_premium`. La traducción la pone el front. **Es por carga**: dos cargas del mismo viaje pueden no coincidir. |
| `isConfirmed` | `boolean` | **Derivado** de `loadedAt`, no tiene columna. `false` = registrada y esperando al piloto. |
| `loadedAt` | `string \| null` | ⚠️ **No es ISO 8601.** Formato `d-m-Y h:i:s A`. Es la **hora del servidor** al confirmar, nunca la del dispositivo, y **no se pisa jamás**. `null` mientras no se confirme. |
| `confirmedByName` | `string \| null` | Nombre del piloto que confirmó. `null` mientras no se confirme. **No viene su id.** |
| `registeredByName` | `string` | Nombre del usuario de la empresa que registró la carga. En la primera carga de un viaje, quien lo asignó. **No viene su id.** |

**No hay `status`**: los dos estados son «sin confirmar» y «confirmada», y `loadedAt` ya los distingue. Usa `isConfirmed` para la UI y `loadedAt` para la fecha.

### Tipos TypeScript sugeridos

```ts
export type FuelType = 'regular' | 'premium' | 'diesel' | 'diesel_premium';

export interface TripFuel {
  /** Id de la CARGA: es el parámetro de /api/trip-fuels/{id}/confirm. */
  id: number;
  tripId: number;
  /** ⚠️ String de 2 decimales, no number. Usa parseFloat antes de sumar. */
  gallons: string;
  /** Valor crudo del enum en inglés; la traducción la pone el front. */
  fuelType: FuelType;
  /** Derivado de loadedAt !== null. No existe una columna status. */
  isConfirmed: boolean;
  /** Formato 'd-m-Y h:i:s A', no ISO 8601. Hora del servidor. null = sin confirmar. */
  loadedAt: string | null;
  confirmedByName: string | null;
  registeredByName: string;
}

/** Respuesta del listado SIN limit. */
export interface TripFuelListResponse {
  statusCode: number;
  message: string;
  data: TripFuel[];
  /** ⚠️ Solo las CONFIRMADAS. String de 2 decimales. Viaja con y sin limit. */
  totalGallons: string;
}

/** Respuesta del listado CON limit numérico: la metadata va en la raíz, no bajo meta. */
export interface PaginatedTripFuelListResponse extends TripFuelListResponse {
  total: number;
  currentPage: number;
  lastPage: number;
}

/** Cuerpo del POST. */
export interface StoreTripFuelPayload {
  gallons: number;
  fuelType: FuelType;
}

/** Cuerpo del PATCH /assignment — CUATRO campos desde SPEC 27. */
export interface AssignTripPayload {
  pilotId: number;
  vehicleId: number;
  fuelGallons: number;
  fuelType: FuelType;
}
```

---

## 4. `totalGallons` y `totalFuelGallons`: la trampa del `"0.00"`

Los dos números son **la misma regla**: suma de los galones de las cargas **confirmadas**, como string de dos decimales.

| Clave | Dónde aparece | Qué suma |
|---|---|---|
| `totalGallons` | En la **raíz del sobre** de `GET /api/trips/{trip}/fuels` | Las cargas confirmadas **de ese viaje** |
| `totalFuelGallons` | Dentro de `TripResource` (clave 35) | Las cargas confirmadas de ese viaje |

Tres cosas que hay que tener claras:

1. **`totalGallons` NO es `total`.** `total` es el conteo de registros que aporta el paginador y solo aparece con `limit`; `totalGallons` es la suma de galones y **viaja siempre**, con y sin paginación. Son dos campos distintos en la misma raíz.
2. **Se calcula antes de paginar.** Con `?limit=10` sobre un viaje de 25 cargas, `totalGallons` sigue siendo el total del viaje (`"250.00"` en el test), no el de la página.
3. **Un viaje recién asignado da `"0.00"` teniendo una carga registrada.** No es un bug: la carga que creó `/assignment` nace sin confirmar. En cuanto el piloto confirme, el número aparece. Enseña las cargas con `isConfirmed: false` al lado del cero y el usuario lo entiende.

---

## 5. Formato de las respuestas

### Éxito

```json
{
  "statusCode": 201,
  "message": "Carga de combustible registrada correctamente",
  "data": { /* TripFuel */ }
}
```

### Listado sin paginar (sin `limit`, o con un `limit` no numérico)

Claves de la raíz: `statusCode`, `message`, `data`, `totalGallons`. **Sin** `total`, `currentPage` ni `lastPage`.

```json
{
  "statusCode": 200,
  "message": "Cargas de combustible obtenidas correctamente",
  "data": [ /* TripFuel[] */ ],
  "totalGallons": "43.00"
}
```

### Listado paginado (con `limit` numérico)

Los metadatos se aplanan **en la raíz** del sobre, **no** bajo `meta`, y `totalGallons` sigue ahí:

```json
{
  "statusCode": 200,
  "message": "Cargas de combustible obtenidas correctamente",
  "data": [ /* TripFuel[] */ ],
  "total": 25,
  "currentPage": 1,
  "lastPage": 3,
  "totalGallons": "250.00"
}
```

### Error de validación (422) — **formato distinto**

No usa el sobre. Es el formato estándar de Laravel:

```json
{
  "message": "Los galones son obligatorios (and 1 more error)",
  "errors": {
    "gallons": ["Los galones son obligatorios"],
    "fuelType": ["El tipo de combustible es obligatorio"]
  }
}
```

Muestra los valores de `errors`, no el `message`, que trae el sufijo `(and N more errors)` en inglés.

### Errores de negocio (400, 401, 403, 404) — sobre

```json
{ "statusCode": 400, "message": "El viaje ya fue finalizado", "data": null }
```

---

## 6. Endpoints

### 6.1 `POST /api/trips/{trip}/fuels` — registrar una carga

Solo `carrier`, y solo si **su empresa tomó el viaje**. `{trip}` es el `id` del viaje.

**Cuerpo — exactamente dos campos, los dos obligatorios:**

```json
{ "gallons": 20, "fuelType": "diesel" }
```

| Campo | Reglas | Notas |
|---|---|---|
| `gallons` | `required`, `numeric`, `min:0.01` | Acepta número o cadena numérica. **Cero y negativos son 422.** Sin ninguna validación cruzada: no se compara con `kilometersPerGallon` del vehículo, ni con la distancia, ni con un techo de negocio. |
| `fuelType` | `required`, uno de los cuatro casos del enum | `regular` · `premium` · `diesel` · `diesel_premium`. **Sensible a mayúsculas**: `DIESEL` es 422. No se exige que ese tipo tenga un precio vigente. |

**`tripId`, `loadedAt`, `confirmedBy` y `registeredBy` no se aceptan** y mandarlos se descarta en silencio: el viaje va en la URL, la fecha la pone el servidor al confirmar, el piloto sale de su propio token y el autor del alta, del token de quien registra. Cualquier otra clave se ignora igual.

**La carga nace sin confirmar**: `isConfirmed: false`, `loadedAt: null`, `confirmedByName: null`.

**Las cuatro guardas del service, en orden fijo** (solo se llega a ellas con un cuerpo válido):

| Orden | Situación | Código | Mensaje |
|:--:|---|:--:|---|
| 1 | El viaje no existe | 404 | `El viaje no existe` |
| 2 | El viaje fue eliminado | 400 | `El viaje ya fue eliminado` |
| 3 | El viaje **no está asignado**, o lo tomó otra empresa | 403 | `No puedes registrar combustible en un viaje que no tomó tu empresa transportista` |
| 4 | El viaje está `finished` | 400 | `El viaje ya fue finalizado` |

Ese orden es contrato: un viaje **borrado y ajeno** devuelve el 400 del borrado, no el 403 del ajeno.

Aparte, un `carrier` sin empresa registrada recibe **403 «No perteneces a ninguna empresa transportista»**.

**Se carga en `pending` y en `in_route`**, nunca después: una recarga en carretera es el caso real. El `status` del viaje no se toca y registrar una carga no cambia nada del viaje.

**Dos cargas idénticas seguidas son legítimas** —dos camionadas iguales— y nada las serializa: no hay índice único ni comprobación de duplicados. Si el usuario pulsa dos veces, se crean dos filas.

| Código | Situación | `message` |
|:--:|---|---|
| **201** | La carga se registró | `Carga de combustible registrada correctamente` |
| 400 | Viaje borrado o ya finalizado | ver tabla de guardas |
| 401 | Sin token o expirado | `El token de sesión no es válido o ha expirado` |
| 403 | Rol distinto de `carrier`, empresa ajena, viaje sin asignar, o `carrier` sin empresa | ver §2 y tabla de guardas |
| 404 | El viaje no existe | `El viaje no existe` |
| 422 | Cuerpo inválido | formato `{ message, errors }` |

⚠️ **El 422 se adelanta a las cuatro guardas.** El FormRequest se resuelve antes que el controlador, así que un cuerpo inválido devuelve **422 aunque el viaje no exista, esté borrado, sea ajeno o esté finalizado**. Solo el middleware `role:carrier` (403) va por delante.

---

### 6.2 `GET /api/trips/{trip}/fuels` — listar las cargas del viaje

Cualquier autenticado, acotado por el ámbito de SPEC 24 — **incluido el `pilot` asignado**.

**Query params — solo dos, y ninguno obligatorio:**

| Param | Efecto |
|---|---|
| `limit` | **Su presencia activa la paginación.** Numérico, **acotado a `[10, 100]`**. Omitido o no numérico (`limit=abc`) → se devuelven todas las cargas sin metadatos de paginación. |
| `page` | Página, solo con `limit`. |

⚠️ `limit=1` y `limit=5` devuelven páginas de **10**, y `limit=500` de 100. No asumas que la página tendrá el tamaño pedido.

**No hay ni un solo filtro:** ni por `fuelType`, ni por estado de confirmación, ni por fecha. Cualquier otro query param se ignora.

**Orden fijo:** `id` **ascendente** —la cronología real de registro—. No se ordena por `loadedAt`, que puede ser `null`. No hay `sortBy` ni `sortDir`.

**Un viaje sin cargas** devuelve **200 con `data: []` y `totalGallons: "0.00"`**, nunca 404.

| Código | Situación | `message` |
|:--:|---|---|
| 200 | Cargas devueltas (posiblemente vacío) | `Cargas de combustible obtenidas correctamente` |
| 401 | Sin token o expirado | `El token de sesión no es válido o ha expirado` |
| 403 | `pilot` sobre un viaje que no es suyo | `No puedes acceder a un viaje que no tienes asignado` |
| 403 | `carrier` fuera de ámbito | `No puedes acceder a un viaje que no pertenece a tu empresa transportista` |
| 404 | El viaje no existe **o está borrado** | `El viaje no existe` |

⚠️ **Asimetría deliberada con el `POST`:** un viaje borrado devuelve **404** en el `GET` («El viaje no existe») y **400** en el `POST` («El viaje ya fue eliminado»). Es la misma regla que en `/positions`: para quien lee, un viaje borrado simplemente no está.

---

### 6.3 `PATCH /api/trip-fuels/{tripFuel}/confirm` — confirmar una carga

Solo `pilot`, y solo el **piloto asignado** al viaje de esa carga. `{tripFuel}` es el **`id` de la carga**, no el del viaje: la ruta no está anidada porque el id de la carga ya identifica el viaje.

**Sin cuerpo y sin FormRequest**, como `/start` y `/finish`. Acepta cuerpo vacío, y **mandar `loadedAt`, `gallons` o `confirmedBy` no cambia nada**: se ignora por completo. El efecto único es la fecha del servidor.

**Efecto:** `loadedAt = now()` y `confirmedByName` = el piloto, escritos juntos. A partir de ahí `isConfirmed` es `true` y la carga entra en `totalGallons` y en `totalFuelGallons`.

**Reconfirmar es 200 sin escribir nada**, devolviendo la carga con su `loadedAt` original. No hay forma de desconfirmar: `loadedAt` no vuelve a `null` por ninguna vía.

**No mira el `status` del viaje.** Un piloto puede confirmar la carga de un viaje ya `finished` —papeleo atrasado—; prohibirlo solo crearía filas imposibles de cerrar.

| Código | Situación | `message` |
|:--:|---|---|
| **200** | La carga quedó confirmada, **o ya lo estaba** | `Carga de combustible confirmada correctamente` |
| 401 | Sin token o expirado | `El token de sesión no es válido o ha expirado` |
| 403 | Rol distinto de `pilot` | `No tienes permisos para acceder a este recurso` |
| 403 | Un `pilot` que no es el asignado al viaje de la carga | `No puedes confirmar la carga de un viaje que no tienes asignado` |
| 404 | La carga no existe | `La carga de combustible no existe` |

⚠️ **La carga de un viaje borrado responde 403, no 400.** Es la única ruta de escritura del dominio sin el 400 «El viaje ya fue eliminado» que usan todas las demás: al estar el viaje con baja lógica, la relación no resuelve y la petición cae en la comprobación del piloto, incluso siendo el asignado. Indistinguible de una carga ajena. Está documentado tal como se comporta hoy; si al front le hace falta el 400, es una spec aparte.

---

## 7. Tabla de mensajes de error (literales)

Se pueden mostrar tal cual al usuario; ya están en español.

### Validación del cuerpo (422, formato `{ message, errors }`)

#### `POST /api/trips/{trip}/fuels`

| Campo | Mensaje |
|---|---|
| `gallons` | `Los galones son obligatorios` · `Los galones deben ser un número` · `Los galones deben ser mayores a 0` |
| `fuelType` | `El tipo de combustible es obligatorio` · `El tipo de combustible seleccionado no es válido` |

#### `PATCH /api/trips/{trip}/assignment` (los dos campos nuevos)

| Campo | Mensaje |
|---|---|
| `fuelGallons` | `Los galones de combustible son obligatorios` · `Los galones de combustible deben ser un número` · `Los galones de combustible deben ser mayores a 0` |
| `fuelType` | `El tipo de combustible es obligatorio` · `El tipo de combustible seleccionado no es válido` |
| `pilotId` | `El piloto es obligatorio` · `El piloto debe ser un identificador válido` · `El piloto seleccionado no existe` |
| `vehicleId` | `El vehículo es obligatorio` · `El vehículo debe ser un identificador válido` · `El vehículo seleccionado no existe` |

### Errores de sobre

| Código | Mensaje | Cuándo |
|:--:|---|---|
| 400 | `El viaje ya fue eliminado` | `POST` sobre un viaje con baja lógica |
| 400 | `El viaje ya fue finalizado` | `POST` sobre un viaje `finished` |
| 400 | `Debes confirmar al menos una carga de combustible antes de iniciar el viaje` | `PATCH .../start` sin ninguna carga confirmada |
| 401 | `El token de sesión no es válido o ha expirado` | Sin token o expirado, en los tres endpoints |
| 403 | `No tienes permisos para acceder a este recurso` | Middleware de rol: cualquiera menos `carrier` en el `POST`, cualquiera menos `pilot` en el `confirm` |
| 403 | `No perteneces a ninguna empresa transportista` | `POST` de un `carrier` que aún no registró su empresa |
| 403 | `No puedes registrar combustible en un viaje que no tomó tu empresa transportista` | `POST` sobre un viaje ajeno **o sin asignar** |
| 403 | `No puedes confirmar la carga de un viaje que no tienes asignado` | `confirm` de otro piloto, o de una carga cuyo viaje está borrado |
| 403 | `No puedes acceder a un viaje que no tienes asignado` | `GET` de un `pilot` sobre un viaje ajeno |
| 403 | `No puedes acceder a un viaje que no pertenece a tu empresa transportista` | `GET` de un `carrier` fuera de ámbito |
| 404 | `El viaje no existe` | `POST` con id inexistente; `GET` con id inexistente **o borrado** |
| 404 | `La carga de combustible no existe` | `confirm` con un `{tripFuel}` inexistente |

### Mensajes de éxito

| Código | Mensaje |
|:--:|---|
| 201 | `Carga de combustible registrada correctamente` |
| 200 | `Cargas de combustible obtenidas correctamente` |
| 200 | `Carga de combustible confirmada correctamente` (también al reconfirmar, sin escribir nada) |

---

## 8. Checklist de implementación en el frontend

### Pantalla de asignación (rol `carrier`) — **la que rompe el despliegue**

- [ ] Añadir `fuelGallons` y `fuelType` al cuerpo de `PATCH /api/trips/{trip}/assignment`. **Sin ellos, todas las asignaciones son 422.**
- [ ] Selector de `fuelType` con los cuatro valores del enum **en minúsculas** (`regular`, `premium`, `diesel`, `diesel_premium`), mostrando etiquetas traducidas por el front.
- [ ] Validar en cliente que `fuelGallons > 0`: cero y negativos son 422.
- [ ] Explicar en la UI que esos galones quedan **pendientes de confirmación** del piloto y que el viaje **no podrá arrancar** hasta que confirme.
- [ ] Avisar de que **reasignar añade otra carga**, no reemplaza la anterior: dos reasignaciones dejan tres cargas sumables.

### Pantalla de cargas del viaje (administrador / transportista)

- [ ] Listar con `GET /api/trips/{trip}/fuels`; tratar `data: []` como «sin cargas», no como error.
- [ ] Leer `totalGallons` **de la raíz** del sobre, no de `data`, y **no confundirlo con `total`**.
- [ ] Etiquetar el total como «galones confirmados» y mostrar junto a él las cargas con `isConfirmed: false`, para que el `"0.00"` de un viaje recién asignado se explique solo.
- [ ] `parseFloat` sobre `gallons` y sobre `totalGallons` antes de sumar o comparar.
- [ ] Mostrar `loadedAt` como texto plano; no parsearlo como ISO 8601.
- [ ] Paginar leyendo `total`/`currentPage`/`lastPage` de la raíz y **no asumir el tamaño pedido**: el `limit` sube al piso de 10.
- [ ] No ofrecer editar ni borrar una carga: no existen esas rutas. **Pedir confirmación antes del `POST`**, porque el error es permanente.
- [ ] No esperar ningún filtro ni ordenación: el orden es `id` ascendente y fijo.

### App del piloto

- [ ] Botón de confirmar por carga: `PATCH /api/trip-fuels/{id}/confirm`, **con el id de la carga**, sin cuerpo.
- [ ] Tratar el 200 como éxito idempotente: reintentar es seguro y no duplica ni repisa la fecha.
- [ ] Bloquear el botón de iniciar viaje mientras no haya **al menos una carga confirmada**, y mostrar el 400 literal si el servidor lo rechaza.
- [ ] Distinguir los dos 400 de `/start`: «El viaje ya fue iniciado» (ya está en ruta) del de combustible.
- [ ] El piloto **sí** puede listar las cargas de sus propios viajes: esa pantalla es legítima para él.

### Transversal

- [ ] Cliente HTTP con `Authorization: Bearer` y `Accept: application/json`.
- [ ] Manejar los dos formatos de error: sobre para 400/401/403/404 y `{ message, errors }` para 422.
- [ ] Leer `totalFuelGallons` del detalle del viaje (clave 35 de `TripResource`) sabiendo que **solo cuenta lo confirmado**.
- [ ] No romperse si `TripResource` crece: la clave nueva va entre `registeredByName` y `createdAt`.

---

## 9. Lo que este dominio **no** hace (para no diseñarlo en el front)

- **No hay coste ni precio.** Ni el precio vigente, ni el total en quetzales, ni nada monetario. `fuel_prices` no se consulta en ningún punto.
- **No exige que el `fuelType` tenga precio vigente**: es una etiqueta, no una llave foránea.
- **No se corrige ni se borra una carga.** Sin `PATCH`, sin `DELETE`: la tabla es append-only y los galones no admiten negativos, así que **ni compensando**. Es el hueco más grande de la spec.
- **No se desconfirma.** `loadedAt` no vuelve a `null` por ninguna vía.
- **No hay «galones realmente recibidos».** El piloto confirma o no confirma; no reporta una cantidad distinta ni una observación. No hay discrepancia porque no hay dos números.
- **No hay consumo real ni rendimiento**: `kilometersPerGallon` del vehículo no se cruza con nada.
- **No hay guarda de combustible en `/finish`**: un viaje `in_route` se cierra aunque tenga cargas sin confirmar.
- **No hay notificaciones ni tiempo real.** Registrar o confirmar no emite por Reverb ni manda correo; el canal `trips.{tripId}` sigue llevando solo posiciones.
- **No hay combustible en el listado de viajes.** `TripListResource` sigue en 15 claves, `GET /api/trips/current` no cambia de forma y `GET /api/trips` **no gana ningún filtro de combustible** (mandarlo se ignora y devuelve el listado completo).
- **Ni `administrator` ni `manager` pueden cargar o confirmar.** El `PATCH` general de un viaje no acepta nada de combustible: mandar `fuelGallons` o `fuelType` responde 200 y **no escribe nada** en `trip_fuels`.
- **No existe un listado global** `GET /api/trip-fuels`: el índice va siempre viaje → cargas.
- **No hubo backfill.** Los viajes asignados antes de esta spec tienen cero cargas y no arrancan hasta que su empresa registre una y el piloto la confirme.
- **No hay confirmación en lote**: una llamada por carga, para poder confirmar una y no otra.
- **No hay bitácora de ediciones ni de confirmaciones** más allá de la propia fila: `loadedAt` y `confirmedByName` son todo el rastro.

---

## 10. Lo que SPEC 27 cambia en el dominio `trips`

Esta es la parte que **no** está en los tres endpoints nuevos y que rompe cosas si no se lee.

### 10.1 `PATCH /api/trips/{trip}/assignment` — cambio incompatible

De dos campos a **cuatro, los cuatro obligatorios**:

```json
{
  "pilotId": 12,
  "vehicleId": 8,
  "fuelGallons": 45.5,
  "fuelType": "diesel"
}
```

- **Sin periodo de gracia**: un cliente que siga mandando dos campos recibe 422 con los mensajes de `fuelGallons` y `fuelType`.
- La **primera carga se inserta en la misma transacción** que la asignación: si el insert falla, la asignación entera se deshace. **Ningún viaje queda asignado con cero cargas.**
- Si la asignación falla por cualquiera de sus guardas (403 de empresa ajena, 400 de viaje no pendiente, 400 de tripulación inválida), **no queda ninguna fila** en `trip_fuels`.
- **Reasignar añade otra carga**, no pisa la anterior. Es el único historial de esta spec: piloto y vehículo no dejan rastro de sus cambios, las cargas sí.
- La respuesta sigue siendo el `TripResource`, y su `totalFuelGallons` será **`"0.00"`** justo después de asignar, porque la carga nace sin confirmar.

### 10.2 `PATCH /api/trips/{trip}/start` — cuarta guarda

Gana un 400 nuevo, comprobado **después** de las tres que ya tenía:

| Orden | Situación | Código | Mensaje |
|:--:|---|:--:|---|
| 1 | El viaje fue eliminado | 400 | `El viaje ya fue eliminado` |
| 2 | Quien llama no es el piloto asignado | 403 | `No puedes iniciar un viaje que no tienes asignado` |
| 3 | El viaje ya fue iniciado | 400 | `El viaje ya fue iniciado` |
| 4 | **Ninguna carga confirmada** | 400 | `Debes confirmar al menos una carga de combustible antes de iniciar el viaje` |

- Una carga **registrada pero sin confirmar no sirve**: sigue siendo 400 y el viaje se queda `pending` con `startDate` en `null`.
- El orden importa: un reintento sobre un viaje ya en curso sigue diciendo «El viaje ya fue iniciado», **no** habla de combustible.
- El 403 del piloto no asignado sigue llegando **antes** de que se mire el combustible.
- ⚠️ **Un viaje puede quedar bloqueado y nadie más puede desbloquearlo.** Si la empresa no registra ninguna carga, o el piloto no confirma la que hay, `/start` responde 400 y **el administrador no puede hacer nada**: su `PATCH` no toca `trip_fuels`. La salida es corta y siempre está abierta —`POST` del `carrier` + `confirm` del piloto—, y el mensaje del 400 dice literalmente qué falta.

### 10.3 `TripResource` pasa de 34 a 35 claves

Nueva clave **`totalFuelGallons`**, insertada **entre `registeredByName` y `createdAt`**:

- String de dos decimales (`"45.50"`), `"0.00"` cuando no hay ninguna carga confirmada.
- Suma **solo las confirmadas**, igual que `totalGallons`.
- Aparece en los **siete endpoints** que devuelven el detalle del viaje (`store`, `show`, `update`, `destroy`, `assignment`, `start`, `finish`).
- `TripListResource` **no cambia**: sigue en 15 claves, sin nada de combustible. `GET /api/trips/current` tampoco.
