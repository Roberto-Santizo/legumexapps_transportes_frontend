# Seguimiento en vivo del viaje — referencia de integración para el frontend

Referencia completa del dominio **Trip Positions** de la API de Legumex Transportes: **dos endpoints REST** bajo `/api/trips/{trip}/positions` más **un canal de websocket**, para que el piloto asignado reporte dónde está mientras el viaje está `in_route` y quien mire el mapa lo vea moverse.

Es el primer dominio del proyecto que **no se agota en HTTP**: la mitad de la funcionalidad es el evento `.trip.position.updated` que Reverb empuja al canal privado `trips.{tripId}`. Un frontend que solo consuma los dos endpoints funciona —pinta el rastro— pero no se mueve solo.

Todo lo que hay aquí está verificado contra la implementación real (Laravel 13 + Reverb) y contra su suite de tests (97 tests). Los mensajes de error son literales: se pueden mostrar tal cual al usuario.

> Documentación OpenAPI viva: `/api/documentation`, tag **Trip Positions**.

---

## 1. Lo mínimo que hay que saber antes de escribir código

1. **El `POST` responde 201 o 200, y significan cosas distintas.** `201` = el punto se escribió y se emitió por websocket. `200` = **piso de 15 segundos**: la petición llegó a menos de 15 s del último punto del viaje, así que **no se escribió nada, no se emitió nada** y se devuelve el punto anterior tal cual. Distínguelos **por el status**, nunca comparando coordenadas: dos puntos idénticos seguidos son legítimos (un camión parado sigue reportando).
2. **El piloto emite y nada más.** Está fuera del `GET` (403, **incluido el piloto asignado a ese viaje**) y fuera del canal de websocket. Su app ya conoce su propia posición.
3. **`latitude` y `longitude` salen como `string`, no como número**, con ocho decimales fijos (`"14.62807400"`). Hay que `parseFloat` antes de pintarlas y **nunca** comparar puntos por igualdad de cadena.
4. **Sin `limit` el `GET` devuelve el rastro entero**, y aquí «entero» puede ser **miles de elementos**: un viaje de 6 h al ritmo del piso de 15 s deja ~1 440 filas, y nada se borra nunca. Es el primer listado del proyecto donde eso es lo normal.
5. **El orden es `recordedAt` ASCENDENTE**, al revés que el resto de listados del proyecto. `page=1` es el principio del viaje.
6. **El 422 del cuerpo se adelanta a las guardas de negocio.** El FormRequest se resuelve antes que el controlador, así que un cuerpo inválido devuelve **422 aunque el viaje no exista, esté borrado, sea ajeno o no esté en ruta**. Solo el middleware de rol (403) va por delante.
7. **Si `php artisan reverb:start` no está corriendo, no llega nada y la API no avisa.** El `POST` sigue respondiendo 201, los puntos se guardan enteros y **el mapa simplemente no se mueve**. Si «no llega nada», el síntoma es de servidor, no de código.
8. **Toda respuesta viaja en un sobre** `{ statusCode, message, data }`… **salvo el 422**, que usa el formato estándar de Laravel `{ message, errors }`. Son dos formas distintas y el cliente debe distinguirlas.
9. **Nada se edita ni se borra.** No hay `PATCH` ni `DELETE` de un punto, y el `DELETE` (baja lógica) del viaje **no toca** el rastro.
10. **Las fechas no son ISO 8601.** `recordedAt` sale en el formato propio del proyecto `d-m-Y h:i:s A` (`07-09-2026 08:14:03 AM`). `new Date(...)` sobre él no funciona.

---

## 2. Autenticación y permisos

Los dos endpoints —y también la autorización del canal— exigen el token JWT que devuelve el login:

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
| `POST` reportar posición | 403 | 403 | ✅ **solo el asignado** | 403 |
| `GET` consultar el rastro | ✅ todos los viajes | ✅ los de su ámbito | **403 siempre** | ✅ todos los viajes |
| Suscribirse al canal `trips.{tripId}` | ✅ todos los viajes | ✅ los de su ámbito | **403 siempre** | ✅ todos los viajes |

**Ninguna de las dos rutas lleva `carrier.required`.** Un `carrier` sin empresa registrada no queda bloqueado por el middleware; simplemente su ámbito se reduce a la bolsa libre.

