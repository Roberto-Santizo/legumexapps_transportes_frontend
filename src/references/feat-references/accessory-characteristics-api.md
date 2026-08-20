# Características de accesorios — referencia de integración para el frontend

Referencia completa del dominio **AccessoryCharacteristic** de la API de Legumex Transportes: cinco endpoints REST bajo `/api/accessory-characteristics` para describir cada accesorio del inventario nacional con un número libre de pares nombre/valor — uno puede tener «PLACA» y otro «TIPO DE COMBUSTIBLE».

Todo lo que hay aquí está verificado contra la implementación real (Laravel 13 + PHP 8.5) y contra su suite de tests (114 tests, 324 assertions). Los mensajes de error son literales: se pueden mostrar tal cual al usuario.

> Documentación OpenAPI viva: `/api/documentation`.

---

## 1. Lo mínimo que hay que saber antes de escribir código

1. **El listado exige `accessoryId` siempre.** No existe un listado global de las características de todo el inventario. Sin ese query param la respuesta es **422**, no una lista vacía ni un listado completo.
2. **Ausencia de `accessoryId` es 422; `accessoryId` inexistente es 404.** Son dos fallos distintos con dos códigos distintos: uno es una petición mal formada, el otro es un accesorio que no está. Recibir `data: []` significa siempre «el accesorio existe y todavía no tiene características».
3. **El cuerpo del `POST` usa `accessory_id` en snake_case, pero el query param del listado es `accessoryId` en camelCase.** No es una errata: es la misma asimetría que ya tiene el dominio de gastos de vehículo. Mandar `accessoryId` en el cuerpo del alta produce un 422 por campo obligatorio ausente.
4. **La normalización es asimétrica.** El `name` se recorta, se le colapsan los espacios internos y se pasa a MAYÚSCULAS; el `value` **solo se recorta** y conserva su capitalización. `"  placa   trasera "` se guarda como `"PLACA TRASERA"`, pero `"  Diésel "` se guarda como `"Diésel"`. Pinta siempre lo que devuelve la API, no lo que tecleó el usuario.
5. **Repetir un nombre en el mismo accesorio es 400, no 422.** No hay regla `unique` en la validación: el choque lo detecta el servicio y sale como error de negocio en el sobre normal. Dos accesorios distintos **sí** pueden tener ambos «PLACA».
6. **`DELETE` borra de verdad.** No es baja lógica: la fila desaparece de la tabla y un segundo `DELETE` del mismo id responde 404. No hay `status`, no hay papelera y no hay historial de cambios.
7. **Una característica nunca cambia de accesorio.** Mandar `accessory_id` en el `PATCH` **no da error**: se ignora en silencio y la respuesta es 200 con la fila intacta. Mover una característica es borrarla y crearla.
8. **`GET /api/accessories` no cambió.** El inventario no trae `characteristics` ni un contador. Para pintar la ficha de un accesorio con sus características hacen falta **dos llamadas**.
9. **Toda respuesta viaja en un sobre** `{ statusCode, message, data }`… **salvo el 422 de validación**, que usa el formato estándar de Laravel `{ message, errors }`. Son dos formas distintas y el cliente debe distinguirlas.
10. **Las fechas salen en `d-m-Y h:i:s A`, no en ISO 8601.** `"20-08-2026 09:14:33 AM"` no se puede pasar a `new Date()` sin parsearlo antes.

---

## 2. Autenticación y permisos

Todos los endpoints exigen el token JWT que devuelve el login:

```
Authorization: Bearer {token}
Accept: application/json
```

Sin token, o con uno expirado, la respuesta es **401** en los cinco endpoints:

```json
{ "statusCode": 401, "message": "El token de sesión no es válido o ha expirado", "data": null }
```

| Acción | `administrator` | `carrier` | `pilot` | `manager` |
|---|:--:|:--:|:--:|:--:|
| Listar (`GET /`) | ✅ | ✅ | ✅ | ✅ |
| Ver detalle (`GET /{id}`) | ✅ | ✅ | ✅ | ✅ |
| Crear (`POST /`) | ✅ | 403 | 403 | 403 |
| Editar (`PATCH /{id}`) | ✅ | 403 | 403 | 403 |
| Eliminar (`DELETE /{id}`) | ✅ | 403 | 403 | 403 |

