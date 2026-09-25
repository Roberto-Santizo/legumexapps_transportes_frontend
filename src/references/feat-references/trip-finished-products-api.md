# Productos terminados del viaje — referencia de integración para el frontend

Referencia completa del dominio **TripFinishedProduct** (SPEC 37) de la API de Legumex Transportes: cuatro endpoints REST bajo `/api/trip-finished-products` para registrar **cuántas cajas de cada producto terminado del cliente lleva un viaje**, más dos cambios en los endpoints de viajes (`POST /api/trips` exige ahora `products` y `PATCH /api/trips/{trip}` bloquea el cambio de cliente).

Todo lo que hay aquí está verificado contra la implementación real (rutas, FormRequests, Resource, Service) y contra su suite de tests. Los mensajes de error son literales: se pueden mostrar tal cual al usuario.

> Documentación OpenAPI viva: `/api/documentation` (tag **Trip Finished Products**).

---

## 1. Lo mínimo que hay que saber antes de escribir código

1. **`POST /api/trips` rompe compatibilidad: pasa de 14 a 15 campos obligatorios.** El nuevo es `products: [{ finishedProductId, boxes }]`, con al menos una línea. Un alta sin `products` es **422** desde el día del despliegue, sin periodo de gracia.
2. **Las rutas NO van anidadas bajo el viaje.** No existe `/api/trips/{trip}/finished-products`. El viaje va en el query param **obligatorio** `tripId` del listado (`GET /api/trip-finished-products?tripId=12`) y en el body del alta.
3. **Las líneas no salen en el viaje.** `GET /api/trips/{trip}` y `GET /api/trips` no traen `products` ni `totalBoxes`: para pintarlas hay que pedir el listado aparte.
4. **Solo se editan mientras el viaje está `pending`.** En `in_route` o `finished`, alta, edición y borrado de líneas responden **400** «Solo se pueden modificar los productos de un viaje pendiente».
5. **Un viaje nunca se queda sin líneas**: borrar la última es **400**. Para cambiar el único producto, primero agrega el nuevo y luego borra el viejo.
6. **La línea solo edita `boxes`.** Cambiar de producto es borrar la línea y crear otra; `tripId` y `finishedProductId` en el `PATCH` se ignoran en silencio.
7. **El producto debe ser del cliente del viaje**, y por eso **no se puede cambiar el `clientId` de un viaje que tiene líneas** (400).
8. **Código, nombre, presentación y cajas por tarima se leen en vivo** del producto terminado. Si alguien edita el producto, cambia lo que muestran todos los viajes que lo llevan, también los finalizados.
9. **El listado nunca pagina.** `?limit=` se ignora y el sobre no trae `total`/`currentPage`/`lastPage`.
10. **Salida en camelCase y fechas en `d-m-Y h:i:s A`** (`25-09-2026 10:15:00 AM`), no ISO 8601. `presentation` y `boxesPerPallet` son **strings** de dos decimales; `boxes` es **entero**.

---

## 2. Autenticación y permisos

Los cuatro endpoints exigen el token JWT del login:

```
Authorization: Bearer {token}
Accept: application/json
```

Sin token, o con uno expirado, la respuesta es **401**:

```json
{ "statusCode": 401, "message": "El token de sesión no es válido o ha expirado", "data": null }
```

| Acción | `administrator` | `manager` | `export` | `user` | `shipment` | `carrier` | `pilot` |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Listar las líneas de un viaje | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ ámbito | ✅ solo su viaje |
| Agregar, editar cajas, quitar línea | ✅ | 403 | ✅ | 403 | 403 | 403 | 403 |

- **Lectura** con `jwt.auth` a secas y el **mismo ámbito que el detalle del viaje** (`GET /api/trips/{trip}`):
  - `administrator`, `manager`, `export`, `user` y `shipment` leen cualquier viaje.
  - El `pilot` solo el viaje que tiene asignado. En otro recibe 403 «No puedes acceder a un viaje que no tienes asignado». A diferencia de `/positions` y `/timeouts`, **aquí sí lee**: son las cajas que lleva.
  - El `carrier` lee la bolsa (viajes `pending` sin tripulación) y los viajes que tomó su empresa. En cualquier otro recibe 403 «No puedes acceder a un viaje que no pertenece a tu empresa transportista».
