# Pilotos y salario base — referencia de integración para el frontend

Referencia completa del dominio **Pilots** de la API de Legumex Transportes: **tres** endpoints REST bajo `/api/pilots` para listar los pilotos vinculados a una empresa transportista, asignarles un salario base mensual y consultar la bitácora de cada cambio.

Todo lo que hay aquí está verificado contra la implementación real de la rama (rutas, FormRequest, Resources, Service y middlewares) y contra su suite de tests. Los mensajes de error son literales: se pueden mostrar tal cual al usuario.

> Documentación OpenAPI viva: `/api/documentation`.

---

## 1. Lo mínimo que hay que saber antes de escribir código

1. **El dominio tiene tres endpoints y ninguno más.** No existen `show`, `store`, `update` ni `destroy`. Vincular un piloto a una empresa sigue siendo `POST /api/carriers/join`; **desvincularlo no existe en ninguna parte de la API**.
2. **`{pilot}` es el `user_id` del piloto**, no el `id` de la fila de `carrier_pilots`. El id del pivote **no sale nunca** de la API: ni en el listado, ni en el historial, ni por ninguna otra vía.
3. **`salary` viaja como cadena con dos decimales** (`"4500.00"`), nunca como número JSON. Es **mensual y en quetzales (GTQ)** — convención del dominio, la columna no lo declara.
4. **`salary: null` significa «todavía no se le ha asignado», no «gana cero».** Un piloto recién unido nace con `null`, y el `PATCH` valida `min:0.01` justamente para que un `0.00` no se confunda con ninguna de las dos cosas.
5. **Mandar el mismo salario que el piloto ya tiene responde 400**, no 200 ni 422, y no escribe nada en la bitácora. La comparación es a dos decimales: contra un `"4500.00"`, tanto `4500` como `4500.00` y `4500.004` son el mismo salario.
6. **Los permisos de lectura y de escritura no coinciden.** Leen `administrator`, `manager` y `carrier`; escribe el salario solo `administrator` y `carrier`. **El `manager` recibe 403 en el `PATCH`** aunque vea todos los salarios del país.
7. **El rol `pilot` recibe 403 en los tres endpoints**, incluso usando su propio `user_id`. Hoy no hay un «mi salario».
8. **Toda respuesta viaja en un sobre** `{ statusCode, message, data }`… **salvo el 422 de validación**, que usa el formato estándar de Laravel `{ message, errors }`. Son dos formas distintas y el cliente debe distinguirlas.
9. **Hay otro listado de pilotos.** `GET /api/carriers/me/pilots` (SPEC 03) devuelve los pilotos del transportista **sin `salary`** y con `joinedAt` en **ISO 8601**. Conviven a propósito: aquel es el listado del transportista, este es el de administración.

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
| `GET /api/pilots` — listar | ✅ todas las empresas | ✅ solo la suya | 403 | ✅ todas las empresas |
| `PATCH /api/pilots/{pilot}/salary` — asignar salario | ✅ cualquier empresa | ✅ solo la suya | 403 | **403** |
| `GET /api/pilots/{pilot}/salary-history` — historial | ✅ cualquier empresa | ✅ solo la suya | 403 | ✅ cualquier empresa |

Las tres rutas llevan además **`carrier.required`**:

- Un `carrier` que **todavía no ha registrado empresa** recibe 403 en los tres, antes de llegar a la lógica.
- `administrator` y `manager` están **exentos** por definición del middleware: alcanzan los tres endpoints aunque no pertenezcan a ninguna empresa.

Los 403 tienen **tres mensajes distintos** según la causa, y conviene distinguirlos en la UI:

```json
{ "statusCode": 403, "message": "No tienes permisos para acceder a este recurso", "data": null }
```
```json
{ "statusCode": 403, "message": "Debes estar vinculado a un transportista para acceder a este recurso", "data": null }
```
```json
{ "statusCode": 403, "message": "No puedes acceder a un piloto que no pertenece a tu empresa transportista", "data": null }
```

