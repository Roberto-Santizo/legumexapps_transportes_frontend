# Zonas geográficas — referencia de integración para el frontend

Referencia completa del dominio **Zones** de la API de Legumex Transportes: seis endpoints REST bajo `/api/zones` para gestionar zonas geográficas nacionales dibujadas como polígonos sobre un mapa.

Todo lo que hay aquí está verificado contra la implementación real (Laravel 13 + PostGIS) y contra su suite de tests. Los mensajes de error son literales: se pueden mostrar tal cual al usuario.

> Documentación OpenAPI viva: `/api/documentation`.

---

## 1. Lo mínimo que hay que saber antes de escribir código

1. **El polígono viaja como `[latitud, longitud]`, no como `[longitud, latitud]`.** Es lo contrario de GeoJSON, Mapbox y turf, y coincide con `L.latLng` de Leaflet. Invertir el par es el error más caro de este dominio: si un valor queda fuera de rango la API responde 422, pero si los dos valores son plausibles **la zona se guarda en el lugar equivocado sin ningún error**.
2. **El anillo va abierto.** Se envían N puntos y se reciben exactamente esos N puntos, sin repetir el primero al final. No cierres el polígono tú: el backend lo hace.
3. **Toda respuesta viaja en un sobre** `{ statusCode, message, data }`… **salvo el 422 de validación**, que usa el formato estándar de Laravel `{ message, errors }`. Son dos formas distintas y el cliente debe distinguirlas.
4. **`DELETE` no borra.** Es una baja lógica: pone `status: false` y la fila sigue apareciendo en el listado.
5. **Escribir es solo de `administrator`.** Leer lo puede hacer cualquier usuario autenticado.

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

Las zonas son un dato **nacional de Legumex**: no pertenecen a ninguna empresa transportista. No hay `carrierId`, no hay filtrado por empresa, y un `carrier` que todavía no ha registrado su empresa también puede leerlas (a diferencia de otros dominios, aquí no actúa el middleware `carrier.required`).

Un rol sin permiso de escritura recibe **403**:

```json
{ "statusCode": 403, "message": "No tienes permisos para acceder a este recurso", "data": null }
```

---

## 3. El objeto `Zone`

Es lo que devuelve `data` en los seis endpoints (o cada elemento de `data` en el listado). Nueve claves, siempre en camelCase y siempre en este orden:

```json
{
  "id": 1,
  "name": "ZONA NORTE",
  "description": "Cobertura del norte del área metropolitana",
  "color": "#3388FF",
  "area": [[14.6349, -90.5069], [14.6402, -90.4998], [14.6281, -90.4931]],
  "status": true,
  "registeredByName": "Roberto Santizo",
  "createdAt": "13-08-2026 09:27:43 PM",
  "updatedAt": "13-08-2026 09:27:43 PM"
}
```

| Campo | Tipo | Notas para el front |
|---|---|---|
| `id` | `number` | Es el `{zone}` de las rutas de detalle, edición, toggle y baja. |
| `name` | `string` | **Siempre en MAYÚSCULAS.** El backend normaliza: recorta, colapsa espacios internos y pasa a mayúsculas. Pinta lo que devuelve la respuesta, no lo que tecleó el usuario. |
| `description` | `string \| null` | Único campo que puede ser `null`. Máx. 1000 caracteres. |
| `color` | `string` | Hex `#RRGGBB` en mayúsculas. **Nunca `null`**: sin color, la zona nace con `#3388FF` (el azul por defecto de Leaflet). Es pura presentación, sin semántica de negocio. |
| `area` | `[number, number][]` | Pares `[lat, lng]`, anillo **abierto**, mínimo 3. Ver §4. |
| `status` | `boolean` | Booleano JSON de verdad, nunca `1`/`0` ni `"true"`. `false` = dada de baja. |
| `registeredByName` | `string \| null` | Nombre del administrador que la dio de alta. No se envía nunca en el body: sale del token. Editar la zona **no** lo reescribe. |
| `createdAt` / `updatedAt` | `string \| null` | ⚠️ **No es ISO 8601.** Formato propio `d-m-Y h:i:s A` (`13-08-2026 09:27:43 PM`). Está pensado para mostrarse tal cual; `new Date(...)` sobre él no funciona. |

### Tipos TypeScript sugeridos