Los permisos son **asimétricos y esa es la trampa principal del dominio**: el `POST` lleva `role:pilot` en la ruta (los otros tres roles reciben 403 del middleware), mientras que el `GET` **no lleva `role:`** y aun así rechaza a todo `pilot` desde el service.

### El ámbito de lectura es el de SPEC 24 y no se reescribe aquí

- `administrator` y `manager` alcanzan el rastro de **cualquier** viaje.
- Un `carrier` alcanza los viajes que **asignó su empresa** más la **bolsa libre** (los `pending` sin piloto ni vehículo).
- Fuera de ámbito es **403**, no 404: se confirma que el viaje existe.

Mensajes de 403 según el caso:

```json
{ "statusCode": 403, "message": "No tienes permisos para acceder a este recurso", "data": null }
```
```json
{ "statusCode": 403, "message": "No tienes permisos para consultar el rastro de un viaje", "data": null }
```
```json
{ "statusCode": 403, "message": "No puedes acceder a un viaje que no pertenece a tu empresa transportista", "data": null }
```

---

## 3. El objeto `TripPosition`

Es lo que devuelve `data` en el `POST` y cada elemento de `data` en el `GET`. **Cinco claves**, siempre en camelCase y siempre en este orden:

```json
{
  "id": 4821,
  "latitude": "14.62807400",
  "longitude": "-90.52255400",
  "recordedAt": "07-09-2026 08:14:03 AM",
  "pilotId": 12
}
```

| Campo | Tipo | Notas para el front |
|---|---|---|
| `id` | `number` | Sirve para **deduplicar**: el mismo punto puede llegar dos veces, una por la respuesta del `POST` y otra por el websocket. **No es parámetro de ninguna ruta**: no existe `/positions/{position}`. |
| `latitude` | `string` | ⚠️ **String**, no número. Ocho decimales fijos. Rango validado `[-90, 90]` y nada más. |
| `longitude` | `string` | ⚠️ **String**, no número. Ocho decimales fijos. Rango validado `[-180, 180]` y nada más. |
| `recordedAt` | `string \| null` | ⚠️ **No es ISO 8601.** Formato `d-m-Y h:i:s A`. Es la **hora del servidor**, no la del dispositivo: la pone `now()` al escribir la fila. Es la clave por la que se ordena el rastro. |
| `pilotId` | `number` | Id del usuario que reportó el punto. Sale del token, nunca del body. **No viene el nombre**: para eso está `pilotName` en el payload del websocket. |

**No trae `tripId`.** Quien pide el rastro ya lo lleva en la URL, y quien recibe el evento lo trae dentro del payload. Si el front mezcla puntos de varios viajes en la misma estructura, tiene que anotar el viaje por su cuenta.

### Tipos TypeScript sugeridos

```ts
export interface TripPosition {
  id: number;
  /** ⚠️ String de 8 decimales, no number. Usa parseFloat antes de pintarla. */
  latitude: string;
  /** ⚠️ String de 8 decimales, no number. */
  longitude: string;
  /** Formato 'd-m-Y h:i:s A', no ISO 8601. Hora del servidor. */
  recordedAt: string | null;
  pilotId: number;
}

/** Payload del websocket: SEIS claves. Trae tripId y pilotName, que el recurso HTTP no tiene. */
export interface TripPositionEvent {
  tripId: number;
  latitude: string;
  longitude: string;
  recordedAt: string | null;
  pilotId: number;
  pilotName: string;
}

/** Cuerpo del POST: exactamente dos campos. */
export interface StoreTripPositionBody {
  latitude: number;
  longitude: number;
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

/** Para pintar en un mapa. */
export const toLatLng = (p: TripPosition): [number, number] =>
  [parseFloat(p.latitude), parseFloat(p.longitude)];
```

---

## 4. Formato de las respuestas

### Éxito

```json
{ "statusCode": 201, "message": "Posición registrada correctamente", "data": { "id": 4821, "latitude": "14.62807400", "longitude": "-90.52255400", "recordedAt": "07-09-2026 08:14:03 AM", "pilotId": 12 } }
```

### Listado sin paginar (sin `limit`)

`data` es el array completo y **no hay** metadatos de paginación:

