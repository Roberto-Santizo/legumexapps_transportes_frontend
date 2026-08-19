# Búsqueda de direcciones — referencia de integración para el frontend

Referencia completa del dominio **Places** de la API de Legumex Transportes: **tres endpoints** de solo lectura bajo `/api/places` para buscar una dirección por texto, resolver sus coordenadas y trazar la ruta por carretera hacia un destino registrado.

Todo lo que hay aquí está verificado contra la implementación real de la rama `spec-16-place-directions` (rutas, `SearchPlacesRequest`, `GetDirectionsRequest`, los tres Resources, `LocationService`, `GooglePlacesService`, `PolylineDecoder` y los tests `PlaceTest` / `GooglePlacesServiceTest` / `PolylineDecoderTest`). Los mensajes de error son literales: se pueden mostrar tal cual al usuario.

> **Novedad (SPEC 16):** el tercer endpoint, `GET /api/places/directions`, en la sección 5.3. Es la única ruta del dominio que toca la base de datos y la única que puede devolver **400**.

> Documentación OpenAPI viva: `/api/documentation`.

---

## 1. Lo mínimo que hay que saber antes de escribir código

1. **Hay dos flujos distintos, no uno.** Buscar una dirección (5.1 + 5.2) y trazar una ruta (5.3) **no se encadenan entre sí**: la ruta no parte de un `placeId`, parte de un `locationId` de la tabla `locations`, que es otro dominio. Un `id` de este dominio **no sirve** en `/directions`, y al revés tampoco.
2. **Son dos llamadas encadenadas, no una** (en el flujo de búsqueda). El listado **no trae coordenadas**: devuelve `id` + dirección. Cuando el usuario elige una, se pide `GET /api/places/{place}` con ese `id` y ahí llegan `latitude` y `longitude`. El front tiene que **guardar el `id` entre las dos llamadas**; no hay otra forma de recuperarlo.
2. **`{place}` es una cadena opaca, no un entero.** A diferencia del resto de la API (`/api/zones/1`), aquí el identificador es algo como `ChIJk4h8_Q6ii4ARZ4gGpXY8bJ0`. No tiene formato garantizado, no se puede construir ni adivinar, y **solo se obtiene de la búsqueda**.
3. **El `503` no es culpa del cliente.** Significa que el proveedor externo de direcciones no respondió. Un 422 se corrige en el formulario; **un 503 se reintenta más tarde**. No marques el campo en rojo ni pidas al usuario que escriba otra cosa.
4. **Una búsqueda sin resultados es `200` con `data: []`**, nunca 404. Es el caso más normal del mundo: el usuario todavía no terminó de escribir.
5. **Cada llamada cuesta dinero.** No hay caché, no hay tope por usuario y no hay throttle. El `min:3` del backend corta lo peor, pero **el debounce del front es la otra mitad de la defensa** — sin él, cada tecla es una factura.
6. **Este dominio no persiste nada y no cotiza nada.** No hay tabla, ni favoritos, ni historial. Y encadenar con `GET /api/freight-rates/quote` es trabajo del front: la API no lo hace sola. La ruta tampoco cotiza: devuelve kilómetros y horas, **nunca un importe**.
7. **`durationHours` NO es un ETA.** Se calcula sobre límites de velocidad, **sin tráfico**, sin paradas, sin descansos y sin distinguir un camión cargado de un coche. La misma consulta devuelve lo mismo a las 3 de la mañana y en hora pico. En carretera guatemalteca real se va a quedar corta, sistemáticamente. **Etiquétala como estimación en la UI.**
8. **`/directions` distingue tres fallos que parecen el mismo.** Un `locationId` que **no existe** es 422; uno que existe pero está **inactivo** es 400; y que **no haya carretera** entre los dos puntos es 404. Son tres ramas de UI distintas.

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
| `GET /api/places?search=` | ✅ | ✅ | ✅ | ✅ |
| `GET /api/places/{place}` | ✅ | ✅ | ✅ | ✅ |
| `GET /api/places/directions` | ✅ | ✅ | ✅ | ✅ |

