# Clientes — referencia de integración para el frontend

Referencia completa del dominio **Clients** de la API de Legumex Transportes: **cinco** endpoints REST bajo `/api/clients` para gestionar el catálogo nacional de clientes — las empresas a las que Legumex presta servicio.

Es el dominio **más pequeño del proyecto**: un cliente tiene **dos campos de negocio**, `code` y `name`, y nada más.

Todo lo que hay aquí está verificado contra la implementación real (Laravel 13) y contra su suite de tests. Los mensajes de error son literales: se pueden mostrar tal cual al usuario.

> Documentación OpenAPI viva: `/api/documentation`.

---

## 0. ANTES DE NADA: este catálogo BORRA DE VERDAD

Es la diferencia más importante con los otros seis catálogos nacionales, y **la fuente de error más probable de esta integración**. Si vas a reutilizar el componente de catálogo que ya tienes para productos, destinos, zonas o puntos de partida, **este es el punto donde se rompe**.

| | Products · Locations · Zones · Departure Points | **Clients** |
|---|---|---|
| Qué hace el `DELETE` | Baja lógica: pone `status: false` | **Soft delete real**: la fila desaparece de la API |
| ¿Sigue en el listado? | **Sí**, con `status: false` | **No**, nunca más |
| Segundo `DELETE` | **200** idempotente | **400** «El cliente ya fue eliminado» |
| `GET /{id}` tras borrar | 200 con `status: false` | **404** |
| ¿Se puede reactivar? | Sí, con `/toggle-status` | **NO. Nunca. Por ninguna vía.** |
| ¿Libera su nombre/código? | — | **No: quedan ocupados para siempre** |

**Las tres consecuencias que hay que diseñar en la UI:**

1. **El borrado es irreversible.** No hay `/restore`, no hay `?trashed=true`, no hay papelera y no existe ningún parámetro que liste los borrados. Un cliente borrado por error **solo se recupera tocando la base de datos a mano**. Pon una confirmación explícita —del tipo «escribe el código para confirmar»—, no un simple «¿seguro?».
2. **El código y el nombre de un cliente borrado quedan quemados.** Volver a darlo de alta con su mismo `code` responde **400**, y ese 400 viene de una fila que **no aparece en ningún endpoint**. Por eso los dos mensajes de duplicado dicen «**que puede haber sido eliminado**»: es la única pista que tiene el usuario de que está chocando contra un fantasma.
3. **Tras el `DELETE`, quita la fila del DOM.** Al contrario que en los otros catálogos, aquí ya no vuelve en el siguiente listado, y el `total` de la paginación tampoco la cuenta.

---

## 1. Lo mínimo que hay que saber antes de escribir código

1. **Los dos duplicados posibles responden 400, nunca 422.** Es lo contrario de Locations y Departure Points, donde el nombre repetido es 422. Aquí `code` y `name` duplicados salen **los dos** por el sobre normal con `statusCode: 400`, porque la validación de Laravel no ve las filas borradas y dejaría pasar un valor ocupado. Si tu formulario solo lee `errors`, **se comerá los dos errores en silencio**.
2. **Si el código y el nombre están ocupados a la vez, gana el mensaje del código.** Se comprueba primero. El usuario corrige un error, reenvía, y entonces ve el segundo.
3. **El `code` NO admite ningún espacio, y eso es 422, no una corrección silenciosa.** `"CLI 001"` se rechaza en vez de guardarse como `"CLI001"`, para que un error de captura se vea. El `name`, en cambio, **sí** colapsa sus espacios internos sin avisar.
4. **Los dos campos vuelven cambiados.** `code` se recorta y se pasa a MAYÚSCULAS; `name` se recorta, colapsa espacios internos y pasa a MAYÚSCULAS. Mandar `"  agro   del sur "` guarda y devuelve `"AGRO DEL SUR"`. **Pinta siempre lo que viene en la respuesta**, nunca lo que tecleó el usuario.
5. **`404` y `400` significan cosas distintas y hay que distinguirlas.** `GET /{id}` de un cliente borrado es **404** (para quien lee, no existe); `PATCH` o `DELETE` sobre ese mismo id es **400** («ya fue eliminado»). Un id que nunca existió es **404** en los tres.
6. **`createdAt`, `updatedAt` y `deletedAt` NO son ISO 8601**, sino `d-m-Y h:i:s A` (`"26-08-2026 09:14:03 PM"`). `new Date(...)` sobre ese texto devuelve `Invalid Date`.
7. **Toda respuesta viaja en un sobre** `{ statusCode, message, data }`… **salvo el 422 de validación**, que usa el formato estándar de Laravel `{ message, errors }`. Son dos formas distintas.
8. **No hay `status`, no hay `/toggle-status`.** Un cliente no se «pausa»: existe o está borrado. No diseñes un interruptor de activo/inactivo.
9. **Escribir es solo de `administrator`.** Leer lo puede hacer cualquier usuario autenticado.
10. **Nada cuelga todavía de un cliente.** Ninguna tabla tiene `client_id`: borrar uno no rompe ninguna otra entidad, y el cliente no participa en tarifas, cotizaciones ni viajes.

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
| Listar (`GET /api/clients`) | ✅ | ✅ | ✅ | ✅ |
| Ver detalle (`GET /api/clients/{id}`) | ✅ | ✅ | ✅ | ✅ |
| Crear (`POST`) | ✅ | 403 | 403 | 403 |
| Editar (`PATCH`) | ✅ | 403 | 403 | 403 |
| Borrar (`DELETE`) | ✅ | 403 | 403 | 403 |

