# Navieras — referencia de integración para el frontend

Referencia completa del dominio **Shipping Lines** de la API de Legumex Transportes: **cinco** endpoints REST bajo `/api/shipping-lines` para gestionar el catálogo nacional de navieras.

Es el dominio **más pequeño del proyecto**: una naviera tiene **un solo campo de negocio**, `name`, y nada más. Ni código, ni sigla, ni contacto, ni puertos. Una naviera es un nombre.

Todo lo que hay aquí está verificado contra la implementación real (Laravel 13) y contra su suite de tests. Los mensajes de error son literales: se pueden mostrar tal cual al usuario.

> Documentación OpenAPI viva: `/api/documentation`.

---

## 0. ANTES DE NADA: este catálogo BORRA DE VERDAD, y el nombre queda quemado

Es la diferencia más importante con los seis catálogos nacionales que usan `status`, y **la fuente de error más probable de esta integración**. Si vas a reutilizar el componente de catálogo que ya tienes para productos, destinos, zonas o puntos de partida, **este es el punto donde se rompe**. Este dominio se comporta como **Clients**, no como el resto.

| | Products · Locations · Zones · Departure Points | **Shipping Lines** |
|---|---|---|
| Qué hace el `DELETE` | Baja lógica: pone `status: false` | **Soft delete real**: la fila desaparece de la API |
| ¿Sigue en el listado? | **Sí**, con `status: false` | **No**, nunca más |
| Segundo `DELETE` | **200** idempotente | **400** «La naviera ya fue eliminada» |
| `GET /{id}` tras borrar | 200 con `status: false` | **404** |
| ¿Se puede reactivar? | Sí, con `/toggle-status` | **NO. Nunca. Por ninguna vía.** |
| ¿Libera su nombre? | — | **No: queda ocupado para siempre** |

**Las tres consecuencias que hay que diseñar en la UI:**

1. **El borrado es irreversible.** No hay `/restore`, no hay `?trashed=true`, no hay papelera y no existe ningún parámetro que liste las borradas. Una naviera borrada por error **solo se recupera tocando la base de datos a mano**. Pon una confirmación explícita —del tipo «escribe el nombre para confirmar»—, no un simple «¿seguro?».
2. **El nombre de una naviera borrada queda quemado, y aquí eso duele más que en Clients.** Volver a darla de alta con su mismo nombre responde **400**, y ese 400 viene de una fila que **no aparece en ningún endpoint**. En Clients quedaba el `code` como segundo identificador; **aquí el nombre es lo único que hay**, así que perderlo deja a esa naviera fuera del catálogo para siempre. Por eso el mensaje de duplicado dice «**que puede haber sido eliminada**»: es la única pista que tiene el usuario de que está chocando contra un fantasma.
3. **Tras el `DELETE`, quita la fila del DOM.** Al contrario que en los catálogos con `status`, aquí ya no vuelve en el siguiente listado, y el `total` de la paginación tampoco la cuenta.

---

## 1. Lo mínimo que hay que saber antes de escribir código

1. **El duplicado responde 400, nunca 422.** Es lo contrario de Locations y Departure Points, donde el nombre repetido es 422. Aquí sale por el sobre normal con `statusCode: 400`, porque la validación de Laravel no ve las filas borradas y dejaría pasar un nombre ocupado. **Si tu formulario solo lee `errors`, se comerá el error en silencio.**
2. **El nombre vuelve cambiado.** Se recorta, se le **colapsan los espacios internos** y se pasa a MAYÚSCULAS. Mandar `"  maersk   line "` guarda y devuelve `"MAERSK LINE"`. **Pinta siempre lo que viene en la respuesta**, nunca lo que tecleó el usuario.
3. **`404` y `400` significan cosas distintas y hay que distinguirlas.** `GET /{id}` de una naviera borrada es **404** (para quien lee, no existe); `PATCH` o `DELETE` sobre ese mismo id es **400** («ya fue eliminada»). Un id que nunca existió es **404** en los tres.
4. **`createdAt`, `updatedAt` y `deletedAt` NO son ISO 8601**, sino `d-m-Y h:i:s A` (`"26-08-2026 09:14:03 AM"`). `new Date(...)` sobre ese texto devuelve `Invalid Date`.
5. **Toda respuesta viaja en un sobre** `{ statusCode, message, data }`… **salvo el 422 de validación**, que usa el formato estándar de Laravel `{ message, errors }`. Son dos formas distintas.
6. **No hay `status`, no hay `/toggle-status`.** Una naviera no se «pausa»: existe o está borrada. No diseñes un interruptor de activo/inactivo.
7. **Un solo campo en el formulario.** El alta y la edición aceptan `name` y nada más. Cualquier otra clave se descarta en silencio.
8. **Escribir es solo de `administrator`.** Leer lo puede hacer cualquier usuario autenticado.
9. **Nada cuelga todavía de una naviera.** Ninguna tabla tiene `shipping_line_id`: borrar una no rompe ninguna otra entidad, y la naviera no participa en tarifas, cotizaciones ni viajes.
10. **Una errata crea una naviera nueva, no un error.** Con un único campo libre, `MAERSK LNE` es tan válida como `MAERSK LINE` y nada lo detecta. **Busca con `search` antes de ofrecer el alta**: es la única defensa contra el catálogo duplicado.