**No hay reparto de permisos en este dominio.** Ninguna ruta lleva `role:` ni `carrier.required`, así que **nunca vas a recibir un 403 aquí**: un `carrier` que todavía no ha registrado su empresa alcanza los tres endpoints con normalidad. Es lo que separa Places de Vehicles o Pilots.

No hay escritura: `POST`, `PUT`, `PATCH` y `DELETE` sobre `/api/places` no existen (405).

---

## 3. Los objetos del dominio

Hay **tres formas distintas**, una por endpoint. Las tres en **camelCase**, como el resto de la API.

> **Fechas:** ningún campo de este dominio es una fecha, tampoco en la ruta. El formato propio del proyecto `d-m-Y h:i:s A` (`13-08-2026 09:27:43 PM`, que **no** es ISO 8601) aplica en Zones, Products, Locations o Pilots, pero **aquí no hay `createdAt` ni `updatedAt` que parsear**.

### 3.1 `PlacePrediction` — cada elemento del listado

```json
{
  "id": "ChIJk4h8_Q6ii4ARZ4gGpXY8bJ0",
  "formattedAddress": "5a Avenida 12-38, Zona 4, Ciudad de Guatemala"
}
```

| Campo | Tipo | Notas para el front |
|---|---|---|
| `id` | `string` | Identificador **opaco** del proveedor. No es numérico, no es ordenable y no significa nada. Es lo que se pasa como `{place}` en la segunda llamada, y **lo único que hay que guardar** al elegir. |
| `formattedAddress` | `string` | Dirección completa ya formateada, en español y sesgada a Guatemala. Llega en **una sola cadena**: no viene desglosada en calle, número, municipio ni departamento. Es texto de presentación. |

**Exactamente dos claves, nunca más.** No hay coordenadas aquí, y es deliberado: resolver la posición de los diez resultados factura un nivel más caro por nueve posiciones que nadie usa.

### 3.2 `Place` — el detalle

```json
{
  "id": "ChIJk4h8_Q6ii4ARZ4gGpXY8bJ0",
  "formattedAddress": "5a Avenida 12-38, Zona 4, Ciudad de Guatemala",
  "latitude": 14.6248,
  "longitude": -90.5152
}
```

| Campo | Tipo | Notas para el front |
|---|---|---|
| `id` | `string` | El mismo que se envió en la ruta, devuelto para confirmar qué se resolvió. |
| `formattedAddress` | `string` | Misma clave y mismo formato que en el listado. **Puede no ser idéntica carácter a carácter** a la que se mostró al elegir: el texto lo compone el proveedor en cada llamada. Pinta este valor, no el que tecleó el usuario. |
| `latitude` | `number` | ⚠️ **Número, no cadena.** No lleva comillas en el JSON y no está formateado a dos decimales como los importes del resto de la API. **Nunca es `null`.** |
| `longitude` | `number` | Ídem. Van **planos en la raíz** de `data`: no hay `geometry` ni `location` anidados. |

`latitude` y `longitude` son exactamente lo que se pasa como `lat` y `lng` a `GET /api/freight-rates/quote`, **sin convertir ni redondear**.

> Cuidado con el orden al reenviarlas: aquí cada coordenada viaja con su propio nombre, pero el `area` de Zones usa pares `[latitud, longitud]`.

### 3.3 `Directions` — la ruta por carretera