> ⚠️ Un `manager` no está acotado a ninguna empresa: `GET /api/pilots` le devuelve el sueldo de **cada piloto de cada transportista registrado**. El control es por rol, no por campo.

---

## 3. El objeto `Pilot`

Es cada elemento de `data` en `GET /api/pilots`, y el `data` completo de la respuesta del `PATCH`. Siete claves, siempre en camelCase y siempre en este orden:

```json
{
  "id": 12,
  "name": "Roberto Santizo",
  "email": "piloto@legumex.com",
  "carrierId": 4,
  "carrierName": "Transportes del Norte",
  "salary": "4500.00",
  "joinedAt": "04-08-2026 10:15:00 AM"
}
```

| Campo | Tipo | Notas para el front |
|---|---|---|
| `id` | `number` | ⚠️ Es el **`user_id`** del piloto, no el id de la fila pivote. Es el `{pilot}` de las otras dos rutas y coincide con el `id` de `GET /api/carriers/me/pilots`, así que los dos listados son cruzables por este campo. |
| `name` | `string \| null` | Nombre del usuario piloto. `null` solo si la relación no se pudo cargar. |
| `email` | `string \| null` | El mismo con el que inicia sesión. Este dominio no lo modifica. |
| `carrierId` | `number` | Empresa a la que está vinculado. Un piloto pertenece como mucho a **una** empresa (índice único sobre `carrier_pilots.user_id`), así que nunca es una lista. |
| `carrierName` | `string \| null` | Resuelto por relación, para pintar la tabla sin un segundo `GET`. |
| `salary` | `string \| null` | **Cadena** con dos decimales (`"4500.00"`), **mensual y en GTQ**. `null` = sin asignar todavía, **no** cero. Para operar con él, conviértelo explícitamente (`Number(salary)`), y para mostrarlo úsalo tal cual. |
| `joinedAt` | `string \| null` | Fecha en que el piloto se unió a la empresa (`created_at` del pivote), no el alta de su usuario. ⚠️ **No es ISO 8601.** Formato propio `d-m-Y h:i:s A`. `new Date(...)` sobre él no funciona. |

## 3.1 El objeto `PilotSalaryHistory`

Es cada elemento de `data` en `GET /api/pilots/{pilot}/salary-history`. Seis claves:

```json
{
  "id": 37,
  "previousSalary": "4000.00",
  "newSalary": "4500.00",
  "changedById": 3,
  "changedByName": "Roberto Santizo",
  "changedAt": "15-08-2026 09:30:12 PM"
}
```

| Campo | Tipo | Notas para el front |
|---|---|---|
| `id` | `number` | Id de la entrada. **No se usa en ninguna ruta** (no hay detalle, edición ni baja), pero es la clave estable de la fila y el criterio de orden real del historial. |
| `previousSalary` | `string \| null` | Salario **anterior** al cambio. Es `null` **únicamente en la primera asignación** de cada piloto — la fila más antigua del historial y la única que puede traerlo. |
| `newSalary` | `string` | Salario resultante. Nunca `null` y nunca igual al `previousSalary` de su propia fila. En la entrada más reciente coincide con el `salary` del listado. Puede ser **menor** que el anterior: bajar el salario está permitido. |
| `changedById` | `number` | Usuario que hizo el cambio. Sale **siempre** del token, nunca del body. Es un `administrator` o un `carrier`. |
| `changedByName` | `string \| null` | Nombre **actual** del autor, no una copia congelada: si se renombra, toda la bitácora pasa a mostrar el nombre nuevo. |
| `changedAt` | `string \| null` | Fecha en que el cambio se guardó, que es también su **fecha de vigencia** (no hay `effective_from`). ⚠️ Formato `d-m-Y h:i:s A`, **no ISO 8601**. No sirve para ordenar: dos cambios del mismo segundo empatan aquí. |

### Tipos TypeScript sugeridos