---

## 2. Autenticación y permisos

Todos los endpoints exigen el token JWT que devuelve el login:

```
Authorization: Bearer {token}
Accept: application/json
```

Sin token, o con uno expirado, la respuesta es **401** en las cinco rutas:

```json
{ "statusCode": 401, "message": "El token de sesión no es válido o ha expirado", "data": null }
```

| Acción | `administrator` | `carrier` | `pilot` | `manager` |
|---|:--:|:--:|:--:|:--:|
| Listar (`GET /api/shipping-lines`) | ✅ | ✅ | ✅ | ✅ |
| Ver detalle (`GET /api/shipping-lines/{id}`) | ✅ | ✅ | ✅ | ✅ |
| Crear (`POST`) | ✅ | 403 | 403 | 403 |
| Editar (`PATCH`) | ✅ | 403 | 403 | 403 |
| Borrar (`DELETE`) | ✅ | 403 | 403 | 403 |

Las navieras son un dato **nacional de Legumex**: no pertenecen a ninguna empresa transportista. No hay `carrierId`, no hay filtrado por empresa, y un `carrier` que todavía no ha registrado su empresa también puede leerlas — **ninguna ruta de este dominio lleva el middleware `carrier.required`**.

Un rol sin permiso de escritura recibe **403**:

```json
{ "statusCode": 403, "message": "No tienes permisos para acceder a este recurso", "data": null }
```

No existe el 403 «recurso ajeno» que sí tienen Vehicles o Carriers: aquí no hay ámbito por empresa. O el id es alcanzable y se devuelve, o es 404 / 400.

---

## 3. El objeto `ShippingLine`

```json
{
  "id": 1,
  "name": "MAERSK LINE",
  "registeredByName": "Roberto Santizo",
  "createdAt": "26-08-2026 09:14:03 AM",
  "updatedAt": "26-08-2026 09:14:03 AM",
  "deletedAt": null
}
```

Seis claves, **siempre las seis**, en camelCase. Ninguna se omite: las que no tienen valor viajan como `null`.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `number` | `shipping_lines.id`. Es el valor del parámetro `{shippingLine}` de las rutas. Sobrevive a la edición del nombre. **Sobrevive también al `DELETE`** —la fila sigue en la base—, pero ese id deja de ser alcanzable: `GET` responde 404 y `PATCH`/`DELETE`, 400. |
| `name` | `string` | El **único** campo de negocio. **Siempre en MAYÚSCULAS** y con los espacios internos colapsados, máximo 255. Único **global y permanente** — una naviera borrada lo sigue ocupando. Es el campo que barre el filtro `search`. |
| `registeredByName` | `string \| null` | **Nombre** del administrador que la capturó, ya resuelto. No viaja el id ni el objeto usuario. **No se reescribe al editar**: sigue apuntando a quien creó la fila aunque la edite otro administrador. |
| `createdAt` | `string` | Formato `d-m-Y h:i:s A`. **No es ISO 8601.** No cambia nunca. |
| `updatedAt` | `string` | Formato `d-m-Y h:i:s A`. **No es ISO 8601.** Lo más cercano a una auditoría que ofrece el dominio: no se guarda el valor anterior ni quién lo cambió. Un `PATCH` vacío **no lo mueve**. |
| `deletedAt` | `string \| null` | Formato `d-m-Y h:i:s A`. **Es `null` en cuatro de los cinco endpoints** —listado, detalle, alta y edición—, porque ninguno alcanza una naviera borrada. **La única respuesta que lo trae con valor es la del propio `DELETE`.** No sirve para descubrir navieras eliminadas: no existe ningún parámetro que las liste. |

### Tipos TypeScript sugeridos