Los clientes son un dato **nacional de Legumex**: no pertenecen a ninguna empresa transportista. No hay `carrierId`, no hay filtrado por empresa, y un `carrier` que todavía no ha registrado su empresa también puede leerlos — **ninguna ruta de este dominio lleva el middleware `carrier.required`**.

Un rol sin permiso de escritura recibe **403**:

```json
{ "statusCode": 403, "message": "No tienes permisos para acceder a este recurso", "data": null }
```

No existe el 403 «recurso ajeno» que sí tienen Vehicles o Carriers: aquí no hay ámbito por empresa. O el id es alcanzable y se devuelve, o es 404 / 400.

---

## 3. El objeto `Client`

```json
{
  "id": 7,
  "code": "CLI-001",
  "name": "AGROEXPORTADORA DEL SUR",
  "registeredByName": "Roberto Santizo",
  "createdAt": "26-08-2026 08:45:12 PM",
  "updatedAt": "26-08-2026 08:51:40 PM",
  "deletedAt": null
}
```

Siete claves, **siempre las siete**, en camelCase. Ninguna se omite: las que no tienen valor viajan como `null`.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `number` | `clients.id`. Es el valor del parámetro `{client}` de las rutas. Sobrevive a la edición del código y del nombre. **Sobrevive también al `DELETE`** —la fila sigue en la base—, pero ese id deja de ser alcanzable: `GET` responde 404 y `PATCH`/`DELETE`, 400. |
| `code` | `string` | **Siempre en MAYÚSCULAS**, máximo 15 caracteres, **sin ningún espacio**. Lo teclea el administrador: no se autogenera. Único **global y permanente** — un cliente borrado lo sigue ocupando. Es uno de los dos campos que barre el filtro `search`. |
| `name` | `string` | Razón social. **Siempre en MAYÚSCULAS** y con los espacios internos colapsados, máximo 255. Único con la misma unicidad global y permanente que el `code`. Al estar siempre en mayúsculas, la unicidad resulta insensible a mayúsculas. Es el otro campo que barre `search`. |
| `registeredByName` | `string \| null` | **Nombre** del administrador que lo capturó, ya resuelto. No viaja el id ni el objeto usuario. **No se reescribe al editar**: sigue apuntando a quien creó la fila aunque la edite otro administrador. |
| `createdAt` | `string` | Formato `d-m-Y h:i:s A`. **No es ISO 8601.** No cambia nunca. |
| `updatedAt` | `string` | Formato `d-m-Y h:i:s A`. **No es ISO 8601.** Lo más cercano a una auditoría que ofrece el dominio: no se guarda el valor anterior ni quién lo cambió. Un `PATCH` vacío no lo mueve. |
| `deletedAt` | `string \| null` | Formato `d-m-Y h:i:s A`. **Es `null` en cuatro de los cinco endpoints** —listado, detalle, alta y edición—, porque ninguno alcanza un cliente borrado. **La única respuesta que lo trae con valor es la del propio `DELETE`.** No sirve para descubrir clientes eliminados: no existe ningún parámetro que los liste. |

### Tipos TypeScript sugeridos