```json
{ "statusCode": 200, "message": "Posiciones obtenidas correctamente", "data": [ /* TripPosition[] */ ] }
```

### Listado paginado (con `limit` numérico)

Los metadatos se aplanan **en la raíz** del sobre, **no** bajo `meta`:

```json
{
  "statusCode": 200,
  "message": "Posiciones obtenidas correctamente",
  "data": [ /* TripPosition[] */ ],
  "total": 12,
  "currentPage": 1,
  "lastPage": 2
}
```

### Error de validación (422) — **formato distinto**

No usa el sobre. Es el formato estándar de Laravel:

```json
{
  "message": "La latitud es obligatoria (and 1 more error)",
  "errors": {
    "latitude": ["La latitud es obligatoria"],
    "longitude": ["La longitud es obligatoria"]
  }
}
```

Muestra los valores de `errors`, no el `message`, que trae el sufijo `(and N more errors)` en inglés.

### Errores de negocio (400, 401, 403, 404) — sobre

```json
{ "statusCode": 400, "message": "El viaje no está en ruta", "data": null }
```

---

## 5. Endpoints

### 5.1 `POST /api/trips/{trip}/positions` — reportar una posición

Solo `pilot`, y solo el **piloto asignado** al viaje. `{trip}` es el `id` del viaje.

**Cuerpo — exactamente dos campos, los dos obligatorios:**

```json
{ "latitude": 14.628074, "longitude": -90.522554 }
```

| Campo | Reglas | Notas |
|---|---|---|
| `latitude` | `required`, `numeric`, entre `-90` y `90` | Acepta número o cadena numérica. Sale como string de 8 decimales, así que **el valor devuelto no es idénticamente el enviado**. |
| `longitude` | `required`, `numeric`, entre `-180` y `180` | El rango es el mundo entero: no está acotado a Guatemala ni a la ruta prevista. |

**Un punto por petición.** No se acepta un array: no hay envío en lote. Un piloto que estuvo sin señal **pierde el tramo** — cuando recupere red mandará su posición actual y el rastro tendrá un hueco en línea recta, sin que nada indique que faltó cobertura.

**`recordedAt` y `pilotId` no se aceptan** y mandarlos **se descarta en silencio**, sin 422: la hora la pone el servidor con `now()` y el autor sale del token. Tampoco se acepta `tripId`: el viaje va en la URL. Cualquier otra clave se ignora igual.

**Cero validación geográfica.** No se comprueba que el punto caiga cerca de la `polyline` del viaje, ni dentro de Guatemala, ni que el salto contra el punto anterior sea físicamente posible. Un piloto puede reportar Noruega y la API lo guarda con 201.

**Las cuatro guardas del service, en orden fijo** (solo se llega a ellas con un cuerpo válido):

| Orden | Situación | Código | Mensaje |
|:--:|---|:--:|---|
| 1 | El viaje no existe | 404 | `El viaje no existe` |
| 2 | El viaje fue eliminado | 400 | `El viaje ya fue eliminado` |
| 3 | Quien llama no es el piloto del viaje | 403 | `No puedes reportar la posición de un viaje que no tienes asignado` |
| 4 | El viaje no está `in_route` (`pending` o `finished`) | 400 | `El viaje no está en ruta` |

Ese orden es contrato: un viaje **borrado y ajeno** devuelve el 400 del borrado, no el 403 del ajeno.

**Respuestas: 201 y 200 son cosas distintas.**

| Código | Significado | `message` |
|:--:|---|---|
| **201** | El punto se escribió y el evento se emitió | `Posición registrada correctamente` |
| **200** | **Piso de 15 s**: no se escribió nada, no se emitió nada, se devuelve el punto anterior | `Posición recibida correctamente` |
| 400 | Viaje borrado o fuera de ruta | ver tabla de guardas |
| 401 | Sin token o expirado | `El token de sesión no es válido o ha expirado` |
| 403 | Rol distinto de `pilot`, o piloto no asignado | ver §2 y tabla de guardas |
| 404 | El viaje no existe | `El viaje no existe` |
| 422 | Coordenadas ausentes o fuera de rango | formato `{ message, errors }` |

El piso de 15 s es el **único freno** del dominio: no hay rate limiting por IP ni por token. Es silencio deliberado —la app del piloto reintenta cuando la red va mal y devolverle un error la empujaría a lógica defensiva propia—.

