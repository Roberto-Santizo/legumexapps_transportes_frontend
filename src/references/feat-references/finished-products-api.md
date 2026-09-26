# Productos terminados — referencia de integración para el frontend

Referencia completa del dominio **Finished Products** de la API de Legumex Transportes: **cinco** endpoints REST bajo `/api/finished-products` para gestionar el catálogo nacional de SKUs de productos terminados. Un SKU es una presentación empacada que pertenece a un cliente.

Un producto terminado tiene **cinco campos de negocio**: `code`, `name`, `presentation`, `boxesPerPallet` y `clientId`.

⚠️ **No tiene nada que ver con `/api/products`** (SPEC 07). `Product` es la mercancía que cotiza flete en `freight-rates`; un producto terminado es el SKU de un cliente. Comparten la palabra, no el dominio: no hay ninguna relación entre las dos tablas.

Todo lo que hay aquí está verificado contra la implementación real (Laravel 13) y contra su suite de tests (`tests/Feature/FinishedProductTest.php`, `tests/Unit/FinishedProductServiceTest.php`). Los mensajes de error son literales: se pueden mostrar tal cual al usuario.

> Documentación OpenAPI viva: `/api/documentation` (tag **Finished Products**).

---

## 0. ANTES DE NADA: este catálogo BORRA DE VERDAD (como Clients)

Si ya integraste **Clients** o **Shipping Lines**, aquí el borrado funciona igual. Si vienes de Products, Locations o Zones, **este es el punto donde se rompe tu componente de catálogo**:

| | Products · Locations · Zones · Departure Points | **Finished Products** |
|---|---|---|
| Qué hace el `DELETE` | Baja lógica: pone `status: false` | **Soft delete real**: la fila desaparece de la API |
| ¿Sigue en el listado? | **Sí**, con `status: false` | **No**, nunca más |
| Segundo `DELETE` | **200** idempotente | **400** «El producto terminado ya fue eliminado» |
| `GET /{id}` tras borrar | 200 con `status: false` | **404** |
| ¿Se puede reactivar? | Sí, con `/toggle-status` | **No, por ninguna vía** |
| ¿Libera su código? | — | **No: el `code` queda ocupado para siempre** |

Hay que diseñar tres cosas en la UI:

1. **El borrado es irreversible.** No hay `/restore`, ni `?trashed=true`, ni papelera. Pide una confirmación explícita.
2. **El `code` de un SKU borrado queda quemado.** Darlo de alta otra vez responde **400**, y el que lo ocupa es una fila que no aparece en ningún endpoint. Por eso el mensaje dice «que puede haber sido eliminado».
3. **Tras el `DELETE`, quita la fila del DOM.** No vuelve en el siguiente listado, y el `total` de la paginación tampoco la cuenta.

---

## 1. Lo mínimo que hay que saber antes de escribir código

