# Puntos de partida — referencia de integración para el frontend

Referencia completa del dominio **Departure Points** de la API de Legumex Transportes: seis endpoints REST bajo `/api/departure-points` para gestionar el catálogo nacional de puntos de partida — bodegas, plantas, fincas y centros de acopio **de donde sale** un viaje, anclados a un lugar real de Google Places.

Todo lo que hay aquí está verificado contra la implementación real (Laravel 13) y contra su suite de tests. Los mensajes de error son literales: se pueden mostrar tal cual al usuario.

> Documentación OpenAPI viva: `/api/documentation`.

---

## 0. ANTES DE NADA: este dominio no es `/api/locations`

Son **dos catálogos distintos con la misma forma exacta**, y confundirlos es el error más probable y más silencioso de esta integración:

| | `/api/departure-points` | `/api/locations` |
|---|---|---|
| Qué es | **De dónde sale** el viaje | **A dónde llega** el viaje |
| Tabla | `departure_points` | `locations` |
| Tarifas de flete | **ninguna** | es el eje de `FreightRate` |
| Se cotiza en `/quote` | **no** | sí, con `locationId` |

Los dos endpoints devuelven **las mismas diez claves** con los mismos tipos y aceptan **el mismo cuerpo**. Pedirle puntos de partida al catálogo equivocado **no falla**: responde 200 con datos plausibles del otro dominio, y el usuario ve una lista que no esperaba.

**Los `id` de las dos tablas NO son intercambiables.** Son secuencias independientes: no hay ninguna relación entre el `id: 3` de aquí y el `id: 3` de allá. No existe ninguna FK que detenga el error — si guardas un id de punto de partida donde se espera un destino, apuntará a otra fila real.

Recomendación concreta: no compartas el mismo tipo TypeScript ni el mismo cliente HTTP entre los dos dominios, aunque el compilador te deje. Usa tipos con marca (`DeparturePointId` vs `LocationId`) para que el propio compilador impida cruzarlos.

---

## 1. Lo mínimo que hay que saber antes de escribir código

1. **Los dos duplicados posibles responden con códigos distintos, y es deliberado.** Un `name` repetido es **422** (formato de validación de Laravel). Un `googlePlaceId` repetido es **400** (sobre normal), y su mensaje **nombra al punto que ya ocupa ese lugar** — que es lo único que le dice al usuario dónde mirar. El formulario tiene que manejar los dos formatos.
2. **El `name` se normaliza y vuelve cambiado.** Se recorta, se colapsan los espacios internos y se pasa a MAYÚSCULAS: mandar `"  bodega   central "` guarda y devuelve `"BODEGA CENTRAL"`. Pinta siempre el `name` de la respuesta, nunca el que tecleó el usuario.
3. **`latitude` y `longitude` viajan como CADENAS de ocho decimales** (`"14.63490000"`), no como números JSON. Hay que parsearlas antes de operar con ellas o de pasarlas a un mapa.
4. **`createdAt` y `updatedAt` NO son ISO 8601**, sino `d-m-Y h:i:s A` (`"25-08-2026 09:14:03 AM"`). `new Date(...)` sobre ese texto devuelve `Invalid Date`.
5. **Toda respuesta viaja en un sobre** `{ statusCode, message, data }`… **salvo el 422 de validación**, que usa el formato estándar de Laravel `{ message, errors }`. Son dos formas distintas y el cliente debe distinguirlas.
6. **`DELETE` no borra.** Es una baja lógica idempotente: pone `status: false` y la fila **sigue apareciendo** en el listado.
7. **Escribir es solo de `administrator`.** Leer lo puede hacer cualquier usuario autenticado.
8. **La API nunca llama a Google.** El front busca en `GET /api/places`, el usuario elige, y el alta manda `googlePlaceId` y coordenadas **ya resueltos**. Nadie verifica que el pin corresponda al place id.

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

Los puntos de partida son un dato **nacional de Legumex**: no pertenecen a ninguna empresa transportista. No hay `carrierId`, no hay filtrado por empresa, y un `carrier` que todavía no ha registrado su empresa también puede leerlos — **ninguna ruta de este dominio lleva el middleware `carrier.required`**.

Un rol sin permiso de escritura recibe **403**:

```json
{ "statusCode": 403, "message": "No tienes permisos para acceder a este recurso", "data": null }
```

No existe el 403 «recurso ajeno» que sí tienen Vehicles o Carriers: aquí no hay ámbito por empresa. O el id existe y se devuelve, o es 404.

---

## 3. El objeto `DeparturePoint`

```json
{
  "id": 1,
  "name": "BODEGA CENTRAL ESCUINTLA",
  "description": "Entrada por el km 58, portón de carga 2",
  "googlePlaceId": "ChIJd8BlQ2BZwokRAFUEcm_qrcA",
  "latitude": "14.63490000",
  "longitude": "-90.50690000",
  "status": true,
  "registeredByName": "Roberto Santizo",
  "createdAt": "25-08-2026 09:14:03 AM",
  "updatedAt": "25-08-2026 09:14:03 AM"
}
```

Diez claves, **siempre las diez**, en camelCase. Ninguna se omite: las que no tienen valor viajan como `null`.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `number` | `departure_points.id`. Es el valor del parámetro `{departurePoint}` de las rutas. **No es intercambiable con un `locations.id`.** Sobrevive a la baja lógica y a un cambio de `googlePlaceId`. |
| `name` | `string` | **Siempre en MAYÚSCULAS** y con los espacios internos colapsados. Único dentro de esta tabla; al estar siempre en mayúsculas, la unicidad resulta insensible a mayúsculas. Es el nombre que aparece en el mensaje de error 400 cuando otra alta intenta reutilizar su `googlePlaceId`. |
| `description` | `string \| null` | **Único campo que puede ser `null`.** Sin longitud máxima (columna `text`). **No participa en el filtro `search`**, que solo mira el `name`. |
| `googlePlaceId` | `string` | Place id de Google, guardado **tal cual llega**: no se recorta, no se normaliza y **es sensible a mayúsculas**. Único dentro de esta tabla. Editable. Se obtiene de `GET /api/places`. |
| `latitude` | `string` | **CADENA**, no número. Ocho decimales, rango `[-90, 90]`. Sirve para pintar el pin. |
| `longitude` | `string` | **CADENA**, no número. Ocho decimales, rango `[-180, 180]`. |
| `status` | `boolean` | `true` = publicado, `false` = dado de baja. La baja es **lógica**: la fila nunca desaparece. **Desactivar un punto no bloquea nada** en el resto de la API. |
| `registeredByName` | `string \| null` | **Nombre** del administrador que lo capturó, ya resuelto. No viaja el id ni el objeto usuario. No se reescribe al editar. |
| `createdAt` | `string` | Formato `d-m-Y h:i:s A`. **No es ISO 8601.** |
| `updatedAt` | `string` | Formato `d-m-Y h:i:s A`. **No es ISO 8601.** |

### Tipos TypeScript sugeridos

```ts
/** Marca para que el compilador impida pasar un LocationId donde va un DeparturePointId. */
export type DeparturePointId = number & { readonly __brand: 'DeparturePointId' };

export interface DeparturePoint {
  id: DeparturePointId;
  name: string;
  description: string | null;
  googlePlaceId: string;
  /** Cadena decimal de 8 decimales: parsear con Number() antes de usar en un mapa. */
  latitude: string;
  longitude: string;
  status: boolean;
  registeredByName: string | null;
  /** Formato d-m-Y h:i:s A — NO parsear como ISO 8601. */
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeparturePointBody {
  name: string;
  description?: string | null;
  googlePlaceId: string;
  latitude: number;
  longitude: number;
}

/** Todos opcionales por separado. `description: null` BORRA la descripción. */
export interface UpdateDeparturePointBody {
  name?: string;
  description?: string | null;
  googlePlaceId?: string;
  latitude?: number;
  longitude?: number;
  status?: boolean;
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

/** Las coordenadas llegan como cadena; conviértelas en el borde del cliente. */
export const toLatLng = (p: DeparturePoint): [number, number] =>
  [Number(p.latitude), Number(p.longitude)];
```

---

## 4. Formato de las respuestas

### Éxito

```json
{ "statusCode": 200, "message": "Puntos de partida obtenidos correctamente", "data": {} }
```

### Listado sin paginar (sin `limit`)

`data` es el array completo y **no hay** metadatos de paginación:

```json
{
  "statusCode": 200,
  "message": "Puntos de partida obtenidos correctamente",
  "data": []
}
```

### Listado paginado (con `limit` numérico)

Los metadatos se aplanan **en la raíz** del sobre, **no** bajo `meta`:

```json
{
  "statusCode": 200,
  "message": "Puntos de partida obtenidos correctamente",
  "data": [],
  "total": 42,
  "currentPage": 1,
  "lastPage": 5
}
```

### Error de negocio (401, 403, 404, 400)

```json
{ "statusCode": 404, "message": "El punto de partida no existe", "data": null }
```

### Error de validación (422) — **formato distinto**

No lleva `statusCode` ni `data`:

```json
{
  "message": "El nombre del punto de partida es obligatorio (and 1 more error)",
  "errors": {
    "name": ["El nombre del punto de partida es obligatorio"],
    "latitude": ["La latitud debe estar entre -90 y 90"]
  }
}
```

Las claves de `errors` son los nombres de los campos **en camelCase, tal como se envían** (`googlePlaceId`, no `google_place_id`).

---

## 5. Endpoints

### 5.1 `GET /api/departure-points` — listar

Abierto a los cuatro roles. Orden **fijo**: `id` ascendente (el orden de alta). No hay `sortBy` ni `sortDir`.

| Query param | Valores | Comportamiento |
|---|---|---|
| `status` | `true`, `false`, `1`, `0` | Filtra por publicación. **Cualquier otro valor se ignora en silencio** y devuelve ambos estados: nunca provoca 422. |
| `search` | texto | Búsqueda parcial sobre el **nombre** (`LIKE %TERM%`). El término se normaliza igual que el `name`, así que es **insensible a mayúsculas**: `bode` y `BODE` encuentran ambas `BODEGA CENTRAL`. En blanco o solo espacios **se ignora**. No busca en la descripción ni en el `googlePlaceId`. |
| `limit` | entero | **Su presencia es lo que activa la paginación.** Si se omite o no es numérico (`limit=abc`), devuelve todos los registros sin metadatos. Si es numérico se **acota a `[10, 100]`**: `limit=1` devuelve páginas de **10** y `limit=500`, de **100**. |

⚠️ **El listado devuelve activos e inactivos mezclados por defecto.** Como la baja es lógica, lo dado de baja sigue apareciendo con `status: false`. Para quedarte solo con lo publicado hay que mandar `status=true` explícitamente.

Un filtro sin coincidencias devuelve **200** con `data: []`, nunca 404. Un catálogo vacío, también.

- **200** — `Puntos de partida obtenidos correctamente`
- **401** — sin token

### 5.2 `POST /api/departure-points` — crear

Solo `administrator`.

```json
{
  "name": "bodega central escuintla",
  "description": "Entrada por el km 58, portón de carga 2",
  "googlePlaceId": "ChIJd8BlQ2BZwokRAFUEcm_qrcA",
  "latitude": 14.6349,
  "longitude": -90.5069
}
```

| Campo | Reglas |
|---|---|
| `name` | **Obligatorio.** Texto, máx. 255. Se normaliza antes de validarse; el duplicado es **422**. |
| `description` | **Opcional y nullable.** Omitirla o mandar `null` guarda `null`. Sin longitud máxima. |
| `googlePlaceId` | **Obligatorio.** Texto, máx. 255. Se guarda tal cual. El duplicado es **400**, no 422. |
| `latitude` | **Obligatoria.** Numérica, en `[-90, 90]`. |
| `longitude` | **Obligatoria.** Numérica, en `[-180, 180]`. |

**`status` y `registeredBy` no se aceptan.** Mandarlos **no da error**: se descartan en silencio. El punto **nace siempre activo** (`status: true`) y el autor sale del token. No hay forma de crear un punto ya dado de baja.

**Sin validación cruzada contra `locations`:** un `name` o un `googlePlaceId` que ya existan como destino responden **201** sin ningún aviso. La unicidad es **por tabla**.

**Sin validación contra Google:** un place id inventado con el formato correcto se acepta, y nadie comprueba que las coordenadas correspondan al lugar.

- **201** — `Punto de partida registrado correctamente`
- **400** — `El lugar seleccionado ya está registrado en el punto de partida BODEGA CENTRAL ESCUINTLA` (único 400 del alta)
- **401** / **403** / **422**