```ts
/** Par [latitud, longitud]. La latitud va PRIMERO. */
export type LatLngPair = [number, number];

export interface Zone {
  id: number;
  name: string;
  description: string | null;
  color: string;
  /** Anillo abierto: el primer punto NO se repite al final. */
  area: LatLngPair[];
  status: boolean;
  registeredByName: string | null;
  /** Formato 'd-m-Y h:i:s A', no ISO 8601. */
  createdAt: string | null;
  updatedAt: string | null;
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

## 4. El polígono: `[lat, lng]` con anillo abierto

Es la única parte del dominio que necesita cuidado real.

**Lo que se envía y lo que se recibe es idéntico.** Si mandas 3 puntos, `GET` te devuelve esos mismos 3 puntos, en el mismo orden, sin un cuarto punto de cierre:

```json
"area": [[14.6349, -90.5069], [14.6402, -90.4998], [14.6281, -90.4931]]
```

Internamente PostGIS guarda `POLYGON((-90.5069 14.6349, -90.4998 14.6402, -90.4931 14.6281, -90.5069 14.6349))` —longitud primero y con el punto de cierre repetido—, pero **eso no sale nunca de la API**. El cliente no debe conocer ese formato.

### Reglas de validación

- Mínimo **3** pares. Menos → 422.
- Cada par debe tener **exactamente 2** números. Uno de 3 elementos → 422.
- Latitud (primer elemento) en `[-90, 90]`; longitud (segundo) en `[-180, 180]`.
- Sin tope de vértices: un trazado a mano alzada con miles de puntos se acepta (ojo con el tamaño del payload).
- **No se valida** que el polígono no se auto-intersecte ni que no solape con otras zonas. Dos zonas pueden cruzarse: es intencionado.

### Interoperar con Leaflet

Leaflet usa `[lat, lng]` igual que esta API, así que **no hay conversión**:

```ts
// Pintar
L.polygon(zone.area, { color: zone.color }).addTo(map);

// Leer del editor de dibujo (Leaflet.draw / Geoman)
const area: LatLngPair[] = layer
  .getLatLngs()[0]                       // primer (y único) anillo
  .map(({ lat, lng }) => [lat, lng]);    // ya viene abierto
```

### Interoperar con GeoJSON / Mapbox / turf

Ahí el orden **sí** se invierte y el anillo **sí** se cierra:

```ts
const toGeoJson = (area: LatLngPair[]) => ({
  type: 'Polygon' as const,
  coordinates: [[...area.map(([lat, lng]) => [lng, lat]), [area[0][1], area[0][0]]]],
});

const fromGeoJson = (ring: [number, number][]): LatLngPair[] =>
  ring.slice(0, -1).map(([lng, lat]) => [lat, lng]); // descarta el punto de cierre
```

> Recomendación fuerte: centraliza estas dos funciones en un solo módulo del front y no conviertas coordenadas en ningún otro sitio. Es exactamente lo que hace el backend, y por la misma razón.

### `area: []` en una respuesta

Significa **fallo de carga en el backend**, no una zona sin geometría (la columna es obligatoria). Si aparece, repórtalo como bug; no lo trates como estado válido.

---

## 5. Formato de las respuestas

### Éxito

```json
{ "statusCode": 200, "message": "Zonas obtenidas correctamente", "data": { ... } }
```

### Listado sin paginar (sin `limit`)

`data` es el array completo y **no hay** metadatos de paginación:

```json
{ "statusCode": 200, "message": "Zonas obtenidas correctamente", "data": [ /* Zone[] */ ] }
```

### Listado paginado (con `limit` numérico)

Los metadatos se aplanan **en la raíz** del sobre, **no** bajo `meta`:

```json
{
  "statusCode": 200,
  "message": "Zonas obtenidas correctamente",
  "data": [ /* Zone[] */ ],
  "total": 2,
  "currentPage": 1,
  "lastPage": 1
}
```

### Error de negocio (401, 403, 404, 400)

```json
{ "statusCode": 404, "message": "La zona no existe", "data": null }
```

### Error de validación (422) — **formato distinto**

No lleva `statusCode` ni `data`. Las claves de `errors` para el polígono usan la ruta del campo, `area.{índice}.{0|1}`, donde `0` es la latitud y `1` la longitud:

```json
{
  "message": "El nombre de la zona es obligatorio (and 3 more errors)",
  "errors": {
    "name": ["El nombre de la zona es obligatorio"],
    "color": ["El color debe ser hexadecimal con el formato #RRGGBB"],
    "area": ["El área debe tener al menos 3 puntos"],
    "area.1.0": ["La latitud del punto 2 debe estar entre -90 y 90"]
  }
}
```

Los mensajes ya vienen en español y numeran el punto **empezando en 1** (`area.1.0` → «punto 2»). Para pintar el error junto al vértice correspondiente en un editor de mapa, parsea el índice de la clave, no del mensaje.

---

## 6. Endpoints

### 6.1 `GET /api/zones` — listar

Cualquier autenticado. Devuelve **activas e inactivas mezcladas** salvo que se filtre. Orden fijo `id ASC`, no configurable.

| Query param | Tipo | Comportamiento |
|---|---|---|
| `status` | `true\|false\|1\|0` | Filtra por publicación. Cualquier valor no booleano se **ignora en silencio** (200, nunca 422). |
| `search` | `string` | `LIKE %término%` sobre el nombre, **insensible a mayúsculas** (`nor` y `NOR` encuentran `ZONA NORTE`). En blanco se ignora. Solo busca por nombre. |
| `lat` + `lng` | `number` | Devuelve las zonas que **contienen** ese punto. Ver abajo. |
| `limit` | `number` | Activa la paginación. Se acota a `[10, 100]`: `limit=5` → páginas de 10; `limit=500` → páginas de 100. Ausente o no numérico → colección completa sin metadatos. |
| `page` | `number` | Solo tiene efecto con un `limit` numérico. |

Los cuatro filtros se combinan entre sí y **son tolerantes**: nada de lo que llegue mal produce un 422 aquí.

**Filtro punto-en-zona (`lat` + `lng`)**

- Solo se aplica si llegan **los dos**, ambos numéricos y en rango. Si falta uno, o `lat=200`, el filtro **se ignora entero** y el listado sale completo, sin error.
- Puede devolver **varias zonas**: el solape está permitido. Por eso es un filtro del listado y no un endpoint que devuelve una zona.
- Si ninguna zona contiene el punto: **200 con `data: []`**, nunca 404.
- No aplica `status` implícitamente: sin `status=true` también salen zonas dadas de baja que contengan el punto.

```
GET /api/zones?lat=14.6349&lng=-90.5069&status=true&limit=10
```

Respuestas: **200** · **401**.

---

### 6.2 `POST /api/zones` — crear

Solo `administrator`.

```json
{
  "name": "zona norte",
  "description": "Cobertura del norte del área metropolitana",
  "color": "#ff0000",
  "area": [[14.6349, -90.5069], [14.6402, -90.4998], [14.6281, -90.4931]]
}
```

| Campo | Obligatorio | Reglas |
|---|:--:|---|
| `name` | ✅ | Máx. 255. Se normaliza a mayúsculas **antes** de comprobar unicidad, que es global. |
| `description` | — | Máx. 1000, admite `null`. |
| `color` | — | `#RRGGBB`. Se normaliza a mayúsculas (`#ff0000` → `#FF0000`). Si no llega: `#3388FF`. |
| `area` | ✅ | Mínimo 3 pares `[lat, lng]`, anillo abierto. |