```ts
export type ClientId = number & { readonly __brand: 'ClientId' };

export interface Client {
  id: ClientId;
  /** MAYÚSCULAS, máx 15, sin espacios. */
  code: string;
  /** MAYÚSCULAS, espacios internos colapsados, máx 255. */
  name: string;
  registeredByName: string | null;
  /** Formato d-m-Y h:i:s A — NO parsear como ISO 8601. */
  createdAt: string;
  updatedAt: string;
  /** Solo llega con valor en la respuesta del DELETE. */
  deletedAt: string | null;
}

export interface CreateClientBody {
  code: string;
  name: string;
}

/** Los dos opcionales por separado. Cuerpo vacío = no-op con 200. */
export interface UpdateClientBody {
  code?: string;
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

/** Los duplicados NO llegan en `errors`: llegan como 400 en `message`. */
export const isDuplicateError = (e: ApiEnvelope<null>): boolean =>
  e.statusCode === 400 && e.message.startsWith('Ya existe un cliente');
```

---

## 4. Formato de las respuestas

### Éxito

```json
{ "statusCode": 200, "message": "Clientes obtenidos correctamente", "data": {} }
```

### Listado sin paginar (sin `limit`)

`data` es el array completo y **no hay** metadatos de paginación:

```json
{
  "statusCode": 200,
  "message": "Clientes obtenidos correctamente",
  "data": []
}
```

### Listado paginado (con `limit` numérico)

Los metadatos se aplanan **en la raíz** del sobre, **no** bajo `meta`:

```json
{
  "statusCode": 200,
  "message": "Clientes obtenidos correctamente",
  "data": [],
  "total": 42,
  "currentPage": 1,
  "lastPage": 5
}
```

El `total` **no cuenta los clientes borrados**.

### Error de negocio (400, 401, 403, 404)

```json
{ "statusCode": 400, "message": "El cliente ya fue eliminado", "data": null }
```

### Error de validación (422) — **formato distinto**

No lleva `statusCode` ni `data`:

```json
{
  "message": "El código no puede contener espacios",
  "errors": {
    "code": ["El código no puede contener espacios"]
  }
}
```

Las claves de `errors` son los nombres de los campos **en camelCase, tal como se envían**.

⚠️ **Los duplicados de `code` y de `name` NO aparecen aquí.** Salen como **400** en el sobre normal. Un formulario que solo lea `errors` no mostrará nada.

---

## 5. Endpoints

### 5.1 `GET /api/clients` — listar

Abierto a los cuatro roles. Orden **fijo**: `id` ascendente (el orden de alta). No hay `sortBy` ni `sortDir`.

| Query param | Valores | Comportamiento |
|---|---|---|
| `search` | texto | Búsqueda parcial sobre el **código Y el nombre a la vez** (`LIKE %TERM%` sobre los dos, unidos por `OR`). El término se normaliza como un nombre, y ambas columnas están en mayúsculas, así que es **insensible a mayúsculas**: `agro`, `AGRO` y `Agro` encuentran las tres `AGROEXPORTADORA DEL SUR`. `CLI-001` encuentra el cliente **por su código**. En blanco o solo espacios **se ignora** y devuelve el catálogo completo. |
| `limit` | entero | **Su presencia activa la paginación.** Si se omite o no es numérico (`limit=abc`), devuelve todos los registros sin metadatos. Si es numérico se **acota a `[10, 100]`**: `limit=1` devuelve páginas de **10** y `limit=500`, de **100**. |
| `page` | entero | Solo tiene efecto con un `limit` numérico. |

Los dos filtros son **tolerantes**: nunca provocan 422. Un filtro sin coincidencias devuelve **200 con `data` vacío**, igual que un catálogo vacío — nunca 404.

⚠️ **No existe filtro `status`** (este dominio no tiene esa columna) **ni ningún parámetro que muestre los borrados**. Tampoco hay filtro por autor del alta ni por rango de fechas: cualquier otro query param se ignora.

- **200** — `Clientes obtenidos correctamente`
- **401**

### 5.2 `POST /api/clients` — dar de alta

Solo `administrator`. **Solo se aceptan dos campos, y los dos son obligatorios.** Cualquier otra clave se descarta en silencio.

```json
{ "code": "cli-001", "name": "agroexportadora del sur" }
```

| Campo | Reglas |
|---|---|
| `code` | **Obligatorio**, texto, **máximo 15 caracteres** (15 exactos se aceptan; 16 es 422). Se guarda recortado y en MAYÚSCULAS. **No admite ningún espacio ni tabulador**, ni siquiera interior → 422 «El código no puede contener espacios». Un código de **solo** espacios sale por `code.required`, porque el recorte lo deja vacío antes de validarse. |
| `name` | **Obligatorio**, texto, máximo 255. Se guarda recortado, con los espacios internos **colapsados** y en MAYÚSCULAS. Un nombre de solo espacios sale por `name.required`. |