### 5.3 `GET /api/departure-points/{departurePoint}` — detalle

Abierto a los cuatro roles. Un punto con `status: false` **se obtiene con toda normalidad**: la baja lógica no lo oculta en ninguna lectura.

No hay consulta por `googlePlaceId` ni por nombre: para eso está el filtro `search` del listado.

- **200** — `Punto de partida obtenido correctamente`
- **401**
- **404** — `El punto de partida no existe`

### 5.4 `PATCH /api/departure-points/{departurePoint}` — editar

Solo `administrator`. Acepta también `PUT`, con idéntico comportamiento (el `PUT` **no** reemplaza el recurso).

**Todos los campos son opcionales por separado** y solo se toca lo que venga. Un **cuerpo vacío responde 200** como no-op, no 422.

| Campo | Notas |
|---|---|
| `name` | Se normaliza. La unicidad **ignora la propia fila**: reenviar su mismo nombre es 200. El de otro punto es 422. Mandar `null` **no** lo borra: es 422. |
| `description` | **Único campo que acepta `null`, y ese `null` BORRA la descripción.** Omitir la clave la deja intacta. Son dos cosas distintas. |
| `googlePlaceId` | **Editable.** Reapuntar el punto a otro lugar conserva la fila y su `id`. La comprobación ignora la propia fila. Duplicado de otro punto → **400**. |
| `latitude` / `longitude` | Corregibles sueltas. |
| `status` | Aquí **sí** se acepta: `false` da de baja (igual que el `DELETE`) y `true` reactiva (igual que el toggle). |

⚠️ **No hay validación cruzada entre `googlePlaceId` y las coordenadas.** Cambiar solo el place id responde **200** y deja el pin apuntando al lugar anterior, **sin ningún aviso**. Si reapuntas el lugar, manda también las coordenadas nuevas en el mismo PATCH.

**`registeredBy` no se reescribe**: el punto conserva a quien lo dio de alta aunque lo edite otro administrador.

- **200** — `Punto de partida actualizado correctamente`
- **400** / **401** / **403** / **404** / **422**

### 5.5 `PATCH /api/departure-points/{departurePoint}/toggle-status` — invertir estado

Solo `administrator`. Sin cuerpo. Invierte el `status` en ambas direcciones, así que es también la vuelta atrás de un `DELETE`.

Se solapa a propósito con el campo `status` del PATCH: el toggle sirve al interruptor de una tabla y el campo, al formulario de edición.

- **200** — `Estado del punto de partida actualizado correctamente`
- **401** / **403** / **404**

### 5.6 `DELETE /api/departure-points/{departurePoint}` — dar de baja

Solo `administrator`. **No borra nada:** pone `status: false` y devuelve el punto ya modificado.

Es **idempotente**: un segundo `DELETE` sobre el mismo punto responde 200 y lo deja igual, sin error.

⚠️ **La fila sigue apareciendo en el listado sin filtros.** Refresca la tabla contando con eso: no la quites del DOM.

**Dar de baja un punto no bloquea nada** en el resto de la API: de él no cuelga ninguna tarifa y ninguna otra tabla lo referencia.

- **200** — `Punto de partida dado de baja correctamente`
- **401** / **403** / **404**

---

## 6. Tabla de mensajes de error (literales)

Se pueden mostrar tal cual al usuario; ya están en español.

| Campo | Mensaje |
|---|---|
| `name` | `El nombre del punto de partida es obligatorio` · `El nombre del punto de partida debe ser texto` · `El nombre del punto de partida no puede superar los 255 caracteres` · `Ya existe un punto de partida con ese nombre` |
| `description` | `La descripción debe ser texto` |
| `googlePlaceId` | `El lugar de Google es obligatorio` · `El lugar de Google debe ser texto` · `El lugar de Google no puede superar los 255 caracteres` |
| `latitude` | `La latitud es obligatoria` · `La latitud debe ser numérica` · `La latitud debe estar entre -90 y 90` |
| `longitude` | `La longitud es obligatoria` · `La longitud debe ser numérica` · `La longitud debe estar entre -180 y 180` |
| `status` | `El estado debe ser verdadero o falso` (solo en el PATCH) |