```ts
export interface Pilot {
  /** user_id del piloto, NO el id de la fila pivote. */
  id: number;
  name: string | null;
  email: string | null;
  carrierId: number;
  carrierName: string | null;
  /** Cadena con 2 decimales, GTQ mensuales. null = sin asignar (no es cero). */
  salary: string | null;
  /** Formato 'd-m-Y h:i:s A', no ISO 8601. */
  joinedAt: string | null;
}

export interface PilotSalaryHistory {
  id: number;
  /** null solo en la primera asignación. */
  previousSalary: string | null;
  newSalary: string;
  changedById: number;
  changedByName: string | null;
  /** Formato 'd-m-Y h:i:s A', no ISO 8601. */
  changedAt: string | null;
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
{ "statusCode": 200, "message": "Salario actualizado correctamente", "data": { /* Pilot */ } }
```

### Listado sin paginar (sin `limit`)

`data` es el array completo y **no hay** metadatos de paginación:

```json
{ "statusCode": 200, "message": "Pilotos obtenidos correctamente", "data": [ /* Pilot[] */ ] }
```

### Listado paginado (con `limit` numérico)

Los metadatos se aplanan **en la raíz** del sobre, **no** bajo `meta`:

```json
{
  "statusCode": 200,
  "message": "Pilotos obtenidos correctamente",
  "data": [ /* Pilot[] */ ],
  "total": 24,
  "currentPage": 1,
  "lastPage": 3
}
```

Vale igual para el historial, con su propio mensaje.

### Error de negocio (400, 401, 403, 404)

```json
{ "statusCode": 404, "message": "El piloto no existe o no está vinculado a ninguna empresa transportista", "data": null }
```

### Error de validación (422) — **formato distinto**

No lleva `statusCode` ni `data`:

```json
{
  "message": "El salario es obligatorio",
  "errors": {
    "salary": ["El salario es obligatorio"]
  }
}
```

Solo existe la clave `salary`: el cuerpo del único `PATCH` del dominio tiene un campo y nada más.

---

## 5. Endpoints

### 5.1 `GET /api/pilots` — listar pilotos con su salario

Roles: `administrator`, `manager`, `carrier`.

Solo aparecen usuarios que **son pilotos de alguna empresa**: la lista sale de la pivote, no de la tabla de usuarios. Un usuario con rol `pilot` que aún no se ha unido a ninguna empresa **no figura aquí**.

Orden fijo `id ASC` de la fila pivote —el orden en que se fueron uniendo—, **no configurable**: no hay `sortBy` ni `sortDir`.

| Query param | Tipo | Comportamiento |
|---|---|---|
| `carrierId` | `number` | Acota a una empresa. ⚠️ **Solo surte efecto para `administrator` y `manager`.** A un `carrier` se le **ignora en silencio**: mandar el id de otra empresa devuelve **200 con sus propios pilotos**, ni 403 ni 422. |
| `limit` | `number` | Activa la paginación. Se acota a `[10, 100]`: `limit=1` → páginas de 10; `limit=500` → páginas de 100. Ausente o no numérico → colección completa sin metadatos. |
| `page` | `number` | Solo tiene efecto con un `limit` numérico. |

Los filtros son **tolerantes** y ninguno produce 422:

- `carrierId=abc` (no numérico) se **ignora** y devuelve el listado completo del ámbito.
- `carrierId` numérico de una empresa que no existe devuelve **200 con `data: []`**, nunca 404.
- No hay filtro por nombre, por email, por rango de salario ni por «pilotos sin salario asignado».

```
GET /api/pilots?carrierId=4&limit=10&page=1
```

Respuestas: **200** (`"Pilotos obtenidos correctamente"`) · **401** · **403**.

---

### 5.2 `PATCH /api/pilots/{pilot}/salary` — asignar o actualizar el salario

Roles: **solo `administrator` y `carrier`**. El `manager` recibe **403** aquí, aunque pueda leerlo todo.

Es la **única escritura** de todo el dominio. Sirve igual para la primera asignación (el piloto tenía `salary: null`) que para cualquier cambio posterior.

```json
{ "salary": 4500.00 }
```

