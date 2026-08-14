# Tarifas de flete — referencia de integración para el frontend

Referencia completa del dominio **FreightRates** de la API de Legumex Transportes: seis endpoints REST bajo `/api/freight-rates` para cotizar tarifas de flete por zona, producto y tipo de combustible, y para resolver automáticamente cuánto cuesta la libra hasta un punto del mapa.

Todo lo que hay aquí está verificado contra la implementación real (Laravel 13 + PostGIS) y contra su suite de tests. Los mensajes de error son literales: se pueden mostrar tal cual al usuario.

> Documentación OpenAPI viva: `/api/documentation`.

---

## 1. Lo mínimo que hay que saber antes de escribir código

1. **Una tarifa es una banda abierta.** Rige **desde** su `fuelMin` (precio del combustible) **hacia arriba**, hasta que exista otra banda más alta del mismo par. No hay `fuelMax` y no hay huecos: la cotización **nunca falla** por el precio del combustible.
2. **El precio del combustible nunca viaja en la petición.** En `/quote` solo se manda el **tipo** (`fuelType`); el importe sale siempre del precio vigente en el servidor. Cualquier precio que mandes en la query se ignora por completo.
3. **La cotización no persiste nada.** Es una consulta pura: no es una reserva, no bloquea el precio y no crea ninguna fila.
4. **Todo el dinero va en quetzales.** `fuelMin` en **GTQ por galón**, `pricePerPound` en **GTQ por libra con seis decimales**, `pounds` en **libras**, `total` en GTQ con dos decimales. No hay moneda configurable, ni kilos, ni litros, ni IVA.
5. **`DELETE` borra de verdad (soft delete) y no es idempotente.** La fila desaparece del listado y de la cotización; el **segundo** `DELETE` responde **400**, no 404 ni 200. Es lo contrario de Zones y Products.
6. **El listado no pagina.** No existe `limit`, ni `total`/`currentPage`/`lastPage`.
7. **Escribir —y ver el detalle por id— es solo de `administrator`.** El listado y la cotización los usa cualquier autenticado.

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
| Listar (`GET /api/freight-rates`) | ✅ | ✅ | ✅ | ✅ |
| Cotizar (`GET /api/freight-rates/quote`) | ✅ | ✅ | ✅ | ✅ |
| Ver detalle por id | ✅ | 403 | 403 | 403 |
| Crear, editar, eliminar | ✅ | 403 | 403 | 403 |

⚠️ **El detalle por id es solo de `administrator`**, a diferencia de Zones y FuelPrices. No es un descuido: quien no administra tarifas cotiza con `/quote`, que devuelve el cálculo completo, en vez de leer la fila cruda.

Las tarifas son un dato **nacional de Legumex**: no pertenecen a ninguna empresa transportista. No hay `carrierId`, no hay filtrado por empresa, y un `carrier` que todavía no ha registrado su empresa también puede listar y cotizar (aquí no actúa el middleware `carrier.required`).

Un rol sin permiso recibe **403**:

```json
{ "statusCode": 403, "message": "No tienes permisos para acceder a este recurso", "data": null }
```

---

## 3. Los dos objetos del dominio

Este dominio devuelve **dos formas distintas**, y no son intercambiables.

### 3.1 `FreightRate` — la fila del CRUD

Es lo que devuelve `data` en el listado, el alta, el detalle, la edición y la baja. Once claves, siempre en camelCase y siempre en este orden:

```json
{
  "id": 12,
  "zoneId": 3,
  "zoneName": "ZONA NORTE",
  "productId": 7,
  "productName": "BRÓCOLI",
  "fuelType": "diesel",
  "fuelMin": "35.00",
  "pricePerPound": "0.454120",
  "registeredByName": "Roberto Santizo",
  "createdAt": "13-08-2026 08:45:12 PM",
  "updatedAt": "13-08-2026 08:45:12 PM"
}
```