```json
{
  "locationId": 7,
  "locationName": "PUERTO QUETZAL",
  "distanceKilometers": 104.32,
  "durationHours": 1.75,
  "polyline": "_lgxA~vmgPrIoAzmE~}A~j`Crzp@",
  "points": [[14.6248, -90.5152], [14.6231, -90.5148], [14.59, -90.53], [13.9276, -90.7853]]
}
```

| Campo | Tipo | Notas |
|---|---|---|
| `locationId` | `number` | El mismo `id` que se mandó en la query. Sale de la tabla `locations`, **no del proveedor externo**. |
| `locationName` | `string` | Nombre del destino **en mayúsculas** (se normaliza al darlo de alta). Sale de la base, no del proveedor. |
| `distanceKilometers` | `number` | Distancia **por carretera**, no en línea recta. Redondeada a 2 decimales. **Número, no cadena.** |
| `durationHours` | `number` | Duración estimada **en horas decimales** (`1.75` = 1 h 45 min). Redondeada a 2 decimales. **Número, no cadena.** ⚠️ **No es un ETA.** |
| `polyline` | `string` | La línea **codificada**, para las librerías de mapa que la consumen directa. |
| `points` | `[number, number][]` | La **misma** línea decodificada, en pares `[latitud, longitud]`. **Nunca viene vacía** en un 200. |

⚠️ **`polyline` y `points` son la misma línea en dos formatos**, no dos rutas ni dos niveles de detalle. Es duplicación deliberada: la cadena para Leaflet/Google Maps/Mapbox, los pares para dibujar a mano, recortar o medir sin arrastrar un decodificador. **Usa uno de los dos, no los dos.**

⚠️ **El orden de `points` es `[latitud, longitud]`**, el mismo del `area` de Zones. Varias librerías de mapa esperan `[lng, lat]`: si la ruta te sale en el océano Índico, es esto.

> `durationHours` viene en **horas decimales**, no en minutos ni en segundos. Para mostrarla: `Math.floor(h)` horas y `Math.round((h % 1) * 60)` minutos.

### Tipos TypeScript sugeridos

```ts
/** Identificador opaco del proveedor de direcciones. No es numérico ni construible. */
export type PlaceId = string;

/** Un resultado de la búsqueda. NO trae coordenadas. */
export interface PlacePrediction {
  id: PlaceId;
  formattedAddress: string;
}

/** El detalle: la dirección elegida, ya con su posición. */
export interface Place extends PlacePrediction {
  /** Número, no cadena. Nunca null. Se pasa tal cual como `lat` a /quote. */
  latitude: number;
  /** Número, no cadena. Nunca null. Se pasa tal cual como `lng` a /quote. */
  longitude: number;
}

/** Sobre estándar de la API. */
export interface ApiEnvelope<T> {
  statusCode: number;
  message: string;
  data: T;
}

/** Un par [latitud, longitud]. OJO: NO es [lng, lat]. */
export type LatLngPair = [number, number];