Las características son un dato **nacional de Legumex**, como el inventario del que cuelgan: no pertenecen a ninguna empresa transportista. No hay `carrierId`, no hay filtrado por empresa, y un `carrier` que todavía no ha registrado su empresa también puede leerlas — **ninguna ruta de este dominio lleva el middleware `carrier.required`**.

Un rol sin permiso de escritura recibe **403**, y no se escribe nada:

```json
{ "statusCode": 403, "message": "No tienes permisos para acceder a este recurso", "data": null }
```

---

## 3. El objeto `AccessoryCharacteristic`

Es lo que devuelve `data` en los cuatro endpoints de un solo elemento (y cada elemento de `data` en el listado). Seis claves, siempre en camelCase y siempre en este orden:

```json
{
  "id": 4,
  "accessoryId": 12,
  "name": "PLACA",
  "value": "P-123ABC",
  "registeredBy": "Roberto Santizo",
  "createdAt": "20-08-2026 09:14:33 AM"
}
```

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `number` | Identificador de la característica. Es el que va en la URL de detalle, edición y baja. |
| `accessoryId` | `number` | El accesorio al que pertenece, como **número suelto**: no hay objeto anidado ni `accessoryName`. Quien llega hasta aquí ya tiene el accesorio, porque tuvo que mandar su id. |
| `name` | `string` | **Siempre en MAYÚSCULAS** y con los espacios internos colapsados. Único dentro de su accesorio. |
| `value` | `string` | Exactamente como se guardó: solo se le recortaron los extremos. **Siempre texto**, aunque contenga «12» o «12/03/2024». |
| `registeredBy` | `string` | El **nombre** del usuario que la capturó, no su id. |
| `createdAt` | `string` | Formato `d-m-Y h:i:s A` (`"20-08-2026 09:14:33 AM"`). **No es ISO 8601.** |

**No existen** `updatedAt`, `accessoryName`, `accessory` embebido, `status`, `type` ni `deletedAt`.

### Tipos TypeScript sugeridos

```ts
/** Una característica tal como la devuelve la API. */
export interface AccessoryCharacteristic {
  id: number;
  accessoryId: number;
  /** Siempre en MAYÚSCULAS y con espacios colapsados. */
  name: string;
  /** Texto libre, con la capitalización que tecleó el usuario. */
  value: string;
  /** Nombre del usuario, no su id. */
  registeredBy: string;
  /** Formato d-m-Y h:i:s A, NO ISO 8601. */
  createdAt: string;
}

/** Sobre estándar de la API. */
export interface ApiEnvelope<T> {
  statusCode: number;
  message: string;
  data: T;
}

/** Sobre del listado paginado: la metadata va en la raíz, no bajo meta. */
export interface PaginatedEnvelope<T> extends ApiEnvelope<T[]> {
  total: number;
  currentPage: number;
  lastPage: number;
}

/** Formato del 422 de Laravel: NO lleva statusCode ni data. */
export interface ValidationErrorResponse {
  message: string;
  errors: Record<string, string[]>;
}

/** Cuerpo del alta. Ojo: accessory_id va en snake_case. */
export interface CreateAccessoryCharacteristicPayload {
  accessory_id: number;
  name: string;
  value: string;
}

/** Cuerpo de la edición. Los dos campos son opcionales por separado. */
export interface UpdateAccessoryCharacteristicPayload {
  name?: string;
  value?: string;
}
```

---

## 4. Formato de las respuestas

### Éxito

```json
{ "statusCode": 200, "message": "Característica obtenida correctamente", "data": { } }
```

### Listado sin paginar (sin `limit`, o con un `limit` no numérico)

`data` es la lista completa y el sobre **no trae** `total`, `currentPage` ni `lastPage`:

```json
{
  "statusCode": 200,
  "message": "Características obtenidas correctamente",
  "data": [
    { "id": 4, "accessoryId": 12, "name": "PLACA", "value": "P-123ABC", "registeredBy": "Roberto Santizo", "createdAt": "20-08-2026 09:14:33 AM" },
    { "id": 5, "accessoryId": 12, "name": "TIPO DE COMBUSTIBLE", "value": "Diésel", "registeredBy": "Roberto Santizo", "createdAt": "20-08-2026 09:15:02 AM" }
  ]
}
```