| Campo | Tipo | Notas para el front |
|---|---|---|
| `id` | `number` | Es el `{freightRate}` de las rutas de detalle, edición y baja. |
| `zoneId` / `zoneName` | `number` / `string \| null` | La zona viene **resuelta por nombre** para no obligar a un segundo `GET`. El nombre está siempre en MAYÚSCULAS. |
| `productId` / `productName` | `number` / `string \| null` | Igual que la zona: nombre en MAYÚSCULAS. |
| `fuelType` | `string` | Uno de `regular`, `premium`, `diesel`, `diesel_premium`. |
| `fuelMin` | `string` | ⚠️ **Llega como string**, no como número: `"35.00"`, dos decimales. GTQ por galón. La tarifa rige **desde** este precio hacia arriba. |
| `pricePerPound` | `string` | ⚠️ **String con seis decimales**: `"0.454120"`. GTQ por libra. No lo redondees antes de multiplicar (§4). |
| `registeredByName` | `string \| null` | Administrador que la dio de alta. No se envía nunca en el body: sale del token. Editar la tarifa **no** lo reescribe. |
| `createdAt` / `updatedAt` | `string \| null` | ⚠️ **No es ISO 8601.** Formato propio `d-m-Y h:i:s A` (`13-08-2026 08:45:12 PM`). Se muestra tal cual; `new Date(...)` sobre él no funciona. |

> Los importes viajan como **string** porque son decimales exactos de base de datos. Convertirlos a `number` en JS es seguro a la escala de este dominio, pero hazlo en un solo sitio y nunca redondees `pricePerPound` antes de multiplicar.

### 3.2 `FreightQuote` — la respuesta de `/quote`

**No es un `FreightRate`.** Añade las tres cosas que hacen auditable el cálculo: el precio de combustible vigente, la banda que se eligió y el total.

```json
{
  "freightRateId": 12,
  "zoneId": 3,
  "zoneName": "ZONA NORTE",
  "productId": 7,
  "productName": "BRÓCOLI",
  "fuelType": "diesel",
  "currentFuelPrice": "40.00",
  "appliedFuelMin": "35.00",
  "pricePerPound": "0.454120",
  "pounds": "45000.00",
  "total": "20435.40"
}
```

| Campo | Tipo | Notas para el front |
|---|---|---|
| `freightRateId` | `number` | Qué tarifa se aplicó. Sirve para auditar; **no se creó nada**, ese id ya existía. |
| `zoneId` / `zoneName` | `number` / `string \| null` | La zona que **contiene** el punto, deducida de `lat`+`lng`. No se envía en la petición. |
| `productId` / `productName` | `number` / `string \| null` | El producto cotizado. |
| `fuelType` | `string` | El tipo enviado en la query. |
| `currentFuelPrice` | `string` | Precio vigente en GTQ/galón. **Sale del servidor, nunca de tu petición.** |
| `appliedFuelMin` | `string` | `fuelMin` de la banda elegida. Ver §4 y §5. |
| `pricePerPound` | `string` | Tarifa aplicada, seis decimales. |
| `pounds` | `string \| null` | Libras enviadas, normalizadas a dos decimales. `null` si no mandaste `pounds`. |
| `total` | `string \| null` | `pounds × pricePerPound`, redondeado **solo al final**. `null` si no mandaste `pounds`. |

### Tipos TypeScript sugeridos

```ts
export type FuelType = 'regular' | 'premium' | 'diesel' | 'diesel_premium';

export interface FreightRate {
  id: number;
  zoneId: number;
  zoneName: string | null;
  productId: number;
  productName: string | null;
  fuelType: FuelType;
  /** GTQ por galón, dos decimales. Rige DESDE este precio hacia arriba. */
  fuelMin: string;
  /** GTQ por libra, SEIS decimales. No redondear antes de multiplicar. */
  pricePerPound: string;
  registeredByName: string | null;
  /** Formato 'd-m-Y h:i:s A', no ISO 8601. */
  createdAt: string | null;
  updatedAt: string | null;
}

export interface FreightQuote {
  freightRateId: number;
  zoneId: number;
  zoneName: string | null;
  productId: number;
  productName: string | null;
  fuelType: FuelType;
  /** Precio vigente en el servidor. Nunca sale de la petición. */
  currentFuelPrice: string;
  /** Banda elegida. Su distancia con currentFuelPrice delata una tarifa vieja. */
  appliedFuelMin: string;
  pricePerPound: string;
  pounds: string | null;
  total: string | null;
}

/** Sobre estándar de la API. Este dominio NUNCA devuelve el sobre paginado. */
export interface ApiEnvelope<T> {
  statusCode: number;
  message: string;
  data: T;
}

/** 422: NO usa el sobre. Formato estándar de Laravel. */
export interface ValidationErrorBody {
  message: string;
  errors: Record<string, string[]>;
}
```