---

### 5.2 `GET /api/trips/{trip}/positions` — consultar el rastro

Cualquier autenticado **menos `pilot`**, acotado por el ámbito de SPEC 24.

Devuelve el recorrido **real**, no la ruta prevista (esa es la `polyline` del detalle del viaje).

**Query params — solo dos, y ninguno obligatorio:**

| Param | Efecto |
|---|---|
| `limit` | **Su presencia activa la paginación.** Numérico, **acotado a `[10, 100]`**. Omitido o no numérico (`limit=abc`) → se devuelve el rastro entero sin metadatos. |
| `page` | Página, solo con `limit`. |

⚠️ **El `limit` se acota a `[10, 100]`, a diferencia de `GET /api/trips`**, que no tiene piso de 10 y respeta el tamaño pedido. Aquí `limit=1` y `limit=5` devuelven páginas de **10**, y `limit=500` devuelve páginas de 100. No asumas que la página tendrá el tamaño pedido.

**No hay ni un solo filtro:** ni `dateFrom`, ni `dateTo`, ni `pilotId`, ni recorte por tramo. Cualquier otro query param se ignora. Tampoco hay forma de pedir solo el último punto: para eso está el websocket.

**Orden fijo:** `recorded_at` **ascendente**, con desempate por `id` ascendente para que dos puntos del mismo segundo salgan siempre igual. No hay `sortBy` ni `sortDir`.

**Un viaje sin puntos** —todavía `pending`, o `in_route` sin que el piloto haya reportado aún— devuelve **200 con `data` vacío**, nunca 404.

| Código | Situación | `message` |
|:--:|---|---|
| 200 | Rastro devuelto (posiblemente vacío) | `Posiciones obtenidas correctamente` |
| 401 | Sin token o expirado | `El token de sesión no es válido o ha expirado` |
| 403 | Quien consulta es `pilot` | `No tienes permisos para consultar el rastro de un viaje` |
| 403 | `carrier` fuera de ámbito | `No puedes acceder a un viaje que no pertenece a tu empresa transportista` |
| 404 | El viaje no existe **o está borrado** | `El viaje no existe` |

⚠️ **Asimetría deliberada entre los dos endpoints hermanos:** un viaje borrado devuelve **404** en el `GET` («El viaje no existe») y **400** en el `POST` («El viaje ya fue eliminado»). Es coherente con SPEC 24: para quien lee, un viaje borrado simplemente no está; para quien escribe, la distinción importa.

---

## 6. El websocket

Es la mitad de la funcionalidad y no es un endpoint. Cada punto **escrito** (201, nunca en el 200 del piso) emite:

- **Canal:** `trips.{tripId}` — **privado** (`private-trips.{tripId}` en el cable).
- **Evento:** `.trip.position.updated` — **con el punto inicial**, que es lo que le dice a Echo que no anteponga el namespace PHP.
- **Payload — seis claves**, una más y una menos que el recurso HTTP: trae `tripId` y `pilotName`, que el recurso no tiene.

```json
{
  "tripId": 87,
  "latitude": "14.62807400",
  "longitude": "-90.52255400",
  "recordedAt": "07-09-2026 08:14:03 AM",
  "pilotId": 12,
  "pilotName": "Carlos Ramírez"
}
```

### Autorización del canal

La suscripción se autoriza en **`POST /api/broadcasting/auth`**, con el **mismo `Authorization: Bearer`** del resto de la API — no hay sesión ni cookie, así que hay que configurarlo a mano en Echo. Sin cabecera, responde **401** con el sobre habitual:

```json
{ "statusCode": 401, "message": "El token de sesión no es válido o ha expirado", "data": null }
```

El callback aplica **las mismas dos reglas** que el `GET`, en este orden: cualquier `pilot` recibe `false`, y el resto solo alcanza los viajes que ya vería por HTTP. Un `tripId` inexistente o borrado también es `false`. Cuando el callback rechaza, Reverb responde **403** y Echo emite su propio error de suscripción.

### Configuración de Echo