- **Escritura** con `role:administrator,export`, los mismos roles que crean viajes. El resto recibe:

```json
{ "statusCode": 403, "message": "No tienes permisos para acceder a este recurso", "data": null }
```

Ninguna ruta lleva `carrier.required`.

---

## 3. El objeto `TripFinishedProduct`

Es lo que devuelve `data` en alta, edición y borrado, y cada elemento de `data` en el listado. **Diez claves**, siempre en este orden:

```json
{
  "id": 1,
  "tripId": 12,
  "finishedProductId": 4,
  "code": "BRO-IQF-10",
  "name": "BRÓCOLI FLORETE IQF",
  "presentation": "10.00",
  "boxesPerPallet": "96.50",
  "boxes": 960,
  "registeredByName": "Admin",
  "createdAt": "25-09-2026 10:15:00 AM"
}
```

| Campo | Tipo | Notas para el front |
|---|---|---|
| `id` | `number` | Id de la **línea**. Es el `{tripFinishedProduct}` de `PATCH` y `DELETE`. No es el id del producto. |
| `tripId` | `number` | Viaje de la línea. Inmutable. |
| `finishedProductId` | `number` | Producto terminado (`/api/finished-products/{id}`). Inmutable. |
| `code` | `string` | Código del producto, leído en vivo. |
| `name` | `string` | Nombre del producto, leído en vivo (en MAYÚSCULAS, como lo guarda SPEC 36). |
| `presentation` | `string` | ⚠️ **String** de dos decimales (`"10.00"`), leído en vivo. Usa `parseFloat` antes de operar. |
| `boxesPerPallet` | `string` | ⚠️ **String** de dos decimales (`"96.50"`), leído en vivo. La API **no calcula tarimas**: si las muestras, el cálculo `boxes / boxesPerPallet` es tuyo. |
| `boxes` | `number` | **Entero.** Cajas físicas de la línea (1–999999). Es el único campo editable. |
| `registeredByName` | `string \| null` | Quien registró la línea. Sale del token, no del body, y **no cambia al editarla**. |
| `createdAt` | `string` | ⚠️ `d-m-Y h:i:s A`, no ISO 8601. No hay `updatedAt`. |

**Producto borrado después.** Si el producto terminado se elimina (SPEC 36) después de estar en un viaje, la línea **sigue apareciendo** con su `code`, `name`, etc. La respuesta no trae ninguna marca de «producto eliminado».

### Tipos TypeScript sugeridos