---

## 4. El cálculo del total: dónde se pierden 185 quetzales

Es la única parte del dominio que necesita cuidado real.

**El total autoritativo es el que devuelve la API.** El backend multiplica con los seis decimales completos y redondea **solo al final**:

```
45 000 lb × 0.454120 GTQ/lb = 20 435.40 GTQ
```

Si el front redondea la tarifa a dos decimales antes de multiplicar —lo natural si la pinta en pantalla como `0.45`— obtiene:

```
45 000 lb × 0.45 GTQ/lb = 20 250.00 GTQ     ❌ 185 quetzales de menos
```

**Reglas prácticas:**

- Si conoces las libras, **manda `pounds`** y usa el `total` que devuelve la API. No lo recalcules.
- Si tienes que calcularlo en el cliente (por ejemplo, un simulador que reacciona al teclear), multiplica sobre `pricePerPound` **completo** y redondea solo el resultado final.
- Redondea a dos decimales **solo para mostrar**, nunca para operar.

---

## 5. Banda abierta: cómo se elige la tarifa

Cada tarifa dice «desde este precio de combustible hacia arriba». No hay límite superior explícito: lo marca la siguiente banda del mismo par, si existe.

Con dos bandas cotizadas para *zona norte + brócoli + diésel*:

| Banda | `fuelMin` | `pricePerPound` |
|---|---|---|
| A | `28.00` | `0.400000` |
| B | `35.00` | `0.454120` |

| Diésel vigente | Banda aplicada | Por qué |
|---|---|---|
| `40.00` | **B** (`0.454120`) | La más alta que no supera el vigente. |
| `35.00` | **B** (`0.454120`) | El límite es **inclusivo**. |
| `30.00` | **A** (`0.400000`) | 35 se pasa; 28 no. |
| `25.00` | **A** (`0.400000`) | Por debajo de todas → se aplica la **más barata**, sin error. |

Con una sola banda cotizada, **cualquier** precio de combustible la aplica. Este paso nunca falla: si el par tiene al menos una tarifa, siempre sale una.

### ⚠️ Una banda vieja se aplica en silencio

Una tarifa cotizada *desde 28* sigue rigiendo con el diésel a **60**. La API responde 200 con un número que parece perfectamente válido y que ya no cubre el costo real del flete. **No hay aviso, ni error, ni log.**

La única señal es la distancia entre los dos campos que viajan en cada cotización:

```json
{ "currentFuelPrice": "60.00", "appliedFuelMin": "28.00" }
```

**Recomendación para el front:** si `currentFuelPrice` supera holgadamente a `appliedFuelMin` (por ejemplo, más de un 15–20 %), pinta un aviso visible de que la tarifa lleva tiempo sin recotizarse. Es una decisión de UI: el backend no la toma por ti.

---

## 6. Formato de las respuestas

### Éxito

```json
{ "statusCode": 200, "message": "Tarifas obtenidas correctamente", "data": { ... } }
```

### Listado — **nunca paginado**

`data` es siempre el array completo. **No hay** `total`, `currentPage` ni `lastPage`, y mandar `limit=10` no cambia nada:

```json
{ "statusCode": 200, "message": "Tarifas obtenidas correctamente", "data": [ /* FreightRate[] */ ] }
```