**`registeredBy` no se envía**: sale del usuario autenticado. Mandarlo en el cuerpo **no cambia el autor**.

⚠️ **Si el `code` o el `name` ya están ocupados —por un cliente vivo O POR UNO BORRADO— la respuesta es 400, no 422.** Y como la normalización ocurre antes de comparar, enviar `"agro del sur"` existiendo `"AGRO DEL SUR"` también choca.

- **201** — `Cliente registrado correctamente`
- **400** (duplicado) / **401** / **403** / **422**

### 5.3 `GET /api/clients/{client}` — detalle

Abierto a los cuatro roles.

⚠️ **Un cliente borrado responde 404, exactamente igual que un id que nunca existió**, y con el mismo mensaje. Es deliberado: para quien lee, un cliente borrado no existe. Desde este endpoint **no se puede distinguir** un caso del otro.

- **200** — `Cliente obtenido correctamente`
- **401** / **404**

### 5.4 `PATCH /api/clients/{client}` — editar

Solo `administrator`. Los dos campos son opcionales por separado y se aplican **las mismas reglas de formato y las mismas normalizaciones que en el alta**.

| Campo | Notas |
|---|---|
| `code` | La unicidad **ignora la propia fila**: reenviar su mismo código es 200. El de otro cliente —vivo o borrado— es **400**. Mandar `null` no lo borra: es 422. |
| `name` | Igual que el `code`. |

**Un cuerpo vacío responde 200 y no cambia nada** (tampoco mueve `updatedAt`).

**`registeredBy` no se reescribe**: el cliente conserva a quien lo dio de alta aunque lo edite otro administrador.

⚠️ **Un `PATCH` sobre un cliente borrado responde 400** («El cliente ya fue eliminado»), no 404. Un id inexistente sí es 404.

- **200** — `Cliente actualizado correctamente`
- **400** / **401** / **403** / **404** / **422**

### 5.5 `DELETE /api/clients/{client}` — eliminar

Solo `administrator`. **Este SÍ borra.** La fila queda con `deleted_at` puesto y **desaparece del listado y del detalle**.

⚠️ **NO es idempotente.** Un segundo `DELETE` sobre el mismo cliente responde **400** «El cliente ya fue eliminado», no 200. Un `DELETE` sobre un id que nunca existió responde **404** — así el front puede distinguir los dos casos.

⚠️ **No hay vuelta atrás por la API.** No existe `/restore`, ni `/toggle-status`, ni un parámetro que liste los borrados. Recuperarlo exige tocar la base de datos.

⚠️ **El `code` y el `name` quedan ocupados para siempre.** No se pueden reutilizar en un cliente nuevo.

La respuesta devuelve el cliente ya borrado, y es **la única de toda la API con `deletedAt` no nulo**:

```json
{
  "statusCode": 200,
  "message": "Cliente eliminado correctamente",
  "data": {
    "id": 7,
    "code": "CLI-001",
    "name": "AGROEXPORTADORA DEL SUR",
    "registeredByName": "Roberto Santizo",
    "createdAt": "26-08-2026 08:45:12 PM",
    "updatedAt": "26-08-2026 08:51:40 PM",
    "deletedAt": "26-08-2026 09:14:03 PM"
  }
}
```

- **200** — `Cliente eliminado correctamente`
- **400** (ya eliminado) / **401** / **403** / **404**

---

## 6. Tabla de mensajes de error (literales)

Se pueden mostrar tal cual al usuario; ya están en español.

### 422 — llegan dentro de `errors`

| Campo | Mensaje |
|---|---|
| `code` | `El código del cliente es obligatorio` · `El código del cliente debe ser texto` · `El código del cliente no puede superar los 15 caracteres` · `El código no puede contener espacios` |
| `name` | `El nombre del cliente es obligatorio` · `El nombre del cliente debe ser texto` · `El nombre del cliente no puede superar los 255 caracteres` |

### Errores de sobre

| Código | Mensaje |
|---|---|
| **400** | `Ya existe un cliente con ese código, que puede haber sido eliminado` |
| **400** | `Ya existe un cliente con ese nombre, que puede haber sido eliminado` |
| **400** | `El cliente ya fue eliminado` |
| **401** | `El token de sesión no es válido o ha expirado` |
| **403** | `No tienes permisos para acceder a este recurso` |
| **404** | `El cliente no existe` |