```ts
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

const echo = new Echo({
  broadcaster: 'reverb',
  key: import.meta.env.VITE_REVERB_APP_KEY,
  wsHost: import.meta.env.VITE_REVERB_HOST,
  wsPort: import.meta.env.VITE_REVERB_PORT ?? 80,
  wssPort: import.meta.env.VITE_REVERB_PORT ?? 443,
  forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
  enabledTransports: ['ws', 'wss'],

  // ⚠️ Lo que hay que configurar a mano: la API no tiene sesión.
  authEndpoint: `${import.meta.env.VITE_API_URL}/api/broadcasting/auth`,
  auth: {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  },
});
```

```ts
// Suscribirse al rastro de UN viaje
echo.private(`trips.${tripId}`)
  .listen('.trip.position.updated', (e: TripPositionEvent) => {
    map.addPoint([parseFloat(e.latitude), parseFloat(e.longitude)]);
  });

// Al salir de la pantalla
echo.leave(`trips.${tripId}`);
```

> ⚠️ El nombre del evento lleva **punto inicial**: `'.trip.position.updated'`. Sin él, Echo busca `App\Events\Trip\TripPositionUpdated` y no llega nada.

> ⚠️ **Si el token expira, la reautorización del canal falla.** El JWT dura 60 min y el `authEndpoint` usa la cabecera que se fijó al construir Echo. Tras renovar el token hay que reconstruir la instancia o actualizar `echo.connector.options.auth.headers.Authorization`.

### La costura al conectar: no hay replay

Reverb **no reenvía lo perdido**. Quien abre el mapa a mitad de viaje tiene que:

1. Pedir el rastro acumulado con el `GET`.
2. Suscribirse al canal.
3. **Deduplicar por `id`**, porque entre los dos pasos puede colarse un punto que llegue por ambas vías.

Ese orden (primero suscribirse, luego pedir el `GET`, luego deduplicar) es más seguro que el inverso: no deja hueco.

### Requisito de infraestructura

El backend necesita **`php artisan reverb:start` corriendo** —un proceso permanente que no existía antes de esta spec— y que `REVERB_HOST`/`REVERB_PORT` sean **alcanzables desde el navegador**; detrás de HTTPS el websocket tiene que salir por `wss` a través del proxy.

**Si no está corriendo, el fallo es silencioso por diseño:** el `event()` va envuelto en `try/catch` que registra en el log y sigue, la API responde **201** a cada `POST`, los puntos se guardan enteros y **el mapa simplemente no se mueve, sin ningún error visible**. Perder el aviso en vivo nunca puede costar el dato.

---

## 7. Tabla de mensajes de error (literales)

Se pueden mostrar tal cual al usuario; ya están en español.

### Validación del cuerpo (422, formato `{ message, errors }`)

| Campo | Mensaje |
|---|---|
| `latitude` | `La latitud es obligatoria` · `La latitud debe ser un número` · `La latitud debe estar entre -90 y 90` |
| `longitude` | `La longitud es obligatoria` · `La longitud debe ser un número` · `La longitud debe estar entre -180 y 180` |

### Errores de sobre

| Código | Mensaje | Cuándo |
|:--:|---|---|
| 400 | `El viaje ya fue eliminado` | `POST` sobre un viaje con baja lógica |
| 400 | `El viaje no está en ruta` | `POST` sobre un viaje `pending` o `finished` |
| 401 | `El token de sesión no es válido o ha expirado` | Sin token, expirado, o en `POST /api/broadcasting/auth` sin cabecera |
| 403 | `No tienes permisos para acceder a este recurso` | `POST` desde un rol que no es `pilot` |
| 403 | `No puedes reportar la posición de un viaje que no tienes asignado` | `POST` de un `pilot` que no es el asignado |
| 403 | `No tienes permisos para consultar el rastro de un viaje` | `GET` desde cualquier `pilot`, incluido el asignado |
| 403 | `No puedes acceder a un viaje que no pertenece a tu empresa transportista` | `GET` de un `carrier` fuera de ámbito |
| 404 | `El viaje no existe` | Id inexistente en el `POST`, o inexistente **o borrado** en el `GET` |

### Mensajes de éxito

| Código | Mensaje |
|:--:|---|
| 201 | `Posición registrada correctamente` |
| 200 | `Posición recibida correctamente` (piso de 15 s: nada escrito) |
| 200 | `Posiciones obtenidas correctamente` |

---

## 8. Checklist de implementación en el frontend