### Listado paginado (con `limit` numérico)

Los tres campos de paginación viajan **aplanados en la raíz del sobre**, no bajo `meta`:

```json
{
  "statusCode": 200,
  "message": "Características obtenidas correctamente",
  "data": [ ],
  "total": 23,
  "currentPage": 1,
  "lastPage": 3
}
```

`total` es el **conteo de filas** que cumplen el filtro, no una suma de nada. La página se elige con `page`.

### Error de negocio (401, 403, 404, 400)

Mismo sobre, con `data: null`:

```json
{ "statusCode": 404, "message": "La característica no existe", "data": null }
```

### Error de validación (422) — **formato distinto**

No lleva `statusCode` ni `data`. Un cliente que lea siempre `response.statusCode` o `response.data` encontrará `undefined` justo aquí:

```json
{
  "message": "El accesorio es obligatorio",
  "errors": {
    "accessoryId": ["El accesorio es obligatorio"]
  }
}
```

---

## 5. Endpoints

### 5.1 `GET /api/accessory-characteristics` — listar las características de un accesorio

Cualquier usuario autenticado. Devuelve las características de **un** accesorio.

**Query params**

| Param | Obligatorio | Notas |
|---|:--:|---|
| `accessoryId` | **Sí** | Id del accesorio. Entero. Sin él → **422**. Con un id inexistente → **404**. |
| `limit` | No | Tamaño de página. Se acota a `[10, 100]`: `limit=1` sirve 10 y `limit=500` sirve 100. Sin él, o si no es numérico, **no pagina** y devuelve todo. |
| `page` | No | Página a servir. Solo tiene efecto junto a un `limit` numérico. |

**No hay ningún otro filtro**: no existe `search`, ni `status`, ni `sortBy`, ni rango de fechas. El orden es **fijo, `id` ascendente** (el orden en que se capturaron) y no es configurable.

El **estado del accesorio no importa**: uno `inactive` o `under_repair` lista sus características igual que uno `active`.

| Código | Cuándo |
|---|---|
| 200 | `Características obtenidas correctamente` (aunque la lista salga vacía) |
| 401 | Sin token o con token expirado |
| 404 | `El accesorio no existe` |
| 422 | Falta `accessoryId` o no es un entero |

### 5.2 `POST /api/accessory-characteristics` — crear

Solo `administrator`.

```json
{
  "accessory_id": 12,
  "name": "  placa   trasera ",
  "value": "  P-123ABC "
}
```

| Campo | Reglas | Notas |
|---|---|---|
| `accessory_id` | obligatorio, entero, debe existir | **snake_case**, no `accessoryId`. Un id inexistente aquí es **422** (por la regla `exists`), no 404. |
| `name` | obligatorio, texto, máx. 255 | Se normaliza **antes** de validar: trim + colapsar espacios + MAYÚSCULAS. El ejemplo se guarda como `"PLACA TRASERA"`. |
| `value` | obligatorio, texto, máx. 500 | Se recorta **antes** de validar, así que el máximo cuenta el valor ya recortado. **No cambia de caja.** El ejemplo se guarda como `"P-123ABC"`. |

`registeredBy` / `registered_by` en el cuerpo **se ignoran**: la autoría sale siempre del usuario autenticado. Cualquier otro campo también se ignora.

| Código | Cuándo |
|---|---|
| 201 | `Característica registrada correctamente` |
| 400 | `El accesorio ya tiene una característica con ese nombre` |
| 401 | Sin token o con token expirado |
| 403 | Rol distinto de `administrator` |
| 422 | Falta un campo, `accessory_id` no existe, o `name`/`value` exceden su longitud |

El **mismo `name` en otro accesorio responde 201**: la unicidad es por accesorio, no global.

### 5.3 `GET /api/accessory-characteristics/{accessoryCharacteristic}` — detalle

Cualquier usuario autenticado. Devuelve las seis claves del objeto.

| Código | Cuándo |
|---|---|
| 200 | `Característica obtenida correctamente` |
| 401 | Sin token o con token expirado |
| 404 | `La característica no existe` |