| Campo | Obligatorio | Reglas |
|---|:--:|---|
| `salary` | ✅ | Numérico, entre `0.01` y `99999999.99`. Se acepta como número (`4500.5`) o como cadena numérica (`"4500.50"`); vuelve siempre como **cadena** con dos decimales. Es el salario **resultante y absoluto**, no un aumento ni un delta. |

Reglas y trampas:

- **Cuerpo vacío `{}` → 422**, no un 200 silencioso. Este `PATCH` existe para cambiar el salario; no admite no-op.
- **No se acepta ningún otro campo.** En particular `changedBy`: el autor sale siempre del usuario autenticado y mandarlo en el body **no tiene ningún efecto** (ni lo escribe ni da error). Tampoco hay `reason`, `notes` ni `effective_from`.
- ⚠️ **Mandar el salario que el piloto ya tiene → 400** y la bitácora **no cambia**. La comparación es a dos decimales: contra `"4500.00"` caen aquí `4500`, `4500.00` y `4500.004`. Un formulario que se reenvía sin cambios debe tratar este 400 como «no había nada que guardar».
- **Bajar el salario está permitido**, sin restricción ni aprobación, y se registra igual que una subida. Lo que no se puede es poner a alguien en cero (`min 0.01`).
- Los decimales más allá del segundo **se pierden al guardar**.
- Para un `carrier`, tocar un piloto de **otra empresa es 403**, no 404: el piloto existe, simplemente no es suyo.
- El **404 cubre dos casos a propósito y con el mismo mensaje**: un `user_id` que no existe y un usuario que existe pero no es piloto de ninguna empresa. Distinguirlos convertiría el endpoint en un oráculo de qué ids hay en el sistema.
- La escritura de la columna y la fila de bitácora corren en la **misma transacción**: si la bitácora fallara, el salario tampoco se guardaría.
- El cambio rige **desde que se guarda**. No hay aumentos programados y **no se notifica al piloto**.

Respuesta **200**: `{ statusCode: 200, message: "Salario actualizado correctamente", data: Pilot }` — con el salario ya aplicado.

Otras: **400** · **401** · **403** · **404** · **422**.

---

### 5.3 `GET /api/pilots/{pilot}/salary-history` — bitácora de cambios

Roles: `administrator`, `manager`, `carrier`. Misma guarda que el `PATCH`: mismo 404 de dos casos y mismo 403 de ámbito.

Orden fijo: del cambio **más reciente al más antiguo** (`id DESC`, no por fecha, porque dos cambios del mismo segundo empatarían `changedAt`). La **última** entrada de la lista es siempre la primera asignación, la única con `previousSalary: null`.

| Query param | Tipo | Comportamiento |
|---|---|---|
| `limit` | `number` | Misma regla `[10, 100]` que el listado. Ausente o no numérico → bitácora completa sin metadatos. |
| `page` | `number` | Solo tiene efecto con un `limit` numérico. |

No hay filtro por rango de fechas ni por autor del cambio.

- **Toda entrada es un cambio real**: el 400 del salario idéntico garantiza que no haya filas donde `previousSalary` y `newSalary` coincidan. Encadenando la lista al revés, el `newSalary` de cada entrada es el `previousSalary` de la siguiente.
- Un piloto **sin ningún cambio** —el caso normal de un recién unido, con `salary: null`— devuelve **200 con `data: []`**, nunca 404. El 404 es del piloto, no del historial.
- Es **solo lectura**: no hay endpoint que edite ni borre una entrada.
- La bitácora **crece sin techo y no se purga nunca**: un piloto con muchos años de ajustes conviene leerlo paginado.

Respuestas: **200** (`"Historial de salario obtenido correctamente"`) · **401** · **403** · **404**.

---

## 6. Tabla de mensajes de error (literales)

Se pueden mostrar tal cual al usuario; ya están en español.