```ts
export type ShippingLineId = number & { readonly __brand: 'ShippingLineId' };

export interface ShippingLine {
  id: ShippingLineId;
  /** MAYÚSCULAS, espacios internos colapsados, máx 255. Único campo de negocio. */
  name: string;
  registeredByName: string | null;
  /** Formato d-m-Y h:i:s A — NO parsear como ISO 8601. */
  createdAt: string;
  updatedAt: string;
  /** Solo llega con valor en la respuesta del DELETE. */
  deletedAt: string | null;
}

export interface CreateShippingLineBody {
  name: string;
}

/** El único campo, opcional. Cuerpo vacío = no-op con 200. */
export interface UpdateShippingLineBody {
  name?: string;
}

export interface ApiEnvelope<T> {
  statusCode: number;
  message: string;
  data: T;
}

/** Solo cuando se manda `limit`: los metadatos van EN LA RAIZ, no bajo `meta`. */
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

/** El duplicado NO llega en `errors`: llega como 400 en `message`. */
export const isDuplicateError = (e: ApiEnvelope<null>): boolean =>
  e.statusCode === 400 && e.message.startsWith('Ya existe una naviera');

/** Distingue «ya no está» de «nunca existió» en PATCH y DELETE. */
export const isAlreadyDeleted = (e: ApiEnvelope<null>): boolean =>
  e.statusCode === 400 && e.message === 'La naviera ya fue eliminada';
```

---

## 4. Formato de las respuestas

### Éxito

```json
{ "statusCode": 200, "message": "Navieras obtenidas correctamente", "data": {} }
```

### Listado sin paginar (sin `limit`)

`data` es el array completo y **no hay** metadatos de paginación:

```json
{
  "statusCode": 200,
  "message": "Navieras obtenidas correctamente",
  "data": []
}
```

### Listado paginado (con `limit` numérico)

Los metadatos se aplanan **en la raíz** del sobre, **no** bajo `meta`:

```json
{
  "statusCode": 200,
  "message": "Navieras obtenidas correctamente",
  "data": [],
  "total": 42,
  "currentPage": 1,
  "lastPage": 5
}
```

El `total` **no cuenta las navieras borradas**.

### Error de negocio (400, 401, 403, 404)

```json
{ "statusCode": 400, "message": "La naviera ya fue eliminada", "data": null }
```

### Error de validación (422) — **formato distinto**

No lleva `statusCode` ni `data`:

```json
{
  "message": "El nombre de la naviera es obligatorio",
  "errors": {
    "name": ["El nombre de la naviera es obligatorio"]
  }
}
```

Las claves de `errors` son los nombres de los campos **en camelCase, tal como se envían**.

⚠️ **El duplicado de `name` NO aparece aquí.** Sale como **400** en el sobre normal. Un formulario que solo lea `errors` no mostrará nada.

---

## 5. Endpoints

### 5.1 `GET /api/shipping-lines` — listar

Abierto a los cuatro roles. Orden **fijo**: `id` ascendente (el orden de alta). No hay `sortBy` ni `sortDir`.

| Query param | Valores | Comportamiento |
|---|---|---|
| `search` | texto | Búsqueda parcial sobre el **nombre** (`LIKE %TERM%`). El término se normaliza igual que el campo, y la columna está en mayúsculas, así que es **insensible a mayúsculas y a espacios de sobra**: `maer`, `MAER` y `  Maer ` encuentran las tres `MAERSK LINE`. En blanco o solo espacios **se ignora** y devuelve el catálogo completo. |
| `limit` | entero | **Su presencia activa la paginación.** Si se omite o no es numérico (`limit=abc`), devuelve todos los registros sin metadatos. Si es numérico se **acota a `[10, 100]`**: `limit=1` devuelve páginas de **10** y `limit=500`, de **100**. |
| `page` | entero | Solo tiene efecto con un `limit` numérico. |

Los dos filtros son **tolerantes**: nunca provocan 422. Un filtro sin coincidencias devuelve **200 con `data` vacío**, igual que un catálogo vacío — nunca 404.

⚠️ **No existe filtro `status`** (este dominio no tiene esa columna) **ni ningún parámetro que muestre las borradas**. Tampoco hay filtro por autor del alta ni por rango de fechas: cualquier otro query param se ignora sin error.

- **200** — `Navieras obtenidas correctamente`
- **401**

### 5.2 `POST /api/shipping-lines` — dar de alta

Solo `administrator`. **Solo se acepta un campo, y es obligatorio.** Cualquier otra clave se descarta en silencio.

```json
{ "name": "maersk line" }
```

