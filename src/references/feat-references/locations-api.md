# Destinos (`Location`) — referencia de integración para el frontend

Referencia completa del dominio **Locations** de la API de Legumex Transportes: seis endpoints REST bajo `/api/locations` para gestionar los destinos puntuales —bodegas, centros de acopio, mercados— anclados a un lugar real de Google por su `googlePlaceId`.

> ## ⚠️ CAMBIO INCOMPATIBLE EN EL ALTA — LÉELO ANTES DE NADA
>
> `POST /api/locations` ahora exige un campo nuevo, **`type`** (`"port"` | `"destination"`), y **no hay periodo de gracia**. Cualquier front que siga mandando los cuatro campos de antes empieza a recibir **422** con `El tipo de destino es obligatorio` en el instante en que se despliegue el backend. El detalle está en **§11**, y el despliegue de las dos partes debe coordinarse.
>
> El `PATCH`, el listado y los otros cuatro endpoints **no** son incompatibles: `type` entra ahí como opcional.

Este documento incluye además el **cambio incompatible de `/api/freight-rates`** (§10): las tarifas de flete dejaron de colgar de una zona y ahora cuelgan de un destino. Si tu pantalla cotiza fletes, esa sección es obligatoria.

Todo lo que hay aquí está verificado contra la implementación real (Laravel 13) y contra su suite de tests. Los mensajes de error son literales: se pueden mostrar tal cual al usuario.

> Documentación OpenAPI viva: `/api/documentation`.

---

## 1. Lo mínimo que hay que saber antes de escribir código

1. **El destino se da de alta antes de poder cotizarlo.** No hay cotización *ad hoc* de una dirección suelta: el flujo es buscar en `GET /api/places` → elegir → `POST /api/locations` → cotizar con `locationId`. Un lugar que nadie dio de alta no se puede cotizar, y eso es deliberado.
2. **La API nunca llama a Google.** El front manda `googlePlaceId`, `latitude` y `longitude` ya resueltos, los tres salen de la misma respuesta de `/api/places`. El backend no valida el place id contra nadie: uno inventado con el formato correcto se acepta con 201.
3. **Los dos duplicados posibles responden con códigos distintos.** Nombre repetido → **422**. `googlePlaceId` repetido → **400**, con un mensaje que **nombra al destino que ya lo ocupa**. La asimetría es intencionada: un 422 cortaría antes de que ese nombre se pudiera calcular, y es justo lo que hace útil el error.
4. **`latitude` y `longitude` viajan como `string`, no como `number`.** Son `"14.63490000"`, con ocho decimales fijos. Si haces `parseFloat` para pintar el pin, hazlo en la capa de mapa; no los guardes como número si luego los vas a reenviar.
5. **Las coordenadas no influyen en el precio.** La tarifa depende del destino *elegido*, no de dónde esté el pin. Corregir unas coordenadas mal puestas **no cambia ninguna cotización**, y teclearlas mal no produce ningún fallo visible.
6. **El `googlePlaceId` es editable y eso tiene un filo.** Reapuntar el destino a otro lugar conserva su `id` y todas sus tarifas —ese es el motivo de permitirlo—, pero **no arrastra las coordenadas**: si mandas solo el `googlePlaceId`, el pin se queda donde estaba y la API responde 200 sin avisar. Manda siempre los tres campos juntos.
7. **Toda respuesta viaja en un sobre** `{ statusCode, message, data }`… **salvo el 422 de validación**, que usa el formato estándar de Laravel `{ message, errors }`. Son dos formas distintas y el cliente debe distinguirlas.
8. **`DELETE` no borra.** Es una baja lógica idempotente: pone `status: false` y la fila sigue apareciendo en el listado.
9. **Escribir es solo de `administrator`.** Leer lo puede hacer cualquier usuario autenticado.
10. **`type` es obligatorio en el alta y es un cambio incompatible.** Dos valores, `"port"` y `"destination"`, validados **exactos y sensibles a mayúsculas**: `"PORT"`, `"Port"` y `"puerto"` son 422. Ver §11.
11. **`type` es una etiqueta, no una regla de negocio.** No cambia el precio, no aparece en la cotización, no restringe qué tarifas se pueden crear y no cambia lo que ve cada rol. **Un puerto se cotiza exactamente igual que cualquier otro destino.** No diseñes una pantalla que asuma lo contrario.
12. **El filtro `?type=` puede devolverte lista vacía sin estar roto.** Todos los destinos anteriores a este cambio se migraron a `"destination"`, así que hasta que un administrador reclasifique los puertos a mano, `?type=port` devuelve `[]` aunque el catálogo tenga puertos reales. Es trabajo de datos, no un bug.

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
| Listar y ver detalle | ✅ | ✅ | ✅ | ✅ |
| Crear, editar, alternar estado, dar de baja | ✅ | 403 | 403 | 403 |