`status` y `registeredBy` **no se aceptan**: la zona nace `true` y la autoría sale del token. Mandarlos no tiene efecto.

Respuesta **201**: `{ statusCode: 201, message: "Zona registrada correctamente", data: Zone }`.

Otras: **401** · **403** · **422** (nombre repetido —incluido mandar `zona norte` existiendo `ZONA NORTE`—, color inválido, polígono mal formado).

---

### 6.3 `GET /api/zones/{zone}` — detalle

Cualquier autenticado. Una zona dada de baja se obtiene con normalidad (200): la baja es lógica y no oculta nada.

Respuestas: **200** (`"Zona obtenida correctamente"`) · **401** · **404** (`"La zona no existe"`).

---

### 6.4 `PATCH /api/zones/{zone}` — editar

Solo `administrator`. La ruta acepta `PATCH` y `PUT` indistintamente; el comportamiento es el mismo (edición parcial en ambos casos).

Los **cinco** campos son opcionales por separado: `name`, `description`, `color`, `status`, `area`. Solo se toca lo que venga.

```json
{ "name": "zona norte ampliada", "status": false }
```

Reglas y trampas:

- **Body vacío `{}` → 200 sin cambios.** Es un no-op deliberado, no un error.
- `area`, si viene, **sustituye el polígono entero**. No hay edición de vértices sueltos: para mover un punto se manda el array completo. El trazado anterior no se guarda en ningún sitio.
- `name` se revalida ignorando la propia fila: reenviar su mismo nombre da 200; el de otra zona da 422.
- `description: null` **borra** la descripción. Omitir la clave la deja como está.
- ⚠️ **`color: null` NO es válido** → 422 `"El color debe ser texto"`. Asimetría real con `description`. Si tu formulario manda el objeto completo, no envíes `color: null`: omite la clave o manda un hex.
- `registeredByName` no cambia nunca; `updatedAt` sí.

Respuestas: **200** (`"Zona actualizada correctamente"`) · **401** · **403** · **404** · **422**.

---

### 6.5 `PATCH /api/zones/{zone}/toggle-status` — invertir estado

Solo `administrator`. **No lleva body.** Invierte `status`: `true` → `false` y al revés.

No es idempotente por diseño: dos llamadas seguidas devuelven la zona a su estado inicial. Es lo que necesita el interruptor de una tabla, que no tiene por qué saber el estado actual. Si quieres fijar un estado concreto, usa `PATCH` con `status`.