### 5.4 `PATCH /api/accessory-characteristics/{accessoryCharacteristic}` — editar

Solo `administrator`. También responde a `PUT`, con idéntico comportamiento: **no reemplaza el recurso completo**, siempre es una edición parcial.

```json
{ "value": "P-999XYZ" }
```

| Campo | Reglas | Notas |
|---|---|---|
| `name` | opcional; si viene, obligatorio, texto, máx. 255 | Misma normalización que en el alta. Mandarlo vacío es 422. |
| `value` | opcional; si viene, obligatorio, texto, máx. 500 | Solo se recorta. Mandarlo vacío es 422. |

- Los dos campos son **independientes**: mandar solo `value` deja el `name` intacto, y al revés.
- **Un cuerpo vacío `{}` es un no-op válido**: responde 200 sin cambiar nada.
- **`accessory_id` (y `accessoryId`) se ignoran en silencio**, sin 422: la característica no cambia de accesorio.
- `registered_by` **no se reescribe**: sigue apuntando a quien la capturó, aunque la edite otro administrador.
- Reenviar el **propio** `name` de la fila responde 200; chocar con el de **otra** característica del mismo accesorio responde 400.

| Código | Cuándo |
|---|---|
| 200 | `Característica actualizada correctamente` |
| 400 | `El accesorio ya tiene una característica con ese nombre` |
| 401 | Sin token o con token expirado |
| 403 | Rol distinto de `administrator` |
| 404 | `La característica no existe` |
| 422 | `name` o `value` presentes pero vacíos, no textuales o demasiado largos |

### 5.5 `DELETE /api/accessory-characteristics/{accessoryCharacteristic}` — eliminar

Solo `administrator`. **Borrado físico**: la fila desaparece de la tabla.

- La respuesta devuelve la característica **ya borrada**, para poder pintar lo que desapareció.
- **No es idempotente**: un segundo `DELETE` del mismo id responde **404**.
- No toca el accesorio ni las demás características.
- Libera el `name` dentro de ese accesorio: se puede volver a crear con el mismo nombre.

| Código | Cuándo |
|---|---|
| 200 | `Característica eliminada correctamente` |
| 401 | Sin token o con token expirado |
| 403 | Rol distinto de `administrator` |
| 404 | `La característica no existe` |

---

## 6. Tabla de mensajes de error (literales)

Listos para mostrarse al usuario tal cual.

### Errores de negocio — sobre `{ statusCode, message, data: null }`

| Código | Mensaje | Cuándo |
|---|---|---|
| 400 | `El accesorio ya tiene una característica con ese nombre` | Alta o edición con un `name` ya normalizado que otra característica **del mismo accesorio** ya ocupa |
| 401 | `El token de sesión no es válido o ha expirado` | Sin token, con token malformado o expirado |
| 403 | `No tienes permisos para acceder a este recurso` | `carrier`, `pilot` o `manager` intentando crear, editar o eliminar |
| 404 | `El accesorio no existe` | `accessoryId` del **listado** que no corresponde a ningún accesorio |
| 404 | `La característica no existe` | Detalle, edición o baja de un id inexistente — o de uno ya borrado |

### Errores de validación — formato `{ message, errors }`

| Campo | Mensaje |
|---|---|
| `accessoryId` (query) | `El accesorio es obligatorio` |
| `accessoryId` (query) | `El accesorio debe ser un número entero` |
| `accessory_id` (cuerpo) | `El accesorio es obligatorio` |
| `accessory_id` (cuerpo) | `El accesorio debe ser un número entero` |
| `accessory_id` (cuerpo) | `El accesorio no existe` |
| `name` | `El nombre de la característica es obligatorio` |
| `name` | `El nombre de la característica debe ser texto` |
| `name` | `El nombre de la característica no puede superar los 255 caracteres` |
| `value` | `El valor de la característica es obligatorio` |
| `value` | `El valor de la característica debe ser texto` |
| `value` | `El valor de la característica no puede superar los 500 caracteres` |

> Ojo al par repetido: **`El accesorio no existe` aparece como 404 en el listado y como 422 en el alta.** Es el mismo texto por dos caminos distintos, y el cliente debe leer el código, no el mensaje.

---