Los destinos son un dato **nacional de Legumex**: no pertenecen a ninguna empresa transportista. No hay `carrierId`, no hay filtrado por empresa, y **ninguna ruta lleva el middleware `carrier.required`**, así que un `carrier` que todavía no ha registrado su empresa también puede leerlos.

Un rol sin permiso de escritura recibe **403**:

```json
{ "statusCode": 403, "message": "No tienes permisos para acceder a este recurso", "data": null }
```

---

## 3. El objeto `Location`

Es lo que devuelve `data` en los seis endpoints (o cada elemento de `data` en el listado). **Once claves** (eran diez antes de `type`), siempre en camelCase y siempre en este orden:

```json
{
  "id": 1,
  "name": "BODEGA CENTRAL ESCUINTLA",
  "description": "Entrada por el km 58, portón de carga 2",
  "type": "destination",
  "googlePlaceId": "ChIJd8BlQ2BZwokRAFUEcm_qrcA",
  "latitude": "14.63490000",
  "longitude": "-90.50690000",
  "status": true,
  "registeredByName": "Roberto Santizo",
  "createdAt": "19-08-2026 08:45:12 PM",
  "updatedAt": "19-08-2026 08:45:12 PM"
}
```

| Campo | Tipo | Notas para el front |
|---|---|---|
| `id` | `number` | Es el `{location}` de las rutas de detalle, edición, toggle y baja, y el `locationId` con el que se cotiza un flete. |
| `name` | `string` | **Siempre en MAYÚSCULAS.** El backend normaliza: recorta, colapsa espacios internos y pasa a mayúsculas. Pinta lo que devuelve la respuesta, no lo que tecleó el usuario. |
| `description` | `string \| null` | Único campo que puede ser `null`. Sin longitud máxima (la columna es `text`). |
| `type` | `"port" \| "destination"` | Etiqueta de catálogo. **Cadena cruda del enum, en inglés y minúsculas, sin traducir y sin envolver en objeto**: mostrar «Puerto» / «Destino» es cosa del cliente. Nunca `null`. **No influye en el precio ni en ninguna cotización.** |
| `googlePlaceId` | `string` | Identificador opaco de Google Places. **Se guarda tal cual llega**: no se recorta ni se pasa a mayúsculas, y es **sensible a mayúsculas** —`ChIJabc` y `CHIJABC` son dos lugares distintos y ambos se aceptarían—. Nunca `null`. |
| `latitude` | `string` | ⚠️ **Cadena, no número.** Ocho decimales fijos: `"14.63490000"`. Rango `[-90, 90]`. |
| `longitude` | `string` | ⚠️ **Cadena, no número.** Ocho decimales fijos: `"-90.50690000"`. Rango `[-180, 180]`. |
| `status` | `boolean` | Booleano JSON de verdad, nunca `1`/`0` ni `"true"`. `false` = dado de baja. |
| `registeredByName` | `string \| null` | Nombre del administrador que lo dio de alta. No se envía nunca en el body: sale del token. Editar el destino **no** lo reescribe. |
| `createdAt` / `updatedAt` | `string \| null` | ⚠️ **No es ISO 8601.** Formato propio `d-m-Y h:i:s A` (`19-08-2026 08:45:12 PM`). Está pensado para mostrarse tal cual; `new Date(...)` sobre él no funciona. |

**Por qué las coordenadas son cadenas:** la columna es `decimal(10,8)` / `decimal(11,8)` y viaja sin pasar por ninguna conversión a flotante que pueda perder dígitos. Es el mismo criterio que `pricePerPound` en las tarifas. Ocho decimales dan precisión de poco más de un milímetro.

### Tipos TypeScript sugeridos