### App del piloto (la que emite)

- [ ] `POST` cada **≥ 15 s**; por debajo la API responde 200 y descarta el punto sin avisar de otra forma.
- [ ] Tratar **201 y 200 como éxito**, y usar el status (no las coordenadas) para saber si el punto entró.
- [ ] No mandar `recordedAt`, `pilotId` ni `tripId`: se descartan en silencio.
- [ ] Manejar los dos formatos de error: sobre para 400/401/403/404 y `{ message, errors }` para 422.
- [ ] Parar de reportar cuando el viaje deja de estar `in_route`: tras `/finish`, todo `POST` es 400 «El viaje no está en ruta».
- [ ] Sin cobertura, **el tramo se pierde**: no encolar puntos con la esperanza de mandarlos luego, no hay envío en lote.

### Panel del administrador / transportista (el que mira el mapa)

- [ ] Cliente HTTP con `Authorization: Bearer` y `Accept: application/json`.
- [ ] `parseFloat` sobre `latitude`/`longitude` antes de pintarlas; **nunca** comparar puntos por igualdad de cadena.
- [ ] Suscribirse al canal **antes** de pedir el `GET`, y **deduplicar por `id`**: no hay replay y el punto de la costura puede llegar dos veces.
- [ ] Configurar Echo con `authEndpoint` **y** la cabecera `Authorization: Bearer`: no hay sesión.
- [ ] Escuchar `'.trip.position.updated'` **con el punto inicial**.
- [ ] `echo.leave()` al salir de la pantalla; **un canal por viaje** — para seguir tres viajes hacen falta tres suscripciones.
- [ ] Rehacer la suscripción al renovar el token: el JWT dura 60 min y la cabecera de auth se fija al construir Echo.
- [ ] Paginar leyendo `total`/`currentPage`/`lastPage` **de la raíz**, y **no asumir el tamaño pedido**: el `limit` sube al piso de 10.
- [ ] En viajes largos, **usar `limit`**: sin él llegan miles de puntos de golpe.
- [ ] Mostrar `recordedAt` como texto plano; no parsearlo como ISO.
- [ ] Tratar `data: []` como «el piloto aún no ha reportado», no como error.
- [ ] Ocultar la vista del rastro para el rol `pilot` (el 403 del servidor es la red, no la UX).
- [ ] Prever el escenario «Reverb caído»: el rastro se carga por `GET` pero no llega nada nuevo. Un aviso de «sin conexión en vivo» apoyado en el estado del socket de Echo evita que se lea como «el camión está parado».

---

## 9. Lo que este dominio **no** hace (para no diseñarlo en el front)

- **No hay telemetría**: ni velocidad, ni rumbo, ni precisión del GPS, ni altitud, ni batería. Solo dónde y cuándo.
- **No hay envío en lote**: un punto por petición, y el tramo sin señal se pierde entero.
- **No se edita ni se borra nada**: sin `PATCH`, sin `DELETE`, sin purga por antigüedad. Una coordenada mala es historial. El `DELETE` del viaje **no toca** el rastro.
- **No valida la posición contra nada**: ni contra la `polyline`, ni contra Guatemala, ni contra un salto físicamente posible.
- **No hay alertas, geocercas ni avisos por desvío.** Nadie recibe correo ni push por nada; no existe «llegó al puerto» ni «lleva 40 min parado».
- **No hay ETA ni recálculo de ruta**: la `polyline` de SPEC 24 no se toca y no se compara con el rastro real.
- **El viaje no cambió de forma**: `TripResource` y `TripListResource` siguen igual, sin `lastLatitude`, `lastLongitude` ni `lastPositionAt`, y la tabla `trips` no ganó ninguna columna.
- **No hay canal de flota** (`trips` global ni `carriers.{id}.trips`) ni **canal de presencia**: nadie sabe quién más está mirando el mapa.
- **El piloto no escucha**: fuera del `GET` y fuera del canal.
- **No hay client events / whisper**: la única entrada es el `POST`.
- **No hay replay al conectar**: esa costura la cose el frontend con el `GET`.
- **No hay rate limiting** por IP ni por token: el único freno es el piso de 15 s por viaje.
- **No existe «posición del piloto» suelta**: sin un viaje `in_route` asignado, un piloto no tiene dónde mandar nada.