## 7. Checklist de implementación en el frontend

- [ ] Mandar `Authorization: Bearer {token}` y `Accept: application/json` en las cinco llamadas.
- [ ] Distinguir los dos formatos de error: sobre `{ statusCode, message, data }` para 400/401/403/404 y `{ message, errors }` para 422. No leer `response.statusCode` sin comprobar antes que existe.
- [ ] No llamar nunca al listado sin `accessoryId`: no devuelve nada útil, devuelve 422.
- [ ] Tratar el 404 del listado (`El accesorio no existe`) distinto de la lista vacía: el primero es un accesorio que no está, el segundo es un accesorio sin características.
- [ ] Usar `accessory_id` (snake_case) en el cuerpo del `POST` y `accessoryId` (camelCase) en el query param del listado.
- [ ] Pintar el `name` y el `value` que devuelve la API, no los que tecleó el usuario: el `name` vuelve en MAYÚSCULAS y ambos vuelven recortados.
- [ ] Avisar al usuario de que el nombre se guardará en mayúsculas, para que no se sorprenda.
- [ ] Manejar el 400 por nombre repetido como error de campo sobre el input del nombre, aunque llegue como error de negocio y no como 422.
- [ ] Parsear `createdAt` con el formato `d-m-Y h:i:s A`; `new Date()` a secas no lo entiende.
- [ ] Pedir confirmación antes del `DELETE`: es un borrado real y no hay forma de recuperarlo.
- [ ] Refrescar el listado tras un `DELETE`: la fila ya no existe y un segundo intento dará 404.
- [ ] No ofrecer un selector de accesorio en el formulario de edición: `accessory_id` se ignora y el usuario creería que funcionó.
- [ ] Para la ficha de un accesorio, encadenar dos llamadas: `GET /api/accessories/{id}` y `GET /api/accessory-characteristics?accessoryId={id}`.
- [ ] En una pantalla que liste muchos accesorios, **no** pedir las características de cada uno: son N+1 peticiones. Cargarlas solo al abrir el detalle.
- [ ] Ocultar los botones de crear, editar y eliminar a los roles distintos de `administrator` (el backend igualmente responde 403).
- [ ] Paginar solo si hace falta: lo normal es que un accesorio tenga un puñado de características y el listado completo quepa sin `limit`.

---

## 8. Lo que este dominio **no** hace (para no diseñarlo en el front)

- **No hay catálogo de nombres.** Ni tabla de nombres permitidos, ni autocompletado servido por la API, ni validación contra un diccionario. Si el front quiere sugerir nombres, la lista es suya y vive en el cliente.
- **No hay tipos de valor.** Todo es texto: ni números, ni fechas, ni booleanos, ni unidades. Un valor `"doce"` y un valor `"12"` son igual de válidos, y la API no los distingue ni los ordena por valor.
- **No hay características obligatorias.** Ningún accesorio exige tener «PLACA». Uno puede quedarse sin ninguna característica para siempre.
- **No hay alta en lote.** Un `POST` crea **una** fila. Tres características son tres llamadas, sin transacción que las agrupe ni endpoint de sincronización — si la tercera falla, las dos primeras quedan creadas.
- **`AccessoryResource` no cambió.** `GET /api/accessories` y `GET /api/accessories/{accessory}` no traen `characteristics` ni un contador, ni antes ni ahora.
- **No se puede buscar accesorios por característica.** No existe «dame los accesorios cuya PLACA sea P-123ABC»: la consulta va siempre en la dirección accesorio → características.
- **No hay búsqueda ni orden configurable** dentro del listado. Ni `search` sobre `name` o `value`, ni `sortBy`, ni `sortDir`.
- **No hay historial de cambios.** Editar el valor pisa el anterior sin dejar rastro, y borrar no deja tumba. No hay `updatedAt` ni bitácora consultable.
- **No se copian ni se heredan características** entre accesorios, no hay plantillas por tipo de pieza y no hay importación masiva.
- **No hay archivos adjuntos.** El valor es una cadena: no se puede subir la foto de la placa ni la factura.
- **No hay ruta anidada.** `/api/accessories/{accessory}/characteristics` no existe y no va a existir: el vínculo viaja en el cuerpo y en el query param.