```ts
/** Cadena cruda del enum. Traducir a pantalla es cosa del cliente. */
export type LocationType = 'port' | 'destination';

export interface Location {
  id: number;
  name: string;
  description: string | null;
  /** Etiqueta de catálogo: NO afecta al precio ni a la cotización. */
  type: LocationType;
  /** Opaco y SENSIBLE A MAYÚSCULAS. No normalizar en el cliente. */
  googlePlaceId: string;
  /** Cadena con 8 decimales, no number. Ej: '14.63490000'. */
  latitude: string;
  /** Cadena con 8 decimales, no number. Ej: '-90.50690000'. */
  longitude: string;
  status: boolean;
  registeredByName: string | null;
  /** Formato 'd-m-Y h:i:s A', no ISO 8601. */
  createdAt: string | null;
  updatedAt: string | null;
}

export interface StoreLocationBody {
  name: string;
  description?: string | null;
  /** OBLIGATORIO desde el cambio incompatible. Omitirlo es 422. */
  type: LocationType;
  googlePlaceId: string;
  latitude: number;
  longitude: number;
}

/** Todos opcionales. Un body vacío es un no-op con 200. */
export interface UpdateLocationBody {
  name?: string;
  description?: string | null;
  /** Omitir deja el tipo intacto; mandarlo vacío o fuera del enum es 422. */
  type?: LocationType;
  googlePlaceId?: string;
  latitude?: number;
  longitude?: number;
  status?: boolean;
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

> Nota de tipos: se **envían** `latitude`/`longitude` como `number` y se **reciben** como `string`. No es un descuido de este documento: la validación acepta cualquier valor numérico y el cast de salida los fija a ocho decimales.

---

## 4. El `googlePlaceId`: de dónde sale y qué pasa si se repite

El destino se ancla a un lugar real de Google. El flujo completo, de principio a fin:

```
GET /api/places?search=bodega escuintla      → lista de lugares
   ↓ el usuario elige uno
POST /api/locations { name, googlePlaceId, latitude, longitude }
   ↓