```ts
export interface TripFinishedProduct {
  id: number;
  tripId: number;
  finishedProductId: number;
  code: string;
  name: string;
  /** Decimal como string, dos decimales. */
  presentation: string;
  /** Decimal como string, dos decimales. */
  boxesPerPallet: string;
  /** Entero. */
  boxes: number;
  registeredByName: string | null;
  /** Formato 'd-m-Y h:i:s A', no ISO 8601. */
  createdAt: string;
}

/** Línea del body de POST /api/trips. */
export interface TripProductInput {
  finishedProductId: number;
  boxes: number;
}

export interface StoreTripFinishedProductBody {
  tripId: number;
  finishedProductId: number;
  boxes: number;
}

export interface UpdateTripFinishedProductBody {
  boxes: number;
}

/** Sobre estándar de la API. */
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

## 4. Formato de las respuestas

### Éxito

```json
{ "statusCode": 201, "message": "Producto agregado al viaje correctamente", "data": { /* TripFinishedProduct */ } }
```

### Listado (siempre sin paginar)

`data` es el array completo, en orden `id ASC` (el orden en que se registraron). **No hay** metadatos de paginación, ni siquiera mandando `limit`:

```json
{ "statusCode": 200, "message": "Productos del viaje obtenidos correctamente", "data": [ /* TripFinishedProduct[] */ ] }
```

Un viaje sin líneas, como los creados antes de SPEC 37 (no hubo backfill), devuelve `"data": []` con 200.

> Por referencia, en el resto del proyecto un listado **paginado** aplana `total`, `currentPage` y `lastPage` en la raíz del sobre, no bajo `meta`. Este dominio no pagina nunca.

### Error de negocio (400, 401, 403, 404)

```json
{ "statusCode": 400, "message": "El producto terminado ya está en el viaje", "data": null }
```

### Error de validación (422): formato distinto

No lleva `statusCode` ni `data`. En `POST /api/trips` las claves de las líneas usan la ruta del campo, `products.{índice}.{campo}`, con índice **desde 0**:

```json
{
  "message": "El producto terminado está repetido en el viaje (and 1 more error)",
  "errors": {
    "products.1.finishedProductId": ["El producto terminado está repetido en el viaje"],
    "products.0.boxes": ["Las cajas deben ser al menos 1"]
  }
}
```

---

## 5. Endpoints

### 5.1 `GET /api/trip-finished-products?tripId=` — listar las líneas de un viaje

| Query param | Tipo | Comportamiento |
|---|---|---|
| `tripId` | `number` | **Obligatorio.** Sin él o no entero → 422. |

No hay más filtros; `limit` y `page` se ignoran. Orden fijo `id ASC`.

Respuestas:

- **200** «Productos del viaje obtenidos correctamente».
- **401**.
- **403** si el viaje está fuera del ámbito (ver §2).
- **404** «El viaje no existe», tanto si el viaje no existe como si **fue borrado**.
- **422** sin `tripId`.

---

### 5.2 `POST /api/trip-finished-products` — agregar un producto a un viaje

Solo `administrator` y `export`.

```json
{ "tripId": 12, "finishedProductId": 7, "boxes": 120 }
```

| Campo | Obligatorio | Reglas |
|---|:--:|---|
| `tripId` | ✅ | Entero, debe existir (`exists:trips,id`). Un viaje **borrado** pasa esta regla y lo para el service con 400. |
| `finishedProductId` | ✅ | Entero, debe existir. Un producto **borrado** pasa la regla y lo para el service con 400. |
| `boxes` | ✅ | Entero de 1 a 999999. `0`, `1.5` o `1000000` → 422. |

`registeredBy` no se acepta: sale del token.

**Cinco guardas del service, en este orden** (cada una 400; la primera que falla es la que se devuelve):

1. «El viaje ya fue eliminado»
2. «Solo se pueden modificar los productos de un viaje pendiente»
3. «El producto terminado seleccionado ya fue eliminado»
4. «El producto terminado no pertenece al cliente del viaje»
5. «El producto terminado ya está en el viaje»

Respuestas:

- **201** «Producto agregado al viaje correctamente».
- **400** por cualquiera de las cinco guardas.
- **401**.
- **403** para un rol sin permiso de escritura.
- **422**.

---

### 5.3 `PATCH /api/trip-finished-products/{tripFinishedProduct}` — cambiar las cajas

Solo `administrator` y `export`. `{tripFinishedProduct}` es el `id` de la línea. La ruta también acepta `PUT`, con el mismo comportamiento.

```json
{ "boxes": 480 }
```

- **`boxes` es obligatorio**: `{}` es **422** «Las cajas son obligatorias», no un no-op.
- `tripId` y `finishedProductId` se **ignoran en silencio** (200 sin cambiarlos).
- `registeredByName` no cambia.

Orden de fallo:

1. **404** «La línea de producto no existe».
2. **400** «El viaje ya fue eliminado».
3. **400** «Solo se pueden modificar los productos de un viaje pendiente».

Respuestas: **200** «Producto del viaje actualizado correctamente» · **400** · **401** · **403** · **404** · **422**.

---

### 5.4 `DELETE /api/trip-finished-products/{tripFinishedProduct}` — quitar una línea

Solo `administrator` y `export`. Es un **borrado físico**: la fila desaparece y no hay forma de restaurarla. `data` trae la línea recién borrada.

Orden de fallo:

1. **404** «La línea de producto no existe».
2. **400** «El viaje ya fue eliminado».
3. **400** «Solo se pueden modificar los productos de un viaje pendiente».
4. **400** «El viaje debe tener al menos un producto terminado», al intentar borrar la **última** línea.

Respuestas: **200** «Producto eliminado del viaje correctamente» · **400** · **401** · **403** · **404**.

---

### 5.5 Cambios en `POST /api/trips` (alta del viaje)

Gana un campo obligatorio y pasa a **15**:

```json
{
  "order": "ORD-2026-0001",
  "clientId": 3,
  "...": "los otros doce campos de siempre",
  "products": [
    { "finishedProductId": 4, "boxes": 960 },
    { "finishedProductId": 7, "boxes": 120 }
  ]
}
```

| Campo | Reglas |
|---|---|
| `products` | Obligatorio, lista con **al menos una** línea. |
| `products.*.finishedProductId` | Obligatorio, entero, existente y **sin repetir** dentro del array: el repetido es 422 en `products.{i}.finishedProductId`. |
| `products.*.boxes` | Obligatorio, entero de 1 a 999999. |

Después de las guardas de catálogo de siempre (cliente, naviera, puerto y punto de partida), cada línea pasa dos guardas con **400**:

- «El producto terminado seleccionado ya fue eliminado».
- «El producto terminado no pertenece al cliente del viaje».

El viaje y sus líneas se guardan en **una sola transacción**: si una línea falla, **no se crea ni el viaje**.

La respuesta 201 del viaje **no cambia de forma** (sigue sin `products`). Para mostrar las líneas recién creadas, llama a `GET /api/trip-finished-products?tripId={data.id}`.

**Flujo recomendado en el formulario de alta**: elegir cliente → cargar sus productos con `GET /api/finished-products?clientId={id}` → armar las líneas. Si el usuario cambia el cliente, vacía las líneas: los productos del cliente anterior darán 400.

---

### 5.6 Cambios en `PATCH /api/trips/{trip}` (edición del viaje)

- `products` en el body se **ignora en silencio** (200). Las líneas se editan solo con los endpoints de §5.2–§5.4.
- Mandar un `clientId` **distinto** en un viaje que tiene líneas → **400** «No se puede cambiar el cliente de un viaje con productos terminados». Reenviar el **mismo** `clientId` no cuenta como cambio y responde 200.
- Un viaje sin líneas (anterior a SPEC 37) sí puede cambiar de cliente.

---

## 6. Tabla de mensajes de error (literales)

### Validación (422)

| Campo | Mensajes |
|---|---|
| `tripId` (listado) | `El viaje es obligatorio` · `El viaje debe ser un número entero` |
| `tripId` (alta de línea) | `El viaje es obligatorio` · `El viaje debe ser un número entero` · `El viaje seleccionado no existe` |
| `finishedProductId` | `El producto terminado es obligatorio` · `El producto terminado debe ser un identificador válido` · `El producto terminado seleccionado no existe` |
| `boxes` | `Las cajas son obligatorias` · `Las cajas deben ser un número entero` · `Las cajas deben ser al menos 1` · `Las cajas no pueden superar 999999` |
| `products` (alta de viaje) | `Los productos terminados son obligatorios` · `Los productos terminados deben ser una lista` · `El viaje debe llevar al menos un producto terminado` |
| `products.{i}.finishedProductId` | `El producto terminado es obligatorio` · `El producto terminado debe ser un identificador válido` · `El producto terminado está repetido en el viaje` · `El producto terminado seleccionado no existe` |
| `products.{i}.boxes` | `Las cajas son obligatorias` · `Las cajas deben ser un número entero` · `Las cajas deben ser al menos 1` · `Las cajas no pueden superar 999999` |

### Negocio (sobre `{ statusCode, message, data }`)

| Código | Mensaje | Dónde |
|---|---|---|
| 400 | `El viaje ya fue eliminado` | Alta, edición y borrado de línea |
| 400 | `Solo se pueden modificar los productos de un viaje pendiente` | Alta, edición y borrado de línea |
| 400 | `El producto terminado seleccionado ya fue eliminado` | Alta de línea y `POST /api/trips` |
| 400 | `El producto terminado no pertenece al cliente del viaje` | Alta de línea y `POST /api/trips` |
| 400 | `El producto terminado ya está en el viaje` | Alta de línea |
| 400 | `El viaje debe tener al menos un producto terminado` | Borrado de la última línea |
| 400 | `No se puede cambiar el cliente de un viaje con productos terminados` | `PATCH /api/trips/{trip}` |
| 401 | `El token de sesión no es válido o ha expirado` | Todos |
| 403 | `No tienes permisos para acceder a este recurso` | Escritura con un rol distinto de `administrator`/`export` |
| 403 | `No puedes acceder a un viaje que no tienes asignado` | Listado, `pilot` ajeno |
| 403 | `No puedes acceder a un viaje que no pertenece a tu empresa transportista` | Listado, `carrier` fuera de ámbito |
| 404 | `El viaje no existe` | Listado (inexistente o borrado) |
| 404 | `La línea de producto no existe` | Edición y borrado de línea |

---

## 7. Checklist de implementación en el frontend

- [ ] `POST /api/trips` manda `products` con al menos una línea. Sin esto, **toda alta de viaje falla con 422**.
- [ ] En el formulario de alta, filtrar el selector de productos por el cliente elegido (`GET /api/finished-products?clientId=`), vaciar las líneas al cambiar de cliente y no permitir repetir producto.
- [ ] Mapear los 422 de `products.{i}.finishedProductId` / `products.{i}.boxes` a la fila correspondiente (índice desde 0).
- [ ] Input de cajas entero (sin decimales), mínimo 1 y máximo 999999.
- [ ] En el detalle del viaje, pedir las líneas aparte con `GET /api/trip-finished-products?tripId=`. No esperes `products` dentro del viaje.
- [ ] Acciones de agregar, editar y quitar visibles solo para `administrator`/`export` **y** con el viaje en `pending`. En otro estado, modo solo lectura.
- [ ] Deshabilitar «quitar» cuando el viaje tiene una sola línea. Para cambiar el único producto: agregar el nuevo y luego quitar el viejo.
- [ ] El `PATCH` de línea manda solo `{ boxes }`. Cambiar de producto = `DELETE` + `POST`.
- [ ] En la edición del viaje, bloquear el cambio de cliente si el viaje tiene líneas, o avisar del 400.
- [ ] `presentation`/`boxesPerPallet` son strings: `parseFloat` antes de calcular tarimas o totales. `boxes` ya es número.
- [ ] Totales (cajas del viaje, tarimas) calculados en el cliente sumando `data`: la API no los da.
- [ ] Fechas `createdAt` como texto `d-m-Y h:i:s A`; no parsearlas como ISO.
- [ ] Tratar `data: []` como «viaje sin productos» (viajes anteriores a SPEC 37), no como error.
- [ ] Manejar los dos formatos de error: sobre `{ statusCode, message, data }` y 422 `{ message, errors }`.

---

## 8. Lo que este dominio **no** hace (para no diseñarlo en el front)

- No hay `products` ni `totalBoxes` en `GET /api/trips` ni en `GET /api/trips/{trip}`.
- No calcula tarimas, pesos ni importes.
- No hay rutas anidadas (`/api/trips/{trip}/finished-products`) ni un listado global sin `tripId`.
- No pagina ni filtra el listado de líneas.
- No hay detalle de una línea por id (`GET /api/trip-finished-products/{id}` no existe).
- No se editan líneas de viajes `in_route` o `finished`, ni se registran cajas recibidas o entregadas.
- No hay bitácora de cambios de cajas ni restauración de una línea borrada.
- No congela los datos del producto: editar el producto terminado cambia lo que muestran todos sus viajes.
- No hubo backfill: los viajes anteriores listan `[]` hasta que alguien les agrega líneas.
- Borrar un producto terminado o un cliente **no** se bloquea porque esté en viajes.
- No hay tool del asistente, exportación a Excel, filtros de viajes por producto ni notificaciones push para las líneas.