Errores de sobre:

| Código | Mensaje |
|---|---|
| **400** | `El lugar seleccionado ya está registrado en el punto de partida {NOMBRE}` |
| **401** | `El token de sesión no es válido o ha expirado` |
| **403** | `No tienes permisos para acceder a este recurso` |
| **404** | `El punto de partida no existe` |

⚠️ Ojo con el par `name` / `googlePlaceId`: el primero llega dentro de `errors` (422) y el segundo dentro de `message` (400). Un formulario que solo lea `errors` **se comerá el error del lugar duplicado en silencio**.

---

## 7. Checklist de implementación en el frontend

- [ ] Cliente HTTP que adjunta `Authorization: Bearer` y `Accept: application/json` en las seis llamadas.
- [ ] **Tipos separados de los de `/api/locations`**, aunque la forma sea idéntica; ids con marca para que el compilador impida cruzarlos.
- [ ] Manejo **de dos formatos de error**: sobre `{statusCode, message, data}` para 401/403/404/**400** y `{message, errors}` para 422.
- [ ] El 400 del `googlePlaceId` duplicado se muestra junto al selector de lugar, no en un toast genérico: su mensaje nombra al punto que ya lo ocupa.
- [ ] Flujo de alta encadenado: `GET /api/places?search=` → el usuario elige → mandar `name`, `googlePlaceId`, `latitude`, `longitude` ya resueltos. **No llamar a Google desde el front al guardar**, solo al buscar.
- [ ] Al reapuntar el `googlePlaceId` en la edición, mandar **también** las coordenadas nuevas en el mismo PATCH.
- [ ] Coordenadas: `Number(latitude)` / `Number(longitude)` antes de pasarlas a un mapa; no asumir `number` en el tipo.
- [ ] Fechas: mostrar `createdAt`/`updatedAt` como texto plano; **no** parsearlas como ISO.
- [ ] Mostrar el `name` **de la respuesta** (normalizado, en mayúsculas), no el tecleado.
- [ ] Distinguir en el formulario de edición «omitir `description`» de «mandar `description: null`»: lo segundo borra.
- [ ] No mandar `status` en el alta (se ignora); usarlo solo en la edición.
- [ ] Listado: paginación leyendo `total`/`currentPage`/`lastPage` **de la raíz**; recordar que `limit=5` devuelve páginas de 10 y `limit=500`, de 100.
- [ ] Listado: mandar `status=true` si la pantalla solo debe mostrar lo publicado; por defecto vienen mezclados.
- [ ] Baja lógica: la fila **no desaparece** tras el `DELETE`; refleja `status` con un estado visual y ofrece reactivar con el toggle.
- [ ] Ocultar o deshabilitar las acciones de escritura para los roles que no son `administrator` (el 403 del servidor es la red, no la UX).

---

## 8. Lo que este dominio **no** hace (para no diseñarlo en el front)

- **No cotiza nada.** No hay tarifas por punto de partida, no hay par origen-destino y `GET /api/freight-rates/quote` **no cambió**: sigue aceptando `locationId`, `productId`, `fuelType` y `pounds`, y no conoce esta tabla.
- **No calcula distancias, kilometraje, tiempo estimado ni rutas** entre un punto de partida y un destino. La API no llama a Directions.
- **No cruza nada con `locations`.** El mismo lugar puede estar en las dos tablas y nadie avisa.
- **No verifica contra Google** que las coordenadas correspondan al `googlePlaceId`.
- **No hay filtro por cercanía** (`?lat=&lng=`), ni radio, ni geometría, ni PostGIS: esta tabla no tiene columnas espaciales.
- **No hay vínculo con empresas, vehículos ni gastos.** Ninguna tabla apunta a `departure_points`.
- **No hay horarios de carga, código de bodega, contacto ni responsable** como campos: lo que haga falta se teclea en `description`.
- **No hay borrado real, ni papelera, ni bitácora de cambios.** Editar pisa el valor anterior sin dejar rastro.
- **No hay alta en lote** ni importación desde archivo.
- **No hay adjuntos** (foto del portón, croquis): este dominio no sube archivos.
- **No hay orden configurable** (`sortBy`, `sortDir`) ni filtros por rango de fechas o por autor del alta.