/** La ruta por carretera hacia un destino registrado. */
export interface Directions {
  /** El id de `locations`, NO un PlaceId. Sale de la base, no del proveedor. */
  locationId: number;
  /** Nombre del destino, en MAYÚSCULAS. */
  locationName: string;
  /** Kilómetros por carretera, 2 decimales. Número, no cadena. */
  distanceKilometers: number;
  /** Horas decimales, 2 decimales. Número, no cadena. NO ES UN ETA: sin tráfico. */
  durationHours: number;
  /** La línea codificada. Misma información que `points`. */
  polyline: string;
  /** La línea decodificada. Nunca vacía en un 200. Misma información que `polyline`. */
  points: LatLngPair[];
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
{ "statusCode": 200, "message": "Dirección obtenida correctamente", "data": { ... } }
```

### Listado

`data` es el array completo, de **0 a 10 elementos**:

```json
{
  "statusCode": 200,
  "message": "Direcciones obtenidas correctamente",
  "data": [ /* PlacePrediction[] */ ]
}
```

### Listado paginado — **no existe en este dominio**

Este listado **no pagina nunca**. El sobre **jamás** trae `total`, `currentPage` ni `lastPage`, a diferencia de Zones, Products, Vehicles o Pilots, donde el query param `limit` los activa. Aquí `limit`, `page` y `pageSize` se ignoran por completo y no hay token de página siguiente: son diez como mucho y se acabó.

### Error de negocio (400, 401, 404, 503)

```json
{ "statusCode": 404, "message": "La dirección no existe", "data": null }
```

### Error de validación (422) — **formato distinto**

No lleva `statusCode` ni `data`. Es el formato estándar de Laravel:

```json
{
  "message": "El texto de búsqueda debe tener al menos 3 caracteres",
  "errors": {
    "search": ["El texto de búsqueda debe tener al menos 3 caracteres"]
  }
}
```

Las claves que pueden fallar son `search` (en la búsqueda) y `locationId`, `lat` y `lng` (en la ruta). En un 422 pueden venir **varias a la vez**: pedir `/directions` sin ningún parámetro devuelve las tres.

---

## 5. Endpoints

### 5.1 `GET /api/places?search=` — buscar direcciones

Cualquier autenticado. Devuelve **hasta 10** direcciones que coinciden con el texto.

| Query param | Tipo | Comportamiento |
|---|---|---|
| `search` | `string` | **Obligatorio.** Entre 3 y 200 caracteres. Texto libre tal como lo teclea el usuario: calle, colonia, zona, municipio, nombre de un negocio o una mezcla. No hay sintaxis, ni campos separados, ni código postal. Acentos y mayúsculas dan igual. |

**No existe ningún otro parámetro.** `limit`, `page`, `pageSize` y `regionCode` se ignoran: enviarlos devuelve exactamente la misma respuesta, sin error.

Reglas del `search`:

- Ausente o cadena vacía → **422**.
- Menos de 3 caracteres → **422**. Exactamente 3 **sí** es válido.
- Más de 200 caracteres → **422**. Exactamente 200 **sí** es válido.
- ⚠️ En los cuatro casos la petición **no llega al proveedor**, que factura cada llamada. El mínimo de 3 es una defensa de costo, no de usabilidad.

Comportamiento:

- Sin coincidencias → **200 con `data: []`**, nunca 404.
- Los resultados están **sesgados** a Guatemala y en español: se priorizan, no se restringen. Una dirección fronteriza legítima de otro país también puede aparecer.
- No hay caché: cada llamada sale al proveedor externo.

```
GET /api/places?search=zona 4 guatemala
```

Respuestas: **200** (`"Direcciones obtenidas correctamente"`) · **401** · **422** · **503**.

---

### 5.2 `GET /api/places/{place}` — dirección con coordenadas

Cualquier autenticado. Segundo paso del flujo, y el motivo por el que existe el dominio.

| Parámetro de ruta | Tipo | Notas |
|---|---|---|
| `{place}` | `string` | El `id` que devolvió la búsqueda. Cadena opaca; **su forma no se valida**. |

⚠️ **Un `id` inexistente y un `id` con forma inválida devuelven el mismo 404 con el mismo mensaje.** No se distinguen a propósito: para esta API los dos casos son «no hay tal dirección», y separarlos obligaría a explicarle al cliente la taxonomía de errores del proveedor.

**No se valida nada de la dirección devuelta.** El punto puede caer fuera de toda zona registrada, o incluso fuera de Guatemala, y la respuesta sale igual con 200.

⚠️ **Estas coordenadas ya no se cotizan directamente.** Desde SPEC 15 `GET /api/freight-rates/quote` **no acepta `lat` ni `lng` por ningún nombre**: exige un `locationId`. El camino de una dirección a una tarifa es dar de alta el destino con `POST /api/locations` (mandando `googlePlaceId`, `latitude` y `longitude`) y cotizar después con el `id` que devuelva. Ver 5.4.

```
GET /api/places/ChIJk4h8_Q6ii4ARZ4gGpXY8bJ0
```

Respuestas: **200** (`"Dirección obtenida correctamente"`) · **401** · **404** · **503**.

---

### 5.3 `GET /api/places/directions` — ruta por carretera hacia un destino

Cualquier autenticado. Calcula la ruta **por carretera** desde un punto suelto hasta un **destino ya registrado**, y devuelve distancia, duración y la línea para pintarla en el mapa.

Es el endpoint más distinto de los tres: **es el único que consulta la base de datos** (para resolver el destino) y **el único que puede devolver 400**.

| Query param | Tipo | Obligatorio | Reglas |
|---|---|:--:|---|
| `locationId` | `integer` | ✅ | Debe existir en `locations`. **No es un `placeId`.** |
| `lat` | `number` | ✅ | Latitud del **origen**, entre `-90` y `90`. |
| `lng` | `number` | ✅ | Longitud del **origen**, entre `-180` y `180`. |

```
GET /api/places/directions?locationId=7&lat=14.6248&lng=-90.5152
```

**Los tres son obligatorios y no hay valores por defecto.** Un 422 corta la llamada antes de salir al proveedor externo, que factura cada ruta.

`lat=0&lng=0` es **válido** y se calcula: cero no es «ausente». (Y como cae en el Atlántico, lo más probable es que la respuesta sea el 404 de «no hay ruta».)

**El origen es un par de coordenadas sueltas, nunca un `locationId`.** No hay ruta inversa, ni viaje redondo, ni forma de pedir la ruta entre dos destinos registrados.

**Parámetros de más se ignoran por completo.** `travelMode`, `polylineQuality`, `limit`, `page` y cualquier otro no cambian nada: son constantes del servidor, no opciones del cliente. Siempre es coche/camión por carretera, siempre sin tráfico y siempre la polilínea ligera.

Respuestas: **200** (`"Ruta obtenida correctamente"`) · **400** · **401** · **404** · **422** · **503**.

#### Los cuatro fallos, en su orden real de evaluación

El backend los comprueba **en este orden**, y para en el primero que falla:

| # | Qué pasó | Código | Mensaje | ¿Llegó al proveedor? |
|:--:|---|:--:|---|:--:|
| 1 | Falta un parámetro, o `locationId` **no existe** | **422** | ver tabla de la sección 7 | ❌ No |
| 2 | El destino existe pero está **inactivo** (`status: false`) | **400** | `El destino seleccionado no está activo` | ❌ No |
| 3 | No hay **carretera** entre los dos puntos | **404** | `No se encontró una ruta hacia el destino` | ✅ Sí, y respondió bien |
| 4 | El proveedor falló, tardó o contestó algo raro | **503** | el genérico de la sección 6 | ✅ Lo intentó |

⚠️ **422 y 400 no son lo mismo, y la diferencia importa en pantalla.** Un `locationId` que nunca existió es **422** (`El destino seleccionado no existe`, regla `exists:`). Un destino que **sí existe** pero fue dado de baja es **400** (`El destino seleccionado no está activo`): la fila sigue viva, sigue en el listado de `/api/locations`, conserva sus tarifas y se puede reactivar con `PATCH /api/locations/{id}/toggle-status`. Al usuario se le dice cosas distintas: «ese destino no existe» contra «ese destino está desactivado, actívalo o elige otro».

⚠️ **El 404 no es un error del proveedor y no se reintenta.** Significa que el proveedor **funcionó** y no encontró camino por carretera: un origen en mitad del mar, en una isla o en otro continente. Reintentarlo va a fallar igual las veces que quieras. Lo que hay que cambiar es el **punto de partida**.

> **Nada valida el origen más allá del rango.** No se comprueba que esté en Guatemala, ni en tierra firme, ni cerca de una carretera. Un origen imposible pasa la validación, sale al proveedor y vuelve como ese 404 — que es correcto, pero no dice que el problema era de dónde saliste. Si el usuario elige el origen en un mapa, encuádralo tú.

#### Pintarla en el mapa

```ts
const { data: route } = await get<Directions>(
  `/api/places/directions?locationId=${locationId}&lat=${origin.lat}&lng=${origin.lng}`
);

// Opción A — la cadena codificada, si tu librería la entiende
map.addPolyline({ encodedPath: route.polyline });

// Opción B — los pares ya decodificados. OJO: son [lat, lng].
L.polyline(route.points).addTo(map);   // Leaflet los quiere justo en ese orden

// Duración legible: viene en horas DECIMALES
const h = Math.floor(route.durationHours);
const m = Math.round((route.durationHours % 1) * 60);
const texto = `${route.distanceKilometers} km · ~${h} h ${m} min (estimado, sin tráfico)`;
```

**No llames a este endpoint en bucle.** Cada ruta se factura más cara que una búsqueda de dirección y **no hay throttle, ni tope por usuario, ni caché**. Una llamada por destino y por consulta; para diez destinos son diez llamadas, y conviene que las dispare el usuario, no un `useEffect`.

---

### 5.4 El flujo completo, de la búsqueda a la cotización

Son **dos flujos**, y solo el primero pertenece entero a este dominio.

**A. Dar de alta un destino a partir de una dirección** (una vez por destino, y normalmente lo hace un `administrator`):

```ts
// 1. El usuario escribe (con debounce: cada llamada cuesta)
const { data: predictions } = await get<PlacePrediction[]>(
  `/api/places?search=${encodeURIComponent(term)}`
);

// 2. Elige una. Guarda el id: es lo único que sirve para el paso 3.
const chosenId = predictions[0].id;

// 3. Resuelve sus coordenadas
const { data: place } = await get<Place>(`/api/places/${chosenId}`);

// 4. Registra el DESTINO con esas coordenadas (solo administrator)
const { data: location } = await post('/api/locations', {
  name: 'Puerto Quetzal',
  googlePlaceId: place.id,
  latitude: place.latitude,
  longitude: place.longitude,
});
```

**B. Usar ese destino** (tantas veces como haga falta, y ya sin pasar por Places):

```ts
// 5a. Cotizar: por locationId. lat/lng YA NO SE ACEPTAN aquí.
const { data: quote } = await get(
  `/api/freight-rates/quote?locationId=${location.id}` +
  `&productId=${productId}&fuelType=${fuelType}&pounds=${pounds}`
);

// 5b. Trazar la ruta: mismo locationId, más el origen
const { data: route } = await get<Directions>(
  `/api/places/directions?locationId=${location.id}&lat=${origin.lat}&lng=${origin.lng}`
);
```

**El backend no encadena nada de esto.** Todos los pasos los dispara el front.

⚠️ **Cotizar y trazar la ruta son independientes.** `/quote` no devuelve kilómetros y `/directions` no devuelve importes. **La tarifa no depende de la distancia**: depende del destino, del producto y del precio del combustible. Recorrer más kilómetros no encarece nada, y llamar a `/directions` no cambia ninguna cotización. No calcules precios por kilómetro con estos datos.

---

## 6. El `503`: qué significa y qué hacer

Es la primera respuesta 5xx de toda la API y la única de este dominio. Los **tres** endpoints pueden devolverla.

```json
{
  "statusCode": 503,
  "message": "El servicio de búsqueda de direcciones no está disponible en este momento. Intenta de nuevo en unos minutos.",
  "data": null
}
```

Se produce por **seis** causas, todas con **el mismo mensaje genérico**:

| Causa | Detalle |
|---|---|
| Timeout | El backend espera **10 segundos** y **no reintenta**. |
| Error de red o DNS | El proveedor es inalcanzable. |
| Credencial ausente o rechazada | La API key falta, es inválida o no tiene permisos. |
| Cuota agotada | Se acabó el presupuesto del proveedor. |
| Error 5xx del proveedor | El servicio externo falló. |
| Respuesta con forma inesperada | Si a **una sola** de las diez direcciones le falta un campo, se invalida la respuesta entera en vez de devolver nueve. En la ruta, igual: si falta la distancia, la duración o la línea, es 503 y no una ruta a medias con ceros. |

> **El mensaje del 503 habla de «búsqueda de direcciones» también cuando falla la ruta.** Es el mismo texto genérico para los tres endpoints, a propósito: no hay uno específico para rutas. No te sorprenda leerlo bajo un mapa.

⚠️ **La búsqueda y la ruta comparten la misma credencial del proveedor**, aunque se facturan por separado. Si esa credencial se revoca, se agota o se restringe mal, **caen las dos cosas a la vez** con este mismo 503: el usuario se queda sin buscar direcciones y sin trazar rutas en el mismo momento.

El mensaje **no filtra nada** del error original: ni el cuerpo del proveedor, ni la URL, ni la clave. Desde el front las seis causas son indistinguibles.

**Qué hacer:** ofrecer reintentar, no corregir el formulario. Y asumir que mientras dura **no hay plan B**: no hay caché de la que tirar ni proveedor alternativo, así que no se puede elegir un destino. Si el 503 es persistente y generalizado, lo primero que se revisa del lado del servidor es la API key.

---

## 7. Tabla de mensajes de error (literales)

Se pueden mostrar tal cual al usuario; ya están en español.

| Origen | Código | Mensaje |
|---|:--:|---|
| `search` ausente o vacío | 422 | `El texto de búsqueda es obligatorio` |
| `search` no es texto | 422 | `El texto de búsqueda debe ser una cadena de texto` |
| `search` de menos de 3 caracteres | 422 | `El texto de búsqueda debe tener al menos 3 caracteres` |
| `search` de más de 200 caracteres | 422 | `El texto de búsqueda no puede superar los 200 caracteres` |
| Token ausente, manipulado o expirado | 401 | `El token de sesión no es válido o ha expirado` |
| `{place}` inexistente **o** mal formado | 404 | `La dirección no existe` |
| Proveedor caído (las seis causas) | 503 | `El servicio de búsqueda de direcciones no está disponible en este momento. Intenta de nuevo en unos minutos.` |

Y los de la ruta (`GET /api/places/directions`):

| Origen | Código | Mensaje |
|---|:--:|---|
| `locationId` ausente | 422 | `El destino es obligatorio` |
| `locationId` no entero | 422 | `El destino debe ser un identificador numérico` |
| `locationId` que no existe | 422 | `El destino seleccionado no existe` |
| `lat` ausente | 422 | `La latitud de origen es obligatoria` |
| `lat` no numérica | 422 | `La latitud de origen debe ser numérica` |
| `lat` fuera de `[-90, 90]` | 422 | `La latitud de origen debe estar entre -90 y 90` |
| `lng` ausente | 422 | `La longitud de origen es obligatoria` |
| `lng` no numérica | 422 | `La longitud de origen debe ser numérica` |
| `lng` fuera de `[-180, 180]` | 422 | `La longitud de origen debe estar entre -180 y 180` |
| Destino **existente pero desactivado** | **400** | `El destino seleccionado no está activo` |
| No hay carretera entre los dos puntos | 404 | `No se encontró una ruta hacia el destino` |

**No hay 403 en este dominio.** Los códigos posibles son 200, 401, 404, 422 y 503 en los dos endpoints de búsqueda, y esos mismos **más el 400** en la ruta.

---

## 8. Checklist de implementación en el frontend

- [ ] Cliente HTTP que adjunta `Authorization: Bearer` y `Accept: application/json` en las dos llamadas.
- [ ] **Debounce** en el campo de búsqueda (300–500 ms es razonable). Sin él, cada tecla es una llamada facturada.
- [ ] No disparar la petición por debajo de 3 caracteres: valida en el cliente antes de salir, aunque el servidor también lo haga.
- [ ] Manejo **de dos formatos de error**: sobre `{statusCode, message, data}` para 401/404/503 y `{message, errors}` para el 422.
- [ ] Guardar el `id` de la dirección elegida en el estado del formulario: sin él no hay segunda llamada.
- [ ] Tratar `data: []` como «sin resultados», con su mensaje vacío en la UI — **no** como error.
- [ ] Rama de UI específica para el **503** con botón de reintentar, distinta de la del 422. Es el error más probable de este dominio en producción.
- [ ] Pintar `formattedAddress` **de la respuesta del detalle**, no el texto que tecleó el usuario ni el del listado.
- [ ] Pasar `latitude`/`longitude` a `POST /api/locations` **sin convertir a string, sin redondear y sin invertir el orden**. **No** los pases a `/quote`: ese endpoint ya no los acepta.
- [ ] No construir ni cachear `id`s: son opacos y el proveedor no garantiza que sigan resolviendo mañana.
- [ ] No implementar paginación ni «ver más resultados»: son diez y no hay más.

Y para la ruta (`GET /api/places/directions`):

- [ ] Mandar **siempre los tres** parámetros: `locationId`, `lat` y `lng`. No hay defaults.
- [ ] No confundir el `locationId` (entero, de `locations`) con el `placeId` (cadena opaca, del proveedor). **No son intercambiables.**
- [ ] Ramas de UI **separadas** para el 422 (`no existe`), el 400 (`desactivado`) y el 404 (`no hay carretera`). Los tres suenan parecido y significan cosas distintas.
- [ ] Etiquetar `durationHours` como **estimación sin tráfico** en la propia pantalla, no solo en un tooltip. Es el dato que más se va a malinterpretar.
- [ ] Convertir las horas decimales a `h + min` antes de mostrarlas: `1.75` no se enseña como «1,75 horas».
- [ ] Elegir **uno** de `polyline` / `points`, no dibujar los dos: son la misma línea.
- [ ] Si usas `points`, comprobar que tu librería de mapas espera `[lat, lng]` y no `[lng, lat]`.
- [ ] **No** llamar a `/directions` desde un `useEffect` que reaccione al mapa o al zoom: cada llamada se factura y no hay tope. Que la dispare el usuario.
- [ ] No calcular precios a partir de `distanceKilometers`: la tarifa no depende de los kilómetros.
- [ ] No cachear la ruta en el cliente esperando que el backend lo haga: no la guarda, y los términos del proveedor no permiten almacenarla.

---

## 9. Lo que este dominio **no** hace (para no diseñarlo en el front)

- **No persiste nada**: no hay tabla, ni modelo, ni migración. No hay destinos favoritos, ni historial de búsquedas, ni «direcciones recientes» del servidor.
- **No cachea**: cada búsqueda sale al proveedor. Si quieres memoria entre teclas, es del cliente.
- **No pagina**: no hay `nextPageToken`, ni `limit`, ni «cargar más». Diez y se acabó.
- **No hace autocompletado incremental** con session tokens: cada llamada es una búsqueda completa e independiente.
- **No devuelve más campos del lugar**: no hay nombre comercial, componentes de la dirección, tipos, horarios, teléfono, fotos ni reseñas.
- **No hace geocodificación inversa** (coordenadas → dirección) ni matrices de distancia (`computeRouteMatrix`): un origen y un destino por llamada. Diez destinos son diez llamadas.
- **No restringe a Guatemala**: sesga. Pueden aparecer direcciones de fuera.
- **No valida cobertura**: no comprueba que el punto ni la ruta caigan en una zona registrada de `/api/zones`. Desde SPEC 15 **las zonas no cotizan ni validan nada**: se dibujan en el mapa y ya.
- **No cotiza ni encadena**: el paso de la dirección al destino y del destino a la cotización lo da el front. Ni `/quote` ni `/directions` se llaman solos, y **la ruta no devuelve ningún importe**.
- **No da instrucciones paso a paso**: no hay `legs`, ni `steps`, ni maniobras, ni texto de navegación. La respuesta es una línea, no un itinerario narrado.
- **No calcula rutas alternativas**, ni acepta waypoints intermedios, ni paradas múltiples, ni optimiza el orden de las paradas.
- **No conoce tráfico en vivo**, ni hora de salida, ni hora de llegada, ni ETA real.
- **No acepta otro modo de viaje** que no sea por carretera: nada de a pie, bicicleta, moto ni transporte público.
- **No admite preferencias de trazado**: no se pueden evitar peajes, autopistas ni ferries, ni declarar peso, altura o tipo de carga del vehículo.
- **No asocia la ruta a nada**: el origen son dos números sueltos. No hay `vehicleId`, ni `pilotId`, ni viaje programado, y consultar una ruta **no deja ningún rastro** en el sistema.
- **No cachea la ruta ni guarda un historial**: no hay «últimas rutas consultadas».
- **No limita el consumo**: no hay tope por usuario, ni throttle, ni contador, ni alerta de gasto.
- **No permite elegir idioma**: el español es fijo.
- **No tiene escritura**: no se crea, edita ni borra ninguna dirección.