1. **El `code` duplicado es 400, nunca 422.** Sale por el sobre normal (`statusCode: 400`, texto en `message`), no dentro de `errors`, porque la validación de Laravel no ve las filas borradas. Si tu formulario solo lee `errors`, **se come el error en silencio**.
2. **El `name` NO es único.** Dos SKU pueden llamarse igual, del mismo cliente o de clientes distintos, y los dos responden 201. No valides unicidad de nombre en el front.
3. **El `name` solo se pasa a MAYÚSCULAS: no se recorta y no se colapsan sus espacios.** `" brócoli  florete "` se guarda y se devuelve como `" BRÓCOLI  FLORETE "`, con los espacios de los extremos y el doble espacio interior. Es el **único catálogo del proyecto** que se comporta así (la ruta está excluida a propósito del recorte global de Laravel). **Si quieres nombres limpios, recórtalos tú antes de enviar.** Un `name` de solo espacios sigue siendo 422.
4. **El `code` se recorta y pasa a MAYÚSCULAS, pero NO admite ningún espacio interior**: `"BRO IQF"` es 422, no se arregla solo. `" bro-iqf-10 "` se guarda `"BRO-IQF-10"`.
5. **`presentation` y `boxesPerPallet` se envían como número y vuelven como string con dos decimales**: mandas `10` y recibes `"10.00"`; mandas `96.5` y recibes `"96.50"`. Los dos admiten decimales y deben ser mayores que 0.
6. **Un cliente borrado da 400; uno inexistente, 422.** `clientId` pasa por la regla `exists`, que lee la tabla sin filtrar, así que un id inventado es **422** «El cliente seleccionado no existe» y un cliente **borrado** es **400** «El cliente seleccionado ya fue eliminado».
7. **El 400 del cliente borrado salta también en un `PATCH` que reenvía el mismo `clientId` que ya tenía el SKU.** Si el cliente de un SKU se borró y tu formulario de edición reenvía el objeto completo, el `PATCH` falla. Envía `clientId` solo si el usuario lo cambió, o cambia a un cliente activo.
8. **Borrar un cliente NO se bloquea por tener SKUs.** Sus productos terminados siguen vivos, se siguen listando y **conservan su `clientName`** aunque el cliente ya no aparezca en `/api/clients`.
9. **`404` y `400` significan cosas distintas.** `GET /{id}` de un SKU borrado es **404**. `PATCH` o `DELETE` sobre él es **400** («ya fue eliminado»). Un id que nunca existió es **404** en los tres.
10. **Fechas en `d-m-Y h:i:s A`, no ISO 8601** (`"25-09-2026 10:15:00 AM"`). `new Date(...)` sobre ese texto devuelve `Invalid Date`. Todas las claves de salida van en **camelCase**.
11. **El `pilot` no puede ni leer este catálogo (403).** `user` y `shipment` sí pueden leerlo. Es el reparto contrario al del resto de catálogos.
12. **Toda respuesta viaja en un sobre** `{ statusCode, message, data }`… **salvo el 422**, que usa el formato de Laravel `{ message, errors }`.

---

## 2. Autenticación y permisos

Todos los endpoints exigen el token JWT del login:

```
Authorization: Bearer {token}
Accept: application/json
```

Sin token, o con uno expirado, las cinco rutas responden **401**:

```json
{ "statusCode": 401, "message": "El token de sesión no es válido o ha expirado", "data": null }
```