> Es una ruptura deliberada con el resto de la API (Carriers, Vehicles, FuelPrices, Products y Zones **sí** paginan). La tabla de tarifas se lee entera, como una lista de precios, no como un histórico que se navega. Si tu cliente HTTP asume el sobre paginado en todos los listados, este es el caso que lo rompe.

### Error de negocio (400, 401, 403, 404)

```json
{ "statusCode": 400, "message": "La tarifa ya fue eliminada", "data": null }
```

### Error de validación (422) — **formato distinto**

No lleva `statusCode` ni `data`:

```json
{
  "message": "La zona es obligatoria (and 2 more errors)",
  "errors": {
    "zoneId": ["La zona es obligatoria"],
    "fuelType": ["El tipo de combustible no es válido"],
    "pricePerPound": ["La tarifa por libra debe ser mayor que cero"]
  }
}
```

---

## 7. Endpoints

### 7.1 `GET /api/freight-rates` — listar

Cualquier autenticado. Devuelve la tabla de precios completa, **sin paginar**, ordenada por `fuelType ASC` y, dentro de cada tipo, `fuelMin ASC`. Las tarifas eliminadas **no** aparecen.

| Query param | Tipo | Comportamiento |
|---|---|---|
| `zoneId` | `number` | Único filtro que existe. Acota a las tarifas de una zona. |

- Un `zoneId` **no numérico** (`zoneId=norte`) se **ignora en silencio** y devuelve el listado completo, sin 422.
- Un `zoneId` numérico **de una zona que no existe** devuelve **200 con `data: []`**, nunca 404.
- Cualquier otro query param se ignora: **no hay** filtro por `productId` ni por `fuelType`, ni búsqueda, ni orden configurable, ni rango de fechas, ni paginación.

```
GET /api/freight-rates?zoneId=3
```

⚠️ **Cuidado con el volumen sin filtro.** El número de filas es `zonas × productos × tipos de combustible × bandas`: con 15 zonas, 40 productos y tres bandas de diésel ya son 1 800 filas en una sola respuesta. `zoneId` es la única mitigación disponible, y existe porque las tarifas se pintan dentro de la vista de la zona.

Respuestas: **200** (`"Tarifas obtenidas correctamente"`) · **401**.

---

### 7.2 `GET /api/freight-rates/quote` — cotizar

Cualquier autenticado. Es **el** endpoint que debe usar cualquier pantalla que cotice: evita traerse la tabla y elegir la banda a mano.

| Query param | Obligatorio | Reglas |
|---|:--:|---|
| `lat` | ✅ | Numérico, entre -90 y 90. |
| `lng` | ✅ | Numérico, entre -180 y 180. |
| `productId` | ✅ | Entero, debe existir en `products`. |
| `fuelType` | ✅ | Uno de `regular`, `premium`, `diesel`, `diesel_premium`. |
| `pounds` | — | Numérico, entre 0.01 y 99999999.99. Si llega, la respuesta trae `total`. |

```
GET /api/freight-rates/quote?lat=14.6349&lng=-90.5069&productId=7&fuelType=diesel&pounds=45000
```

⚠️ **Aquí los parámetros inválidos NO se ignoran**, a diferencia del `index` de Zones: `lat=200`, `lng=500` o `fuelType=gasolina` responden **422**. Es dinero, y un punto imposible tiene que decirse.

**Qué hace, en este orden** (cada fallo tiene su propio mensaje):

1. Resuelve la **zona activa** que contiene el punto. Si ninguna lo contiene → **404**.
2. Comprueba que el **producto esté activo**. Si no → **400**.
3. Lee el **precio de combustible vigente** de ese tipo. Si no hay ninguno → **400**.
4. Busca las **tarifas vivas** del par (zona + producto + combustible). Si no hay ninguna → **400**.
5. Elige la **banda** (§5). Este paso nunca falla.
6. Si llegó `pounds`, calcula el **total**; si no, `pounds` y `total` viajan `null` y el resto de la respuesta es idéntica.

**No persiste nada.** El número de filas de tarifas no cambia tras llamarla.