| Campo | Reglas |
|---|---|
| `name` | **Obligatorio**, texto, **máximo 255 caracteres** (255 exactos se aceptan; 256 es 422). Se guarda recortado, con los espacios internos **colapsados** y en MAYÚSCULAS. Un nombre de **solo** espacios sale por `name.required`, porque la normalización lo deja vacío antes de validarse. Un valor que no es texto (un número, por ejemplo) es 422. |

**`registeredBy` no se envía**: sale del usuario autenticado. Mandarlo en el cuerpo **no cambia el autor**.

⚠️ **Si el `name` ya está ocupado —por una naviera viva O POR UNA BORRADA— la respuesta es 400, no 422.** Y como la normalización ocurre antes de comparar, enviar `"maersk line"` existiendo `"MAERSK LINE"` también choca.

- **201** — `Naviera registrada correctamente`
- **400** (duplicado) / **401** / **403** / **422**

### 5.3 `GET /api/shipping-lines/{shippingLine}` — detalle

Abierto a los cuatro roles.

⚠️ **Una naviera borrada responde 404, exactamente igual que un id que nunca existió**, y con el mismo mensaje. Es deliberado: para quien lee, una naviera borrada no existe. Desde este endpoint **no se puede distinguir** un caso del otro.

- **200** — `Naviera obtenida correctamente`
- **401** / **404**

### 5.4 `PATCH /api/shipping-lines/{shippingLine}` — editar

Solo `administrator`. El único campo es opcional y se le aplican **las mismas reglas de formato y la misma normalización que en el alta**.

| Campo | Notas |
|---|---|
| `name` | La unicidad **ignora la propia fila**: reenviar su mismo nombre es 200. El de otra naviera —viva o borrada— es **400**. Mandar `null` no lo borra: es **422**. |

**Un cuerpo vacío responde 200 y no cambia nada**, y tampoco mueve `updatedAt`.

**`registeredBy` no se reescribe**: la naviera conserva a quien la dio de alta aunque la edite otro administrador.

⚠️ **Un `PATCH` sobre una naviera borrada responde 400** («La naviera ya fue eliminada»), no 404. Un id inexistente sí es 404.

💡 **Este es el único arreglo posible de una errata.** Mientras la naviera no esté borrada, corregir `MAERSK LNE` → `MAERSK LINE` es un `PATCH`. Una vez borrada, el nombre viejo queda ocupado y el arreglo ya no existe por API.

- **200** — `Naviera actualizada correctamente`
- **400** / **401** / **403** / **404** / **422**

### 5.5 `DELETE /api/shipping-lines/{shippingLine}` — eliminar

Solo `administrator`. **Este SÍ borra.** La fila queda con `deleted_at` puesto y **desaparece del listado y del detalle**.

⚠️ **NO es idempotente.** Un segundo `DELETE` sobre la misma naviera responde **400** «La naviera ya fue eliminada», no 200. Un `DELETE` sobre un id que nunca existió responde **404** — así el front puede distinguir los dos casos.

⚠️ **No hay vuelta atrás por la API.** No existe `/restore`, ni `/toggle-status`, ni un parámetro que liste las borradas. Recuperarla exige tocar la base de datos.

⚠️ **El `name` queda ocupado para siempre.** No se puede reutilizar en una naviera nueva, y al ser el único identificador del dominio, esa naviera no puede volver al catálogo con su propio nombre.

La respuesta devuelve la naviera ya borrada, y es **la única de toda la API con `deletedAt` no nulo**:

```json
{
  "statusCode": 200,
  "message": "Naviera eliminada correctamente",
  "data": {
    "id": 1,
    "name": "MAERSK LINE",
    "registeredByName": "Roberto Santizo",
    "createdAt": "26-08-2026 09:14:03 AM",
    "updatedAt": "26-08-2026 09:20:11 AM",
    "deletedAt": "26-08-2026 10:02:45 AM"
  }
}
```

- **200** — `Naviera eliminada correctamente`
- **400** (ya eliminada) / **401** / **403** / **404**

---

## 6. Tabla de mensajes de error (literales)

Se pueden mostrar tal cual al usuario; ya están en español.

### 422 — llegan dentro de `errors`

| Campo | Mensaje |
|---|---|
| `name` | `El nombre de la naviera es obligatorio` · `El nombre de la naviera debe ser texto` · `El nombre de la naviera no puede superar los 255 caracteres` |

### Errores de sobre

| Código | Mensaje |
|---|---|
| **400** | `Ya existe una naviera con ese nombre, que puede haber sido eliminada` |
| **400** | `La naviera ya fue eliminada` |
| **401** | `El token de sesión no es válido o ha expirado` |
| **403** | `No tienes permisos para acceder a este recurso` |
| **404** | `La naviera no existe` |