| Acción | `administrator` | `export` | `manager` | `carrier` | `user` | `shipment` | `pilot` |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Listar (`GET /api/finished-products`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 403 |
| Ver detalle (`GET /{id}`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 403 |
| Crear (`POST`) | ✅ | ✅ | 403 | 403 | 403 | 403 | 403 |
| Editar (`PATCH`/`PUT`) | ✅ | ✅ | 403 | 403 | 403 | 403 | 403 |
| Borrar (`DELETE`) | ✅ | ✅ | 403 | 403 | 403 | 403 | 403 |

Es un catálogo **nacional**: no pertenece a ninguna empresa transportista. **Ninguna ruta lleva `carrier.required`**, así que un `carrier` sin empresa registrada también lee. No hay filtrado por empresa: todos los roles lectores ven exactamente las mismas filas.

Un rol sin permiso recibe **403**:

```json
{ "statusCode": 403, "message": "No tienes permisos para acceder a este recurso", "data": null }
```

---

## 3. El objeto `FinishedProduct`

```json
{
  "id": 1,
  "code": "BRO-IQF-10",
  "name": "BRÓCOLI FLORETE IQF",
  "presentation": "10.00",
  "boxesPerPallet": "96.50",
  "clientId": 3,
  "clientName": "FRESH FOODS INC",
  "registeredByName": "Admin",
  "createdAt": "25-09-2026 10:15:00 AM",
  "updatedAt": "25-09-2026 10:15:00 AM",
  "deletedAt": null
}
```

**Once claves, siempre las once**, en camelCase y en este orden. Las que no tienen valor viajan como `null`.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `number` | Valor del parámetro `{finishedProduct}` de las rutas. Tras el `DELETE` sigue existiendo en la base, pero `GET` responde 404 y `PATCH`/`DELETE`, 400. |
| `code` | `string` | **MAYÚSCULAS**, máximo 15, **sin ningún espacio**. Lo teclea el usuario, no se autogenera. Único **global y permanente**: un SKU borrado lo sigue ocupando. Lo barre el filtro `search`. |
| `name` | `string` | **MAYÚSCULAS**, máximo 255, **tal cual se tecleó**: sin recorte y sin colapsar espacios. **No es único.** También lo barre `search`. |
| `presentation` | `string` | Decimal con **exactamente dos decimales** (`"10.00"`). Siempre entre 0.01 y 99999999.99. La API no fija ni devuelve una unidad. |
| `boxesPerPallet` | `string` | Cajas por tarima, decimal con dos decimales (`"96.50"`). Mismo rango que `presentation`. |
| `clientId` | `number` | Id del cliente (`clients.id`). Siempre presente. Puede apuntar a un cliente borrado **después** del alta. |
| `clientName` | `string \| null` | Nombre del cliente ya resuelto. **Sigue saliendo aunque el cliente esté borrado.** |
| `registeredByName` | `string \| null` | Nombre de quien dio de alta el SKU. **El `PATCH` no lo reescribe.** |
| `createdAt` | `string` | `d-m-Y h:i:s A`. No es ISO 8601. |
| `updatedAt` | `string` | `d-m-Y h:i:s A`. Un `PATCH` con cuerpo vacío no lo mueve. |
| `deletedAt` | `string \| null` | `d-m-Y h:i:s A`. Es **`null` en todas las respuestas salvo la del propio `DELETE`**. |

### Tipos TypeScript sugeridos

```ts
export type FinishedProductId = number & { readonly __brand: 'FinishedProductId' };

export interface FinishedProduct {
  id: FinishedProductId;
  /** MAYÚSCULAS, máx 15, sin espacios. */
  code: string;
  /** MAYÚSCULAS, sin trim ni colapso de espacios, máx 255. NO único. */
  name: string;
  /** Decimal como string con 2 decimales: "10.00". */
  presentation: string;
  /** Decimal como string con 2 decimales: "96.50". */
  boxesPerPallet: string;
  clientId: number;
  /** Sale aunque el cliente esté borrado. */
  clientName: string | null;
  registeredByName: string | null;
  /** Formato d-m-Y h:i:s A — NO parsear como ISO 8601. */
  createdAt: string;
  updatedAt: string;
  /** Solo llega con valor en la respuesta del DELETE. */
  deletedAt: string | null;
}

export interface CreateFinishedProductBody {
  code: string;
  name: string;
  presentation: number;
  boxesPerPallet: number;
  clientId: number;
}

/** Los cinco opcionales por separado. Cuerpo vacío = no-op con 200. */
export type UpdateFinishedProductBody = Partial<CreateFinishedProductBody>;

export interface FinishedProductFilters {
  search?: string;
  clientId?: number;
  limit?: number;
  page?: number;
}

export interface ApiEnvelope<T> {
  statusCode: number;
  message: string;
  data: T;
}

/** Solo cuando se manda `limit`: metadatos EN LA RAÍZ, no bajo `meta`. */
export interface PaginatedEnvelope<T> extends ApiEnvelope<T[]> {
  total: number;
  currentPage: number;
  lastPage: number;
}

/** El 422 de Laravel: formato DISTINTO, sin statusCode ni data. */
export interface ValidationError {
  message: string;
  errors: Record<string, string[]>;
}

/** El duplicado de code NO llega en `errors`: llega como 400 en `message`. */
export const isDuplicateCodeError = (e: ApiEnvelope<null>): boolean =>
  e.statusCode === 400 && e.message.startsWith('Ya existe un producto terminado con ese código');
```

---

## 4. Formato de las respuestas

### Éxito

```json
{ "statusCode": 200, "message": "Producto terminado obtenido correctamente", "data": { } }
```

### Listado sin paginar (sin `limit`)

`data` es el array completo y **no hay** metadatos de paginación:

```json
{ "statusCode": 200, "message": "Productos terminados obtenidos correctamente", "data": [] }
```

### Listado paginado (con `limit` numérico)

Los metadatos van **en la raíz** del sobre, **no** bajo `meta`:

```json
{
  "statusCode": 200,
  "message": "Productos terminados obtenidos correctamente",
  "data": [],
  "total": 42,
  "currentPage": 1,
  "lastPage": 5
}
```

El `total` **no cuenta los SKU borrados**.

### Error de negocio (400, 401, 403, 404)

```json
{ "statusCode": 400, "message": "El producto terminado ya fue eliminado", "data": null }
```

### Error de validación (422): **formato distinto**

No lleva `statusCode` ni `data`:

```json
{
  "message": "El código no puede contener espacios",
  "errors": {
    "code": ["El código no puede contener espacios"]
  }
}
```

Las claves de `errors` son los campos **en camelCase, tal como se envían** (`boxesPerPallet`, `clientId`).

⚠️ **El `code` duplicado y el cliente borrado NO aparecen aquí**: salen como **400** en el sobre normal.

---

## 5. Endpoints

### 5.1 `GET /api/finished-products`: listar

Todos los roles salvo `pilot`. Orden **fijo**: `id` ascendente. No hay `sortBy` ni `sortDir`.

| Query param | Valores | Comportamiento |
|---|---|---|
| `search` | texto | Búsqueda parcial sobre el **código y el nombre a la vez** (`LIKE %TERM%` en los dos, unidos por `OR`). El término se recorta y se pasa a mayúsculas, así que la búsqueda **no distingue mayúsculas**: `bro`, `BRO` y `Bro` dan lo mismo. En blanco se ignora. |
| `clientId` | entero | Solo los SKU de ese cliente. **Tolerante**: un valor no numérico (`clientId=abc`) se ignora y devuelve el listado completo, sin 422. Un id sin SKU devuelve `data` vacío. Sirve también para ver los SKU de un cliente borrado, si conoces su id. |
| `limit` | entero | **Su presencia activa la paginación.** Si se omite o no es numérico, devuelve todo sin metadatos. Si es numérico se **acota a `[10, 100]`**: `limit=5` da páginas de **10** y `limit=500`, de **100**. |
| `page` | entero | Solo tiene efecto con un `limit` numérico. |

Los filtros se combinan y **nunca provocan 422**. Sin coincidencias → **200 con `data` vacío**, nunca 404. **Los SKU borrados no salen nunca** y ningún parámetro los devuelve.

- **200**: `Productos terminados obtenidos correctamente`
- **401** / **403** (pilot)

### 5.2 `POST /api/finished-products`: dar de alta

Solo `administrator` y `export`. **Los cinco campos son obligatorios.** Cualquier otra clave se descarta en silencio.

```json
{
  "code": "BRO-IQF-10",
  "name": "Brócoli florete IQF",
  "presentation": 10,
  "boxesPerPallet": 96.5,
  "clientId": 3
}
```

| Campo | Reglas |
|---|---|
| `code` | Obligatorio, texto, **máximo 15** caracteres. Se recorta y pasa a MAYÚSCULAS **antes** de validar. **Ningún espacio interior** → 422. Si otro SKU —**vivo o borrado**— ya lo tiene → **400**. |
| `name` | Obligatorio, texto, máximo 255. **Solo** pasa a MAYÚSCULAS: sin recorte ni colapso de espacios. Solo espacios → 422 (`required`). **No es único.** |
| `presentation` | Obligatorio, numérico, **mínimo 0.01**, máximo 99999999.99. `0`, negativos o texto → 422. |
| `boxesPerPallet` | Obligatorio, numérico, **mínimo 0.01**, máximo 99999999.99. Admite decimales. |
| `clientId` | Obligatorio, entero. Inexistente → **422**. Cliente **borrado** → **400**. |

**`registeredBy` no se envía**: sale del usuario autenticado. Mandarlo en el cuerpo no cambia el autor.

- **201**: `Producto terminado registrado correctamente`
- **400** (código duplicado, cliente borrado) / **401** / **403** / **422**

### 5.3 `GET /api/finished-products/{finishedProduct}`: detalle

Todos los roles salvo `pilot`.

⚠️ **Un SKU borrado responde 404, exactamente igual que un id que nunca existió**, con el mismo mensaje.

- **200**: `Producto terminado obtenido correctamente`
- **401** / **403** (pilot) / **404**

### 5.4 `PATCH /api/finished-products/{finishedProduct}`: editar

Solo `administrator` y `export`. Acepta también `PUT`, con el mismo comportamiento: el `PUT` **no** reemplaza el recurso entero. Los cinco campos son **opcionales por separado**, con **las mismas reglas y normalizaciones que el alta**. Opcional no significa vaciable: mandar un campo vacío o `null` es 422.

| Campo | Notas |
|---|---|
| `code` | La unicidad **ignora la propia fila**: reenviar su mismo código es 200. El código de otro SKU —vivo o borrado— es **400**. |
| `name` | Sin unicidad: cualquier valor válido pasa. |
| `presentation` / `boxesPerPallet` | Mismo rango que en el alta. |
| `clientId` | Cambiar a otro cliente activo actualiza `clientId` **y** `clientName`. Un cliente borrado es **400**, **incluso si es el mismo cliente que el SKU ya tenía**. |

**Cuerpo vacío → 200 sin cambios** (tampoco mueve `updatedAt`). **`registeredBy` no se reescribe**, aunque edite otro usuario.

⚠️ **`PATCH` sobre un SKU borrado → 400** («El producto terminado ya fue eliminado»). Id inexistente → 404.

- **200**: `Producto terminado actualizado correctamente`
- **400** / **401** / **403** / **404** / **422**

### 5.5 `DELETE /api/finished-products/{finishedProduct}`: eliminar

Solo `administrator` y `export`. **Borra de verdad**: el SKU desaparece del listado y del detalle.

⚠️ **No es idempotente.** El segundo `DELETE` responde **400** «El producto terminado ya fue eliminado». Un id inexistente responde **404**.

⚠️ **No hay vuelta atrás por la API**, y el `code` queda ocupado para siempre.

La respuesta devuelve el SKU ya borrado, **con `deletedAt` relleno**:

```json
{
  "statusCode": 200,
  "message": "Producto terminado eliminado correctamente",
  "data": {
    "id": 1,
    "code": "BRO-IQF-10",
    "name": "BRÓCOLI FLORETE IQF",
    "presentation": "10.00",
    "boxesPerPallet": "96.50",
    "clientId": 3,
    "clientName": "FRESH FOODS INC",
    "registeredByName": "Admin",
    "createdAt": "25-09-2026 10:15:00 AM",
    "updatedAt": "25-09-2026 10:15:00 AM",
    "deletedAt": "25-09-2026 11:02:41 AM"
  }
}
```

- **200**: `Producto terminado eliminado correctamente`
- **400** (ya eliminado) / **401** / **403** / **404**

---

## 6. Tabla de mensajes de error (literales)

Ya están en español y se pueden mostrar tal cual. Son los mismos en el `POST` y en el `PATCH`.

### 422: llegan dentro de `errors`

| Campo | Mensajes |
|---|---|
| `code` | `El código del producto terminado es obligatorio` · `El código del producto terminado debe ser texto` · `El código del producto terminado no puede superar los 15 caracteres` · `El código no puede contener espacios` |
| `name` | `El nombre del producto terminado es obligatorio` · `El nombre del producto terminado debe ser texto` · `El nombre del producto terminado no puede superar los 255 caracteres` |
| `presentation` | `La presentación es obligatoria` · `La presentación debe ser numérica` · `La presentación debe ser mayor a 0` · `La presentación no puede superar 99999999.99` |
| `boxesPerPallet` | `Las cajas por tarima son obligatorias` · `Las cajas por tarima deben ser numéricas` · `Las cajas por tarima deben ser mayores a 0` · `Las cajas por tarima no pueden superar 99999999.99` |
| `clientId` | `El cliente es obligatorio` · `El cliente debe ser un identificador válido` · `El cliente seleccionado no existe` |

### Errores de sobre

| Código | Mensaje | Cuándo |
|---|---|---|
| **400** | `Ya existe un producto terminado con ese código, que puede haber sido eliminado` | `POST`/`PATCH` con un `code` ocupado, vivo o borrado |
| **400** | `El cliente seleccionado ya fue eliminado` | `POST`/`PATCH` con un `clientId` borrado |
| **400** | `El producto terminado ya fue eliminado` | `PATCH`/`DELETE` sobre un SKU borrado |
| **401** | `El token de sesión no es válido o ha expirado` | Sin token o con uno expirado |
| **403** | `No tienes permisos para acceder a este recurso` | Rol sin permiso (incluido el `pilot` al leer) |
| **404** | `El producto terminado no existe` | Id inexistente, o `GET` de un SKU borrado |

⚠️ Los dos primeros 400 pertenecen a un campo del formulario (`code` y `clientId`), pero llegan en `message`, no en `errors`. Hay que mapearlos a mano.

---

## 7. Checklist de implementación en el frontend

- [ ] Cliente HTTP con `Authorization: Bearer` y `Accept: application/json` en las cinco llamadas.
- [ ] Manejar **dos formatos de error**: el sobre `{statusCode, message, data}` para 400/401/403/404 y `{message, errors}` para 422.
- [ ] Mostrar el **400 de código duplicado** junto al campo `code` y el **400 de cliente borrado** junto al selector de cliente, aunque lleguen en `message`.
- [ ] No validar unicidad del `name`: puede repetirse.
- [ ] **Recortar el `name` en el front** si no quieres espacios en los extremos: la API los guarda tal cual.
- [ ] Validar en el front que el `code` no tiene espacios interiores antes de enviar: la API lo rechaza con 422, no lo corrige.
- [ ] Mostrar `code`, `name`, `presentation` y `boxesPerPallet` **de la respuesta** (normalizados), no los que se tecleó.
- [ ] Tratar `presentation` y `boxesPerPallet` como **string** al leer (`Number(...)` si hay que calcular) y como **número** al enviar.
- [ ] Selector de cliente alimentado por `GET /api/clients`, que ya excluye los borrados.
- [ ] En el `PATCH`, enviar **solo los campos que cambiaron**. Reenviar el `clientId` de un cliente borrado da 400.
- [ ] Contemplar que un SKU puede mostrar el `clientName` de un cliente que ya no aparece en `/api/clients`.
- [ ] **Confirmación reforzada en el `DELETE`** y quitar la fila del DOM después: no hay forma de restaurarla.
- [ ] Distinguir el **404** del detalle, el **400** del `PATCH`/`DELETE` sobre un borrado y el **404** del id inexistente.
- [ ] Fechas como texto plano: formato `d-m-Y h:i:s A`, **no** ISO 8601.
- [ ] Paginación leyendo `total`/`currentPage`/`lastPage` **de la raíz**. `limit=5` da páginas de 10 y `limit=500`, de 100.
- [ ] Un solo campo `search` para código y nombre, más un filtro opcional por cliente (`clientId`).
- [ ] Ocultar el módulo al `pilot` (403 incluso al leer) y las acciones de escritura a todo lo que no sea `administrator` o `export`.

---

## 8. Lo que este dominio **no** hace (para no diseñarlo en el front)

- **No se relaciona con `/api/products`** ni con `/api/freight-rates`: no cotiza flete ni comparte catálogo.
- **No se relaciona con viajes**: ningún viaje lleva líneas de producto terminado ni `finishedProductId`.
- **No hay unidad de medida** para `presentation`: ni columna, ni enum, ni campo en la respuesta.
- **No hay `status` ni `/toggle-status`**: un SKU existe o está borrado.
- **No se puede restaurar** un SKU borrado, ni listarlo, ni consultarlo. No hay papelera ni `?trashed=true`.
- **Borrar un cliente no toca sus SKU** y no se bloquea por ellos. `/api/clients` no devuelve los productos terminados de un cliente: se consultan con `GET /api/finished-products?clientId=`.
- **No hay imagen, peso bruto/neto, código de barras ni precio** del SKU.
- **No hay ámbito por empresa transportista**: todos los roles lectores ven lo mismo.
- **No hay bitácora de cambios**; lo más cercano es `updatedAt`.
- **No hay alta en lote, importación ni exportación a Excel**, y el asistente del tablero no consulta este catálogo.
- **No hay orden configurable** ni filtros por fecha, por autor o por rango de valores.