Del punto solo se deriva la **zona** que lo contiene. No hay distancia real, kilometraje, geocodificación de direcciones ni cálculo de ruta, y **no se puede mandar `zoneId`** en vez del punto: resolver la zona es justamente lo que se le pide al sistema.

Respuestas: **200** (`"Cotización obtenida correctamente"`) · **400** (tres causas distintas) · **401** · **404** · **422**.

---

### 7.3 `POST /api/freight-rates` — crear

Solo `administrator`.

```json
{
  "zoneId": 3,
  "productId": 7,
  "fuelType": "diesel",
  "fuelMin": 35.00,
  "pricePerPound": 0.454120
}
```

| Campo | Obligatorio | Reglas |
|---|:--:|---|
| `zoneId` | ✅ | Entero, la zona debe **existir** (si no: 422) y estar **activa** (si no: 400). |
| `productId` | ✅ | Entero, mismas dos reglas que la zona. |
| `fuelType` | ✅ | Valor del enum. |
| `fuelMin` | ✅ | Numérico, `[0.01, 999999.99]`. GTQ por galón. |
| `pricePerPound` | ✅ | Numérico, `[0.000001, 999999.999999]`. GTQ por libra. |

`registeredBy` **no se acepta**: sale del token. Mandarlo no tiene efecto.

**Unicidad de banda:** no pueden existir dos tarifas **vivas** con el mismo `(zoneId, productId, fuelType, fuelMin)`. Repetir la combinación es **400**. El mismo `fuelMin` para **otro** combustible, otra zona u otro producto sí se acepta. Tras un `DELETE`, ese `fuelMin` **vuelve a estar libre** y se puede recotizar.

⚠️ **422 vs 400.** Un `zoneId` o `productId` que **no existe** es **422** (regla de validación). Uno que existe pero está **inactivo** es **400** (regla de negocio). Son dos formatos de respuesta distintos: prepara los dos.

⚠️ **Un `fuelMin` mal tecleado no da error.** Escribir `3` en vez de `30` crea una banda válida y distinta de las existentes. A partir de ahí es la banda más barata del par y se aplica a cualquier diésel por debajo de la siguiente. El error solo se descubre al cotizar y ver un número raro. Por eso `fuelMin` es editable.

Respuesta **201**: `{ statusCode: 201, message: "Tarifa registrada correctamente", data: FreightRate }`.

Otras: **400** · **401** · **403** · **422**.

---

### 7.4 `GET /api/freight-rates/{freightRate}` — detalle

⚠️ Solo `administrator`. Los demás roles usan `/quote`.

- Tarifa **eliminada** → **400** (`"La tarifa ya fue eliminada"`), no 404: la fila sigue existiendo con su marca de borrado.
- Id que **nunca existió** → **404** (`"La tarifa no existe"`).

Respuestas: **200** (`"Tarifa obtenida correctamente"`) · **400** · **401** · **403** · **404**.

---

### 7.5 `PATCH /api/freight-rates/{freightRate}` — editar

Solo `administrator`. La ruta acepta `PATCH` y `PUT` indistintamente; el comportamiento es el mismo (**edición parcial en ambos casos**: el `PUT` no reemplaza el recurso completo ni borra los campos omitidos).

Los **cinco** campos son opcionales por separado: `zoneId`, `productId`, `fuelType`, `fuelMin`, `pricePerPound`. Solo se toca lo que venga.

```json
{ "pricePerPound": 0.462500 }
```

Reglas y trampas:

- **Body vacío `{}` → 200 sin cambios.** Es un no-op deliberado, no un error.
- **Las dos reglas de negocio miran el par completo**, no solo lo enviado: lo que no llega se toma de la propia fila.
- ⚠️ **Si la zona o el producto se desactivaron después, el `PATCH` responde 400 aunque solo cambies el precio.** Las tarifas de ese par quedan **congeladas** hasta reactivarlo. El mensaje dice cuál de los dos está inactivo. El `DELETE`, en cambio, **sí** funciona en ese caso: borrar nunca se bloquea.
- Mover `fuelMin` a un valor que ya ocupa **otra** tarifa viva del mismo par → **400**. A un valor libre → **200**. Reenviar **su propio** `fuelMin` → **200** (la comprobación ignora la propia fila).
- `registeredByName` no cambia nunca; `updatedAt` sí.
- **No hay auditoría del precio anterior**: el `PATCH` sobrescribe sin dejar rastro.
- Sobre una tarifa **eliminada** → **400**, no 404.

Respuestas: **200** (`"Tarifa actualizada correctamente"`) · **400** · **401** · **403** · **404** · **422**.

---

### 7.6 `DELETE /api/freight-rates/{freightRate}` — eliminar

Solo `administrator`. ⚠️ Aquí sí **desaparece**, al contrario que en Zones y Products.

- La fila **deja de aparecer** en `GET /api/freight-rates` y deja de aplicarse en `/quote`. Si era la única del par, la cotización pasa a responder 400.
- Sigue existiendo en base de datos con su marca de borrado, así que **libera su `fuelMin`**: se puede volver a cotizar esa misma banda con un `POST` (201).
- **No es idempotente:** el segundo `DELETE` responde **400** (`"La tarifa ya fue eliminada"`), no 200 ni 404. Trátalo como información, no como fallo del usuario.
- **No hay `restore`** ni `toggle-status`. Si hace falta la banda otra vez, se cotiza de nuevo con un `POST`.
- Funciona aunque la zona o el producto estén inactivos.

Respuestas: **200** (`"Tarifa eliminada correctamente"`, con la fila en `data`) · **400** · **401** · **403** · **404**.

---

## 8. Tabla de mensajes de error (literales)

Se pueden mostrar tal cual al usuario; ya están en español.

### Validación (422)

| Campo | Mensaje |
|---|---|
| `zoneId` | `La zona es obligatoria` · `La zona debe ser un identificador numérico` · `La zona seleccionada no existe` |
| `productId` | `El producto es obligatorio` · `El producto debe ser un identificador numérico` · `El producto seleccionado no existe` |
| `fuelType` | `El tipo de combustible es obligatorio` · `El tipo de combustible no es válido` |
| `fuelMin` | `El precio de combustible desde el cual rige la tarifa es obligatorio` · `El precio de combustible debe ser un número en quetzales por galón` · `El precio de combustible debe ser mayor que cero` · `El precio de combustible no puede superar los 999999.99 quetzales por galón` |
| `pricePerPound` | `La tarifa por libra es obligatoria` · `La tarifa por libra debe ser un número en quetzales` · `La tarifa por libra debe ser mayor que cero` · `La tarifa por libra no puede superar los 999999.999999 quetzales` |
| `lat` (quote) | `La latitud del destino es obligatoria` · `La latitud debe ser un número` · `La latitud debe estar entre -90 y 90` |
| `lng` (quote) | `La longitud del destino es obligatoria` · `La longitud debe ser un número` · `La longitud debe estar entre -180 y 180` |
| `pounds` (quote) | `Las libras deben ser un número` · `Las libras deben ser mayores que cero` · `Las libras no pueden superar las 99999999.99` |

### Negocio (400)

| Situación | Mensaje |
|---|---|
| Zona inactiva (alta o edición) | `La zona seleccionada no está activa` |
| Producto inactivo (alta, edición o cotización) | `El producto seleccionado no está activo` |
| Banda repetida en el mismo par | `Ya existe una tarifa para esa zona, ese producto y ese combustible desde ese precio` |
| Tarifa ya eliminada (detalle, edición, 2.º DELETE) | `La tarifa ya fue eliminada` |
| Sin precio de combustible vigente (cotización) | `No existe un precio vigente para el combustible indicado` |
| Par sin ninguna tarifa cotizada (cotización) | `No existe tarifa cotizada para ese producto en esa zona` |

### Sobre