GET /api/freight-rates/quote?locationId=…    → cotización
```

Los tres campos —`googlePlaceId`, `latitude`, `longitude`— salen de **la misma respuesta** de `/api/places`. Mandarlos juntos es gratis y es lo que evita que el pin y el lugar se desalineen.

**Si el lugar ya está registrado en otro destino**, la respuesta es **400** (no 422) y el mensaje **nombra al ocupante**:

```json
{
  "statusCode": 400,
  "message": "El lugar seleccionado ya está registrado en el destino BODEGA CENTRAL ESCUINTLA",
  "data": null
}
```

Ese mensaje es directamente mostrable: le dice al usuario dónde mirar en vez de dejarlo adivinando. Ocurre igual en el `POST` y en el `PATCH`.

**Lo que la unicidad NO impide:** dos destinos distintos para el mismo sitio físico. Google devuelve identificadores distintos para una bodega y para su entrada, así que dos filas así pasan la unicidad sin problema y aceptan tarifas distintas para el mismo producto. La única barrera es que el `name` también es único, lo que obliga a inventar dos nombres y hace el duplicado visible al capturarlo. **No hay detección por proximidad.**

---

## 5. Formato de las respuestas

### Éxito

```json
{ "statusCode": 200, "message": "Destinos obtenidos correctamente", "data": { ... } }
```

### Listado sin paginar (sin `limit`)

`data` es el array completo y **no hay** metadatos de paginación:

```json
{ "statusCode": 200, "message": "Destinos obtenidos correctamente", "data": [ /* Location[] */ ] }
```

### Listado paginado (con `limit` numérico)

Los metadatos se aplanan **en la raíz** del sobre, **no** bajo `meta`:

```json
{
  "statusCode": 200,
  "message": "Destinos obtenidos correctamente",
  "data": [ /* Location[] */ ],
  "total": 42,
  "currentPage": 1,
  "lastPage": 5
}
```

### Error de negocio (401, 403, 404, 400)

```json
{ "statusCode": 404, "message": "El destino no existe", "data": null }
```

### Error de validación (422) — **formato distinto**

No lleva `statusCode` ni `data`:

```json
{
  "message": "El nombre del destino es obligatorio (and 2 more errors)",
  "errors": {
    "name": ["El nombre del destino es obligatorio"],
    "latitude": ["La latitud debe estar entre -90 y 90"],
    "googlePlaceId": ["El lugar de Google es obligatorio"]
  }
}
```

Los mensajes ya vienen en español y son mostrables tal cual.

---

## 6. Endpoints

### 6.1 `GET /api/locations` — listar

Cualquier autenticado. Devuelve **activos e inactivos mezclados** salvo que se filtre. Orden fijo `id ASC`, no configurable.

| Query param | Tipo | Comportamiento |
|---|---|---|
| `status` | `true\|false\|1\|0` | Filtra por publicación. Cualquier valor no booleano se **ignora en silencio** (200, nunca 422). |
| `type` | `port\|destination` | Filtra por etiqueta. **Coincidencia exacta y SENSIBLE A MAYÚSCULAS**: `PORT`, `Port` y `puerto` **no** filtran, se **ignoran en silencio** y devuelven el listado completo (200, nunca 422 ni lista vacía). Vacío también se ignora. |
| `search` | `string` | `LIKE %término%` sobre el nombre, **insensible a mayúsculas** (`bode` y `BODE` encuentran `BODEGA CENTRAL`). En blanco se ignora. **Solo busca por nombre**: no cubre la descripción ni el `googlePlaceId`. |
| `limit` | `number` | Activa la paginación. Se acota a `[10, 100]`: `limit=5` → páginas de 10; `limit=500` → páginas de 100. Ausente o no numérico → colección completa sin metadatos. |
| `page` | `number` | Solo tiene efecto con un `limit` numérico. |

Los cuatro filtros se combinan entre sí y **son tolerantes**: nada de lo que llegue mal produce un 422 aquí. Un filtro sin coincidencias devuelve **200 con `data: []`**, nunca 404.

> ⚠️ **`?type=port` puede devolver `[]` sin que nada esté roto.** Los destinos anteriores al cambio se migraron todos a `"destination"`; hasta que un administrador reclasifique los puertos a mano con un `PATCH`, la lista de puertos estará vacía. Si construyes una pantalla sobre este filtro, no la presentes como un fallo.
>
> Ojo con la trampa que se deriva: un `type` **mal escrito no vacía la lista, la deja entera**. `?type=puerto` devuelve todos los destinos, puertos incluidos. Valida el valor en el cliente antes de mandarlo si la pantalla depende del filtro.

**No hay filtro por proximidad, radio, bounding box ni distancia**, ni orden configurable.

```
GET /api/locations?status=true&type=port&search=bodega&limit=10
```

Respuestas: **200** (`"Destinos obtenidos correctamente"`) · **401**.

---

### 6.2 `POST /api/locations` — crear

Solo `administrator`.

> ⚠️ **CAMBIO INCOMPATIBLE:** este cuerpo pasó de **cuatro a cinco campos obligatorios** con la llegada de `type`, y **sin periodo de gracia**. Ver §11.

```json
{
  "name": "bodega central escuintla",
  "description": "Entrada por el km 58, portón de carga 2",
  "type": "destination",
  "googlePlaceId": "ChIJd8BlQ2BZwokRAFUEcm_qrcA",
  "latitude": 14.6349,
  "longitude": -90.5069
}
```

| Campo | Obligatorio | Reglas |
|---|:--:|---|
| `name` | ✅ | Máx. 255. Se normaliza a mayúsculas **antes** de comprobar unicidad, que es global. |
| `description` | — | Texto libre, sin máximo. Admite `null`. |
| `type` | ✅ | **`"port"` o `"destination"`, exacto y sensible a mayúsculas.** `"PORT"`, `"Port"`, `"puerto"` o cualquier otro valor → 422. Ausente o `""` → 422. |
| `googlePlaceId` | ✅ | Máx. 255. **No se normaliza.** Duplicado → **400** (ver §4). |
| `latitude` | ✅ | Numérica, `[-90, 90]`. |
| `longitude` | ✅ | Numérica, `[-180, 180]`. |

`status` y `registeredBy` **no se aceptan**: el destino nace `true` y la autoría sale del token. Mandarlos no tiene efecto y no produce error.

**No hay validación cruzada** entre el `googlePlaceId` y las coordenadas: se pueden dar de alta las coordenadas de un sitio con el place id de otro y el alta responde 201 sin ningún aviso.

Tampoco la hay con el `type`: **nadie comprueba que un destino llamado `TERMINAL DE CARGA PUERTO QUETZAL` se dé de alta como `port`**. Se puede guardar como `destination` y responde 201 sin avisar. Si la clasificación importa en tu pantalla, ayúdala en el formulario, porque la API no lo hará.

**La unicidad de `name` sigue siendo global, no por tipo:** un puerto y un destino ordinario **no** pueden llamarse igual. El segundo recibe 422 con `Ya existe un destino con ese nombre`.

Respuesta **201**: `{ statusCode: 201, message: "Destino registrado correctamente", data: Location }`.

Otras: **400** (`googlePlaceId` ya ocupado) · **401** · **403** · **422** (nombre repetido —incluido mandar `bodega central` existiendo `BODEGA CENTRAL`—, campos faltantes, coordenadas fuera de rango).

---

### 6.3 `GET /api/locations/{location}` — detalle

Cualquier autenticado. Un destino dado de baja se obtiene con normalidad (200): la baja es lógica y no oculta nada.

Respuestas: **200** (`"Destino obtenido correctamente"`) · **401** · **404** (`"El destino no existe"`).

---

### 6.4 `PATCH /api/locations/{location}` — editar

Solo `administrator`. La ruta acepta `PATCH` y `PUT` indistintamente; el comportamiento es el mismo (edición parcial en ambos casos).

Los **siete** campos son opcionales por separado: `name`, `description`, `type`, `googlePlaceId`, `latitude`, `longitude`, `status`. Solo se toca lo que venga.

```json
{ "googlePlaceId": "ChIJnuevoLugar", "latitude": 14.6402, "longitude": -90.4998 }
```

Reglas y trampas:

- **Body vacío `{}` → 200 sin cambios.** Es un no-op deliberado, no un error.
- `name` y `googlePlaceId` se revalidan **ignorando la propia fila**: reenviar el suyo propio da 200; el de otro destino da 422 (nombre) o 400 (lugar).
- `description: null` **borra** la descripción. Omitir la clave la deja como está.
- **`type` se cambia sin ninguna restricción.** Omitirlo lo deja intacto; mandarlo obliga a un valor del enum, así que `""` y `null` son **422** (no borran nada: el campo no es nullable). Un destino que **ya tiene tarifas** puede pasar a `port` y volver, y la respuesta es **200 sin ningún aviso**: las tarifas quedan intactas y siguen cotizando igual. Es deliberado — el tipo es una etiqueta y una etiqueta mal capturada se corrige.
- ⚠️ **Reapuntar el `googlePlaceId` no mueve el pin.** Un `PATCH` solo con `googlePlaceId` responde 200 y deja `latitude`/`longitude` como estaban, apuntando al lugar anterior, sin ningún aviso. **Manda siempre los tres campos juntos.**
- Corregir las coordenadas **no cambia ninguna cotización**, ni antigua ni futura.
- `status: false` da de baja igual que el `DELETE`; `status: true` reactiva.
- `registeredByName` no cambia nunca; `updatedAt` sí.
- **No hay auditoría**: el nombre, el tipo, el lugar y las coordenadas anteriores no se guardan en ningún sitio. Cambiar el tipo **no deja bitácora**.

Respuestas: **200** (`"Destino actualizado correctamente"`) · **400** · **401** · **403** · **404** · **422**.

---

### 6.5 `PATCH /api/locations/{location}/toggle-status` — invertir estado

Solo `administrator`. **No lleva body.** Invierte `status`: `true` → `false` y al revés.

No es idempotente por diseño: dos llamadas seguidas devuelven el destino a su estado inicial. Es lo que necesita el interruptor de una tabla, que no tiene por qué saber el estado actual. Si quieres fijar un estado concreto, usa `PATCH` con `status`.

**No mira si el destino tiene tarifas.** Desactivar un destino con tarifas las deja incotizables y no editables de golpe, sin decir cuántas arrastra (ver §10).

Respuestas: **200** (`"Estado del destino actualizado correctamente"`, con la fila ya invertida en `data`) · **401** · **403** · **404**.

---

### 6.6 `DELETE /api/locations/{location}` — dar de baja

Solo `administrator`. ⚠️ **No borra nada**: pone `status: false`.

- La fila **sigue apareciendo** en `GET /api/locations` sin filtros. Para excluirla hay que pedir `status=true`.
- Sigue siendo consultable por id (200).
- Es **idempotente**: repetir el `DELETE` sobre un destino ya inactivo responde 200 otra vez, sin error.
- Es reversible con `toggle-status` o con `PATCH` y `status: true`. **No existe borrado real por ninguna vía.**
- Tampoco mira si el destino tiene tarifas.

Respuestas: **200** (`"Destino dado de baja correctamente"`) · **401** · **403** · **404**.

---

## 7. Tabla de mensajes de error (literales)

Se pueden mostrar tal cual al usuario; ya están en español.

### Validación (422, bajo `errors.{campo}`)

| Campo | Mensaje |
|---|---|
| `name` | `El nombre del destino es obligatorio` · `El nombre del destino debe ser texto` · `El nombre del destino no puede superar los 255 caracteres` · `Ya existe un destino con ese nombre` |
| `description` | `La descripción debe ser texto` |
| `type` | `El tipo de destino es obligatorio` · `El tipo de destino no es válido` |
| `googlePlaceId` | `El lugar de Google es obligatorio` · `El lugar de Google debe ser texto` · `El lugar de Google no puede superar los 255 caracteres` |
| `latitude` | `La latitud es obligatoria` · `La latitud debe ser numérica` · `La latitud debe estar entre -90 y 90` |
| `longitude` | `La longitud es obligatoria` · `La longitud debe ser numérica` · `La longitud debe estar entre -180 y 180` |
| `status` | `El estado debe ser verdadero o falso` (solo en el `PATCH`) |

En el `PATCH` no existen los mensajes `.required`… **con una excepción: `type`.** Se valida como `sometimes|required`, así que omitirlo es válido pero mandarlo vacío o `null` devuelve `El tipo de destino es obligatorio`, y un valor fuera del enum devuelve `El tipo de destino no es válido`.

En el alta, `type: ""` responde `El tipo de destino es obligatorio` y `type: "puerto"` responde `El tipo de destino no es válido`. Los dos son 422 bajo `errors.type`; discrimina por el texto solo si necesitas afinar el mensaje del formulario.

### Negocio y sobre estándar

| Código | Mensaje |
|---|---|
| 400 | `El lugar seleccionado ya está registrado en el destino {NOMBRE}` |
| 401 | `El token de sesión no es válido o ha expirado` |
| 403 | `No tienes permisos para acceder a este recurso` |
| 404 | `El destino no existe` |

> ⚠️ El texto `Ya existe un destino con ese nombre` existe **en los dos formatos**: como 422 de validación (que es lo que verás siempre por HTTP) y como 400 del service (alcanzable solo desde el backend). **Discrimina por código, no por mensaje.**

---

## 8. Checklist de implementación en el frontend

- [ ] Cliente HTTP que adjunta `Authorization: Bearer` y `Accept: application/json` en las seis llamadas.
- [ ] Manejo **de dos formatos de error**: sobre `{statusCode, message, data}` para 401/403/404/400 y `{message, errors}` para 422.
- [ ] Mapeo de `errors` de validación a los campos del formulario.
- [ ] **Tratar el 400 del `googlePlaceId` como error de campo, no como error global**: el mensaje ya nombra al destino ocupante y debe salir junto al selector de lugar, no en un toast genérico.
- [ ] **Añadir el selector de `type` al formulario de alta antes de desplegar el backend** (`Puerto` / `Destino`), mandando el valor crudo en minúsculas. Sin él, **todas las altas devuelven 422**.
- [ ] Traducir `type` a pantalla en el cliente: la API devuelve `"port"` / `"destination"` en inglés y no traduce nada.
- [ ] Selector de `type` también en el formulario de edición, sabiendo que cambiarlo con tarifas colgando es 200 y no avisa de nada.
- [ ] Si filtras por `?type=`, mandar solo valores del enum: un valor mal escrito **no vacía la lista, la devuelve entera**.
- [ ] Avisar en la pantalla de puertos de que el catálogo migrado está todo en `destination` hasta que se reclasifique a mano, para no leer un `[]` legítimo como un fallo.
- [ ] Flujo de alta encadenado a `GET /api/places`: el usuario **elige** un lugar, nunca teclea el `googlePlaceId` a mano.
- [ ] El formulario de edición manda `googlePlaceId`, `latitude` y `longitude` **siempre juntos**, aunque solo cambie uno.
- [ ] `latitude`/`longitude` se reciben como `string`: convertir solo en la capa de mapa, y no asumir `number` en el modelo.
- [ ] Listado: paginación leyendo `total`/`currentPage`/`lastPage` **de la raíz**, y modo sin `limit` para el selector de destinos de la pantalla de cotización.
- [ ] Mostrar `name` tal como lo devuelve la respuesta (normalizado en mayúsculas), no el tecleado.
- [ ] Fechas: mostrar `createdAt`/`updatedAt` como texto plano; no parsearlas como ISO.
- [ ] Baja lógica: la fila no desaparece de la tabla tras el `DELETE`; refleja `status` con un estado visual y ofrece reactivar.
- [ ] Antes de desactivar un destino, avisar de que sus tarifas quedarán incotizables y no editables (la API no lo dice).
- [ ] Ocultar o deshabilitar las acciones de escritura para los roles que no son `administrator` (el 403 del servidor es la red, no la UX).
- [ ] **Migrar las llamadas a `/api/freight-rates`** según §10.

---

## 9. Lo que este dominio **no** hace (para no diseñarlo en el front)

- **No llama a Google.** No resuelve coordenadas desde un `googlePlaceId`, no valida que exista y no refresca el nombre.
- **No conoce las zonas.** Un destino no sabe en qué zona cae; no hay `zoneId` en `locations` ni endpoint que lo resuelva. Los dos dominios geográficos conviven sin relación.
- **No calcula distancia, kilometraje ni ruta**, y no hay «destino más cercano» ni búsqueda por radio o *bounding box*.
- **No cotiza nada.** Las tarifas viven en `/api/freight-rates`.
- **No hay destinos por empresa**: son nacionales, sin `carrierId` ni pivote.
- **No hay borrado real**, ni auditoría del nombre, el lugar o las coordenadas anteriores.
- **El `type` no hace nada más que etiquetar.** No cambia el precio, no aparece en `GET /api/freight-rates/quote` ni en su respuesta, no restringe qué tarifas o qué productos se pueden asociar al destino, no impide cambiarlo con tarifas colgando y no cambia lo que ve cada rol. **Un puerto se cotiza exactamente igual que cualquier otro destino.**
- **No hay un tercer tipo** (aduana, frontera, centro de acopio) ni catálogo de tipos editable: son dos valores fijos en el código.
- **No hay columnas propias del puerto**: ni código de puerto, ni terminal, ni muelle, ni horario, ni agente aduanal. Lo que haga falta se teclea en `description`.
- **No hay unicidad de `name` por tipo**: sigue siendo global, así que un puerto y un destino no pueden llamarse igual.
- **No hay bitácora del cambio de tipo** ni reclasificación masiva o automática.
- **No hay columna `address`** ni dirección formateada: hoy eso cabe en `description`.
- **No hay agrupaciones, jerarquías, alias ni detección de duplicados por proximidad.**
- **No hay alta en lote** ni importación desde CSV, Excel o Google Places.
- No hay orden configurable (`sortBy`, `sortDir`) ni filtros por rango de fechas o por autor del alta.

---

## 10. ⚠️ Cambio incompatible en `/api/freight-rates`

**Las tarifas de flete dejaron de colgar de una zona y ahora cuelgan de un destino.** El cambio se aplicó de golpe, **sin periodo de gracia**: los nombres viejos ya no se aceptan por ninguna vía.

### Tabla de equivalencias

| Antes | Ahora |
|---|---|
| `GET /api/freight-rates?zoneId=3` | `GET /api/freight-rates?locationId=3` |
| `GET /api/freight-rates/quote?lat=14.63&lng=-90.50&productId=7&fuelType=diesel` | `GET /api/freight-rates/quote?locationId=3&productId=7&fuelType=diesel` |
| `POST /api/freight-rates` con `zoneId` | `POST /api/freight-rates` con `locationId` |
| `PATCH /api/freight-rates/{id}` con `zoneId` | `PATCH /api/freight-rates/{id}` con `locationId` |
| Respuesta con `zoneId` / `zoneName` | Respuesta con `locationId` / `locationName` |

Las seis rutas siguen existiendo con **los mismos métodos y los mismos roles**. Solo cambian los parámetros y dos claves de la respuesta.

### Los dos fallos que hay que anticipar

1. **La cotización deja de funcionar y el error no explica por qué.** Un cliente sin actualizar manda `?lat=&lng=&productId=&fuelType=` y recibe un **422 por `locationId` faltante** — un mensaje correcto que no dice nada del cambio de contrato. `lat` y `lng` **se ignoran por completo**: no filtran, no validan y no cambian la respuesta.
2. **El caso silencioso, que es el peor.** `GET /api/freight-rates?zoneId=3` **no falla**: el filtro desconocido se ignora y devuelve **todas las tarifas de todos los destinos**, sin error visible. Una tabla de precios que parece correcta y trae de más.

### `/quote`: cómo cambió el manejo de errores

**Ya no existe ninguna respuesta 404 en la cotización.** El antiguo `404 "El punto indicado no pertenece a ninguna zona registrada"` desapareció con la resolución por punto. Si tu código lo trata como caso especial, bórralo.

Los fallos posibles, en el orden exacto en que se comprueban:

| Paso | Fallo | Código | Mensaje |
|---|---|:--:|---|
| — | `locationId` inexistente | **422** | `El destino seleccionado no existe` |
| 1 | Destino inactivo | **400** | `El destino seleccionado no está activo` |
| 2 | Producto inactivo | **400** | `El producto seleccionado no está activo` |
| 3 | Combustible sin precio vigente | **400** | `No existe un precio vigente para el combustible indicado` |
| 4 | El trío no tiene tarifas | **400** | `No existe tarifa cotizada para ese producto en ese destino` |
| 5 | Selección de banda | — | **Nunca falla.** |

Los cuatro mensajes de 400 son distintos entre sí a propósito: cada uno dice exactamente qué falta.

### Otros mensajes de tarifas que cambiaron de texto

| Antes | Ahora |
|---|---|
| `La zona seleccionada no está activa` | `El destino seleccionado no está activo` |
| `La zona seleccionada no existe` | `El destino seleccionado no existe` |
| `La zona es obligatoria` | `El destino es obligatorio` |
| `La zona debe ser un identificador numérico` | `El destino debe ser un identificador numérico` |
| `Ya existe una tarifa para esa zona, ese producto y ese combustible desde ese precio` | `Ya existe una tarifa para ese destino, ese producto y ese combustible desde ese precio` |
| `No existe tarifa cotizada para ese producto en esa zona` | `No existe tarifa cotizada para ese producto en ese destino` |

### Las tarifas existentes se borraron

La migración **vació la tabla `freight_rates`**: no hubo backfill y no lo habrá. Una zona es un polígono y no tiene un punto que la represente, así que cualquier destino inventado para conservarlas habría sido un dato fabricado en la tabla que decide precios. **La tabla de precios se recaptura a mano.**

### El dominio de zonas sigue vivo

`GET /api/zones` y sus seis endpoints **no cambiaron nada**, incluido el filtro `?lat=&lng=`. Lo único que perdieron es su papel en las tarifas: a partir de aquí **las zonas se dibujan en el mapa y no cotizan nada**. No están deprecadas y no se van a borrar. Ver `references/zones-api.md`.

### Migración del front, en orden

- [ ] Sustituir el filtro `zoneId` por `locationId` en el listado de tarifas (**silencioso si se olvida**).
- [ ] Sustituir `lat`+`lng` por `locationId` en la cotización.
- [ ] Cambiar `zoneId`/`zoneName` por `locationId`/`locationName` al leer las respuestas.
- [ ] Cambiar `zoneId` por `locationId` en los cuerpos de alta y edición de tarifas.
- [ ] Borrar el manejo del 404 de `/quote`: ya no puede ocurrir.
- [ ] Sustituir el selector de punto en el mapa por un **selector de destino** alimentado por `GET /api/locations?status=true`.
- [ ] Recapturar la tabla de precios: la anterior ya no existe.

---

## 11. ⚠️ Cambio incompatible en `POST /api/locations`

El campo **`type`** pasó a ser obligatorio en el alta. Es un cambio incompatible asumido a propósito, **sin periodo de gracia y sin valor por defecto por la API**.

### Qué se rompe exactamente

Solo el alta. Estos cinco endpoints **no** cambian de contrato: `GET /api/locations` (gana un filtro opcional), `GET /api/locations/{location}`, `PATCH /api/locations/{location}` (gana un campo opcional), `PATCH .../toggle-status` y `DELETE`. Los tres últimos ni siquiera cambian de forma.

| | Antes | Ahora |
|---|---|---|
| Campos obligatorios del alta | 4 (`name`, `googlePlaceId`, `latitude`, `longitude`) | **5** (+ `type`) |
| Alta sin `type` | 201 | **422** · `El tipo de destino es obligatorio` |
| Claves del objeto `Location` | 10 | **11** |
| Filtros del listado | 3 (`status`, `search`, `limit`) | **4** (+ `type`) |
| Campos editables del `PATCH` | 6 | **7** |

### Por qué no se dejó opcional

La columna nace con `default 'destination'` en base de datos, pero ese default existe **para las filas ya migradas, no para que el front siga sin decidir**. Si el alta lo aceptase omitido, todo destino nuevo nacería `destination` por inercia y los puertos se capturarían mal desde el primer día — que es justo el problema que el campo viene a resolver.

### Qué hacer, en orden

- [ ] Añadir el selector de tipo al formulario de alta (`Puerto` → `"port"`, `Destino` → `"destination"`), mandando el valor **crudo, en minúsculas**.
- [ ] Coordinar el despliegue del front con el del backend: **en cuanto el backend suba, un front sin `type` no puede dar de alta ningún destino**.
- [ ] Añadir el selector también al formulario de edición (opcional ahí, pero es donde se reclasifican los puertos existentes).
- [ ] Mapear `errors.type` a ese campo del formulario, con sus dos mensajes literales.
- [ ] Añadir `type` al modelo/tipo del cliente: es la clave número 11 del objeto.
- [ ] Si tienes una pantalla de puertos, contar con que el filtro `?type=port` devuelve `[]` hasta que se reclasifiquen a mano.

### Lo que **no** hay que tocar

Nada de cotización. `GET /api/freight-rates/quote` acepta los mismos parámetros y devuelve la misma forma que antes; **su respuesta no incluye `type`**. Crear o editar una tarifa sobre un puerto funciona exactamente igual que sobre cualquier otro destino, y `resolveBand()` no mira la etiqueta. Si tu código de tarifas no cambia, es porque no tiene que cambiar.

### Los destinos que ya existían

Todos quedaron como `"destination"`, sin excepción y sin backfill inteligente: la migración no intentó adivinar cuáles eran puertos por el nombre. **Reclasificarlos es un `PATCH` a mano por cada uno**, y hasta que alguien lo haga el catálogo dirá que no hay ni un solo puerto.