⚠️ Los **tres 400** son los que rompen un formulario escrito para los otros catálogos: allí el duplicado llega en `errors` (422) y aquí llega en `message` (400). Un formulario que solo lea `errors` **se comerá los duplicados en silencio**.

⚠️ El `que puede haber sido eliminado` de los dos primeros **no es palabrería**: el ocupante del código puede ser una fila invisible en todos los endpoints, y es la única pista que tiene el usuario.

---

## 7. Checklist de implementación en el frontend

- [ ] Cliente HTTP que adjunta `Authorization: Bearer` y `Accept: application/json` en las cinco llamadas.
- [ ] Manejo **de dos formatos de error**: sobre `{statusCode, message, data}` para 401/403/404/**400** y `{message, errors}` para 422.
- [ ] Los **duplicados de `code` y `name` se muestran junto a su campo** aunque lleguen como 400 en `message`, no en `errors`: hay que mapearlos a mano por el texto del mensaje.
- [ ] Mostrar íntegro el «que puede haber sido eliminado» del duplicado, y **explicar en la UI que un cliente borrado sigue ocupando su código y su nombre**.
- [ ] **Confirmación reforzada en el `DELETE`** (escribir el código, no un «¿seguro?»): la acción es irreversible desde la aplicación.
- [ ] Tras el `DELETE`, **quitar la fila del DOM**: no vuelve en el siguiente listado, al contrario que en los otros catálogos.
- [ ] Distinguir el **404** del detalle (borrado o inexistente, indistinguibles) del **400** del `PATCH`/`DELETE` (ya eliminado) y del **404** del id inexistente.
- [ ] **No** implementar interruptor de activo/inactivo, ni papelera, ni «restaurar»: no existen.
- [ ] Mostrar el `code` y el `name` **de la respuesta** (normalizados, en mayúsculas), no los tecleados.
- [ ] Validar en el cliente que el `code` no lleva espacios **antes** de enviar, para no gastar un viaje: la API lo rechaza con 422, no lo arregla.
- [ ] Recordar que el `name` **sí** colapsa espacios en silencio y el `code` **no**: son reglas distintas para dos campos del mismo formulario.
- [ ] Fechas: mostrar `createdAt`/`updatedAt`/`deletedAt` como texto plano; **no** parsearlas como ISO.
- [ ] Listado: paginación leyendo `total`/`currentPage`/`lastPage` **de la raíz**; recordar que `limit=5` devuelve páginas de 10 y `limit=500`, de 100.
- [ ] Buscador único: un solo campo `search` cubre código y nombre a la vez; no hagas dos cajas.
- [ ] `PATCH` con cuerpo vacío es un no-op válido (200): no hace falta bloquearlo, pero tampoco tiene sentido enviarlo.
- [ ] Ocultar o deshabilitar las acciones de escritura para los roles que no son `administrator` (el 403 del servidor es la red, no la UX).

---

## 8. Lo que este dominio **no** hace (para no diseñarlo en el front)

- **No hay ficha de cliente.** Ni NIT, ni dirección, ni teléfono, ni correo, ni persona de contacto, ni límite de crédito, ni condiciones de pago, ni notas. **Dos campos y nada más.**
- **No hay `status` ni `/toggle-status`.** Un cliente no se pausa ni se desactiva: existe o está borrado.
- **No se puede restaurar un cliente borrado**, ni listarlo, ni consultarlo, ni contarlo. No hay papelera.
- **El cliente no se relaciona con nada.** Ninguna tabla tiene `client_id`: no hay tarifas por cliente, no hay destinos por cliente, no hay viajes por cliente. `GET /api/freight-rates/quote` **no cambió** y no conoce esta tabla.
- **No hay ámbito por empresa.** Un `carrier` ve exactamente los mismos clientes que un `administrator`; no hay clientes «de mi empresa».
- **El `code` no se autogenera**, al contrario que el de un `Carrier`: lo teclea el administrador porque el cliente ya lo trae de fuera (del ERP o de la facturación).
- **No hay bitácora de cambios.** Editar el código o el nombre pisa el valor anterior sin dejar rastro; no hay historial ni «modificado por». Lo más cercano es `updatedAt`.
- **No hay alta en lote**, importación desde archivo ni sincronización con un ERP.
- **No hay adjuntos**: este dominio no sube nada.
- **No hay orden configurable** (`sortBy`, `sortDir`) ni filtros por rango de fechas, por autor del alta o por rango de `id`.