Respuestas: **200** (`"Estado de la zona actualizado correctamente"`, con la fila ya invertida en `data`) · **401** · **403** · **404**.

---

### 6.6 `DELETE /api/zones/{zone}` — dar de baja

Solo `administrator`. ⚠️ **No borra nada**: pone `status: false`.

- La fila **sigue apareciendo** en `GET /api/zones` sin filtros. Para excluirla hay que pedir `status=true`.
- Sigue siendo consultable por id (200) y sigue saliendo en el filtro `lat`+`lng`.
- Es **idempotente**: repetir el `DELETE` sobre una zona ya inactiva responde 200 otra vez, sin error.
- Es reversible con `toggle-status` o con `PATCH` y `status: true`. No existe borrado real por ninguna vía.

Respuestas: **200** (`"Zona dada de baja correctamente"`) · **401** · **403** · **404**.

---

## 7. Tabla de mensajes de error (literales)

Se pueden mostrar tal cual al usuario; ya están en español.

| Campo | Mensaje |
|---|---|
| `name` | `El nombre de la zona es obligatorio` · `El nombre de la zona debe ser texto` · `El nombre de la zona no puede superar los 255 caracteres` · `Ya existe una zona con ese nombre` |
| `description` | `La descripción debe ser texto` · `La descripción no puede superar los 1000 caracteres` |
| `color` | `El color debe ser texto` · `El color debe ser hexadecimal con el formato #RRGGBB` |
| `status` | `El estado debe ser verdadero o falso` |
| `area` | `El área de la zona es obligatoria` · `El área debe ser una lista de puntos` · `El área debe tener al menos 3 puntos` |
| `area.{i}` | `El punto N es obligatorio` · `El punto N debe ser un par de coordenadas` · `El punto N debe tener exactamente 2 coordenadas: latitud y longitud` |
| `area.{i}.0` | `La latitud del punto N es obligatoria` · `La latitud del punto N debe ser numérica` · `La latitud del punto N debe estar entre -90 y 90` |
| `area.{i}.1` | `La longitud del punto N es obligatoria` · `La longitud del punto N debe ser numérica` · `La longitud del punto N debe estar entre -180 y 180` |

Errores de sobre: `El token de sesión no es válido o ha expirado` (401) · `No tienes permisos para acceder a este recurso` (403) · `La zona no existe` (404).

---

## 8. Checklist de implementación en el frontend

- [ ] Cliente HTTP que adjunta `Authorization: Bearer` y `Accept: application/json` en las seis llamadas.
- [ ] Manejo **de dos formatos de error**: sobre `{statusCode, message, data}` para 401/403/404/400 y `{message, errors}` para 422.
- [ ] Mapeo de `errors` de validación a los campos del formulario, incluidas las claves anidadas `area.{i}.{0|1}`.
- [ ] Módulo único de conversión de coordenadas si el mapa no es Leaflet; con Leaflet, ninguna conversión.
- [ ] Formulario de alta: `name` y `area` obligatorios; `color` con `#3388FF` como valor inicial del selector; nunca mandar `color: null` en la edición.
- [ ] Listado: paginación leyendo `total`/`currentPage`/`lastPage` **de la raíz**, y modo sin `limit` para pintar todas las zonas en el mapa.
- [ ] Filtro punto-en-zona: mandar `lat` **y** `lng` juntos; tratar `data: []` como «ninguna zona contiene el punto», no como error.
- [ ] Mostrar `name` y `color` tal como los devuelve la respuesta (normalizados), no los tecleados.
- [ ] Fechas: mostrar `createdAt`/`updatedAt` como texto plano; no parsearlas como ISO.
- [ ] Baja lógica: la fila no desaparece de la tabla tras el `DELETE`; refleja `status` con un estado visual y ofrece reactivar.
- [ ] Ocultar o deshabilitar las acciones de escritura para los roles que no son `administrator` (el 403 del servidor es la red, no la UX).

---

## 9. Lo que este dominio **no** hace (para no diseñarlo en el front)

- No valida solape entre zonas ni geometrías auto-intersectadas.
- No hay agujeros ni multipolígonos: una zona es una figura simple de un solo anillo.
- No calcula área en km², perímetro ni centroide.
- No hay «zona más cercana» a un punto que no cae en ninguna.
- No hay asignación de zonas a empresas, ni relación con vehículos, viajes o rutas.
- No hay borrado real, ni histórico del polígono anterior, ni edición de vértices sueltos.
- No hay importación de GeoJSON/KML/shapefile ni alta en lote.
- No hay orden configurable (`sortBy`, `sortDir`) ni filtros por rango de fechas.