`El token de sesión no es válido o ha expirado` (401) · `No tienes permisos para acceder a este recurso` (403) · `La tarifa no existe` (404) · `El punto indicado no pertenece a ninguna zona registrada` (404, solo en `/quote`).

> Los cuatro fallos de `/quote` tienen mensajes **distintos entre sí** a propósito: el usuario puede saber si el problema es el destino, el producto, el combustible o que nadie ha cotizado ese par.

---

## 9. Checklist de implementación en el frontend

- [ ] Cliente HTTP que adjunta `Authorization: Bearer` y `Accept: application/json` en las seis llamadas.
- [ ] Manejo **de dos formatos de error**: sobre `{statusCode, message, data}` para 400/401/403/404 y `{message, errors}` para 422.
- [ ] Listado **sin** lógica de paginación: no leer `total`/`currentPage`/`lastPage`, no existen aquí.
- [ ] Filtrar por `zoneId` siempre que la vista sea de una zona; asumir que sin filtro la respuesta puede traer miles de filas.
- [ ] Pantalla de cotización que manda `lat`+`lng`+`productId`+`fuelType` y **nunca** un precio de combustible.
- [ ] Usar el `total` de la API cuando se envían `pounds`; si se calcula en cliente, multiplicar sobre `pricePerPound` **completo** y redondear solo al mostrar.
- [ ] Mostrar `currentFuelPrice` junto a `appliedFuelMin` en la cotización, y avisar visualmente cuando la distancia entre ambos sea grande.
- [ ] Distinguir los cuatro fallos de `/quote` en la UI: destino fuera de cobertura (404) frente a las tres causas de 400.
- [ ] Formulario de alta: los cinco campos obligatorios; validar en cliente el rango de `fuelMin` y `pricePerPound`, y avisar de un `fuelMin` sospechosamente bajo (un `3` en vez de `30` no da error en el servidor).
- [ ] Tratar el 422 de zona/producto inexistente y el 400 de zona/producto inactivo como dos casos distintos.
- [ ] `DELETE`: quitar la fila de la tabla al instante (ya no vuelve en el listado) y tratar un segundo intento (400) como información, no como error.
- [ ] Ofrecer «volver a cotizar esta banda» como un `POST` nuevo: no hay `restore`.
- [ ] Fechas: mostrar `createdAt`/`updatedAt` como texto plano; no parsearlas como ISO.
- [ ] Convertir `fuelMin`, `pricePerPound`, `currentFuelPrice`, `pounds` y `total` de string a número en un único módulo, si hace falta operar con ellos.
- [ ] Ocultar o deshabilitar la escritura **y el detalle por id** para los roles que no son `administrator` (el 403 del servidor es la red, no la UX).

---

## 10. Lo que este dominio **no** hace (para no diseñarlo en el front)

- **No programa viajes.** Responde «cuánto vale la libra hasta aquí»; registrar el viaje, su carga, su vehículo, su piloto y su estado es otro dominio.
- No valida solape entre zonas: si dos zonas se cruzan, la cotización usa la de menor `id` sin avisar de que había otra.
- No hay bandas cerradas (`fuelMax`) ni huecos: solo banda abierta hacia arriba.
- No hay distancia real, kilometraje, geocodificación de direcciones ni cálculo de ruta.
- No hay tarifa por vehículo, por capacidad ni por tipo de camión.
- No hay escalas por volumen (precio distinto a partir de X libras) ni descuentos.
- No hay impuestos, IVA, redondeo comercial ni moneda configurable.
- No recalcula ni crea tarifas automáticamente al registrarse un precio de combustible nuevo, ni avisa de bandas no cotizadas.
- No permite simular con un precio de combustible hipotético.
- No guarda histórico del `pricePerPound` anterior: el `PATCH` sobrescribe sin rastro.
- No hay `restore` de tarifas eliminadas.
- No hay filtros por producto o combustible, ni búsqueda, ni orden configurable, ni paginación.
- No hay alta en lote ni importación desde CSV o Excel.
- No permite cotizar mandando `zoneId` en vez del punto, ni varios productos en una sola llamada.