⚠️ Los **dos 400** son los que rompen un formulario escrito para los otros catálogos: allí el duplicado llega en `errors` (422) y aquí llega en `message` (400). Un formulario que solo lea `errors` **se comerá el duplicado en silencio**.

⚠️ El `que puede haber sido eliminada` **no es palabrería**: el ocupante del nombre puede ser una fila invisible en todos los endpoints, y es la única pista que tiene el usuario. Muéstralo íntegro.

---

## 7. Checklist de implementación en el frontend

- [ ] Cliente HTTP que adjunta `Authorization: Bearer` y `Accept: application/json` en las cinco llamadas.
- [ ] Manejo **de dos formatos de error**: sobre `{statusCode, message, data}` para 401/403/404/**400** y `{message, errors}` para 422.
- [ ] El **duplicado de `name` se muestra junto a su campo** aunque llegue como 400 en `message`, no en `errors`: hay que mapearlo a mano por el texto del mensaje.
- [ ] Mostrar íntegro el «que puede haber sido eliminada» del duplicado, y **explicar en la UI que una naviera borrada sigue ocupando su nombre para siempre**.
- [ ] **Confirmación reforzada en el `DELETE`** (escribir el nombre, no un «¿seguro?»): la acción es irreversible desde la aplicación y quema el único identificador de la naviera.
- [ ] Tras el `DELETE`, **quitar la fila del DOM**: no vuelve en el siguiente listado, al contrario que en los catálogos con `status`.
- [ ] Distinguir el **404** del detalle (borrada o inexistente, indistinguibles) del **400** del `PATCH`/`DELETE` (ya eliminada) y del **404** del id inexistente.
- [ ] **No** implementar interruptor de activo/inactivo, ni papelera, ni «restaurar»: no existen.
- [ ] Mostrar el `name` **de la respuesta** (normalizado, en mayúsculas), no el tecleado.
- [ ] **Buscar antes de dar de alta.** Con un solo campo libre y sin código, una errata crea una naviera nueva y nada lo detecta. Ofrece los resultados de `search` en el propio formulario de alta.
- [ ] Ofrecer el `PATCH` como corrección visible: es la única forma de arreglar una errata, y deja de existir en cuanto la naviera se borra.
- [ ] Fechas: mostrar `createdAt`/`updatedAt`/`deletedAt` como texto plano; **no** parsearlas como ISO.
- [ ] Listado: paginación leyendo `total`/`currentPage`/`lastPage` **de la raíz**; recordar que `limit=5` devuelve páginas de 10 y `limit=500`, de 100.
- [ ] `PATCH` con cuerpo vacío es un no-op válido (200): no hace falta bloquearlo, pero tampoco tiene sentido enviarlo.
- [ ] Ocultar o deshabilitar las acciones de escritura para los roles que no son `administrator` (el 403 del servidor es la red, no la UX).

---

## 8. Lo que este dominio **no** hace (para no diseñarlo en el front)

- **No hay ficha de naviera.** Ni código, ni sigla, ni contacto, ni teléfono, ni correo, ni país, ni web, ni notas. **Un campo y nada más.**
- **No hay `code`.** Es la única diferencia estructural con Clients y está descartada a propósito: la naviera se identifica por su nombre comercial. No lo esperes ni lo inventes en el front.
- **No hay `status` ni `/toggle-status`.** Una naviera no se pausa ni se desactiva: existe o está borrada.
- **No se puede restaurar una naviera borrada**, ni listarla, ni consultarla, ni contarla. No hay papelera.
- **La naviera no se relaciona con nada.** Ninguna tabla tiene `shipping_line_id`: no hay navieras por destino, ni tarifas por naviera, ni contenedores, ni viajes. `GET /api/freight-rates/quote` **no cambió** y no conoce esta tabla.
- **No está vinculada con los puertos.** `LocationType::Port` existe en Locations, pero un puerto **no sabe** qué navieras operan en él y una naviera no tiene puertos asociados. No cruces los dos catálogos.
- **No hay ámbito por empresa.** Un `carrier` ve exactamente las mismas navieras que un `administrator`; no hay navieras «de mi empresa».
- **No hay bitácora de cambios.** Editar el nombre pisa el valor anterior sin dejar rastro; no hay historial ni «modificado por». Lo más cercano es `updatedAt`.
- **No hay alta en lote**, importación desde archivo ni sincronización con un ERP.
- **No hay adjuntos**: este dominio no sube nada. No hay logo de la naviera.
- **No hay orden configurable** (`sortBy`, `sortDir`) ni filtros por rango de fechas, por autor del alta o por rango de `id`.