| Origen | Código | Mensaje |
|---|:--:|---|
| `salary` (validación) | 422 | `El salario es obligatorio` · `El salario debe ser un número en quetzales` · `El salario debe ser mayor que cero` · `El salario no puede superar los 99999999.99 quetzales` |
| Salario repetido | 400 | `El salario indicado es el mismo que el piloto ya tiene registrado` |
| Token | 401 | `El token de sesión no es válido o ha expirado` |
| Rol sin permiso | 403 | `No tienes permisos para acceder a este recurso` |
| `carrier` sin empresa | 403 | `Debes estar vinculado a un transportista para acceder a este recurso` |
| Piloto de otra empresa | 403 | `No puedes acceder a un piloto que no pertenece a tu empresa transportista` |
| Piloto inexistente o no vinculado | 404 | `El piloto no existe o no está vinculado a ninguna empresa transportista` |

> Ojo a la pareja 403/404 del ámbito: **403 confirma que el piloto existe** (es de otra empresa) y **404 no distingue** entre «no existe» y «no es piloto de nadie».

---

## 7. Checklist de implementación en el frontend

- [ ] Cliente HTTP que adjunta `Authorization: Bearer` y `Accept: application/json` en las tres llamadas.
- [ ] Manejo **de dos formatos de error**: sobre `{statusCode, message, data}` para 400/401/403/404 y `{message, errors}` para 422.
- [ ] Usar siempre el `id` del listado (que es el `user_id`) como `{pilot}` en el `PATCH` y en el historial. No hay ningún otro identificador disponible.
- [ ] Tratar `salary` como **cadena**: mostrarla tal cual, convertirla explícitamente antes de operar, y distinguir `null` («sin asignar») de `"0.00"` (que no puede existir).
- [ ] Formatear el importe como GTQ mensuales en la UI: la API no manda ni símbolo ni periodicidad.
- [ ] Manejar el **400 del salario idéntico** como «no había nada que guardar», no como fallo del formulario. Idealmente, deshabilitar el botón cuando el valor no cambió.
- [ ] Listado: paginación leyendo `total`/`currentPage`/`lastPage` **de la raíz**, y modo sin `limit` cuando se necesite la lista entera.
- [ ] Mostrar el filtro `carrierId` **solo** a `administrator` y `manager`: a un `carrier` no le hace nada y confunde.
- [ ] Ocultar el botón de editar salario a `manager` y `pilot` (el 403 del servidor es la red, no la UX), y todo el módulo a `pilot`.
- [ ] Contemplar el `carrier` sin empresa registrada: los tres endpoints le dan 403 con un mensaje propio; llévalo a registrar su empresa en vez de mostrar «sin permisos».
- [ ] Fechas: mostrar `joinedAt` y `changedAt` como texto plano; **no** parsearlas como ISO.
- [ ] Historial: pintar la lista tal como llega (más reciente arriba) y tratar la fila con `previousSalary: null` como «asignación inicial». `data: []` es «nunca se le ha cambiado el salario», no un error.
- [ ] Refrescar el listado tras un `PATCH` correcto, o usar el `Pilot` que devuelve la respuesta.

---

## 8. Lo que este dominio **no** hace (para no diseñarlo en el front)

- No hay `show`, `store`, `update` ni `destroy`: solo tres endpoints. Vincular un piloto es `POST /api/carriers/join`.
- **No se puede desvincular** a un piloto de una empresa por ninguna vía.
- No existe «mi salario»: un `pilot` no alcanza ninguno de los tres endpoints, ni sobre sí mismo.
- No hay salario efectivo a futuro (`effective_from`) ni aumentos programados.
- No hay motivo, nota ni adjunto del cambio: la bitácora registra el **qué** y el **quién**, nunca el **por qué**.
- No se puede editar ni borrar una entrada del historial.
- No hay historial global de la empresa (`GET /api/pilots/salary-history` sin id **no existe**) ni exportación a CSV o Excel.
- No hay nómina, bonificaciones, horas extra, descuentos, IGSS, ISR ni pagos por viaje: esto guarda un número base mensual, no lo liquida.
- No hay cambio de salario **en lote**.
- No hay moneda configurable: GTQ es convención del dominio.
- No se notifica al piloto de que su salario cambió.
- No hay forma de ocultar el salario a un rol que sí alcanza el listado: el control es por rol, no por campo.
- No hay orden configurable ni filtros por nombre, email, rango de salario o fechas.
