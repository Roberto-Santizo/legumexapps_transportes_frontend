# Paradas del viaje — referencia de integración para el frontend

Referencia completa del dominio **Trip Timeouts** de la API de Legumex Transportes: **un solo endpoint REST**, `GET /api/trips/{trip}/timeouts`, que devuelve los tramos en que el camión estuvo quieto durante el viaje.

Es el primer dominio del proyecto que **no crea nada por petición**: las paradas se derivan solas del rastro de SPEC 26 al escribir cada punto. No hay `POST`, ni `PATCH`, ni `DELETE`, ni cuerpo que mandar.

Todo lo que hay aquí está verificado contra la implementación real (Laravel 13) y contra su suite de tests (65 tests del dominio). Los mensajes de error son literales: se pueden mostrar tal cual al usuario.

> Documentación OpenAPI viva: `/api/documentation`, tag **Trip Timeouts**.

---

## 1. Lo mínimo que hay que saber antes de escribir código

1. **Nadie crea una parada.** Nacen como **efecto lateral** del `POST /api/trips/{trip}/positions` —el endpoint del piloto— y solo en la rama del **201**: una petición descartada por el piso de 15 s (el 200) no abre, no cierra y no toca ninguna fila. No hay forma de corregir una parada mal detectada: es historial.
2. **El umbral son 5 metros y no se configura.** Un punto a **menos de 5 m** del anterior abre una parada; el primer punto a **5 m o más del ancla** la cierra. No hay query param, ni ajuste por viaje, ni por empresa.
3. **El ancla es el punto ANTERIOR, no el que detectó la parada.** `latitude`, `longitude` y `startedAt` son los de ese punto anterior: «está parado desde las 08:14», no «parada detectada a las 08:14:15».
4. **`endedAt` en `null` significa parada abierta** (el camión seguía quieto en su último punto reportado). No hay `status` ni enum: el estado lo dice ese `null`.
5. **`endPositionId` en `null` con `endedAt` puesto significa que la cerró el fin del viaje**, no que el camión se moviera. Es la **única** forma de distinguir las dos causas de cierre: no hay `closeReason`.
6. **`durationMinutes` es `null` mientras la parada esté abierta**, a propósito: medirlo contra `now()` daría un valor distinto en cada lectura. Cuando la parada se cierra, sale en minutos con dos decimales (`27.5`). ⚠️ Si el valor es exacto sale **sin decimales** en el JSON (una parada de 60 s es `1`, no `1.0`): trátalo como `number`, no como cadena formateada.
7. **`latitude` y `longitude` salen como `string`, no como número**, con ocho decimales fijos (`"14.62820000"`). Hay que `parseFloat` antes de pintarlas.
8. **El piloto no lee sus propias paradas.** Cualquier `pilot` recibe **403**, incluido el asignado al viaje — igual que con el rastro y con el canal de websocket de SPEC 26.
9. **No hay ni un filtro.** Ni `open`, ni `dateFrom`, ni `minDurationMinutes`, ni `sortDir`. Cualquier query param que no sea `limit` o `page` **se ignora en silencio**, con 200 y el listado completo, nunca 422.
10. **No hay umbral mínimo de duración: se registra toda parada**, semáforos incluidos. Un recorrido urbano puede dejar **decenas de filas** de 15–30 s. Filtrar por `durationMinutes` es del frontend.
11. **No hay websocket para las paradas.** No se emite nada al abrirlas ni al cerrarlas: el payload de `.trip.position.updated` sigue con sus **seis** claves. Quien mira el mapa se entera pidiendo este `GET`.
12. **Las fechas no son ISO 8601.** `startedAt` y `endedAt` salen en el formato propio del proyecto `d-m-Y h:i:s A` (`10-09-2026 08:14:00 AM`). `new Date(...)` sobre ellas no funciona.
13. **Toda respuesta viaja en un sobre** `{ statusCode, message, data }`. Este endpoint **no tiene 422**: no hay cuerpo ni query param obligatorio que validar.

---

## 2. Autenticación y permisos

El endpoint exige el token JWT que devuelve el login:

```
Authorization: Bearer {token}
Accept: application/json
```

Sin él la respuesta es **401** con `El token de sesión no es válido o ha expirado`.

La ruta lleva **`jwt.auth` a secas**: sin `role:` y **sin `carrier.required`**. Pero no la alcanzan los cuatro roles — el veto al piloto lo aplica el service, no el middleware.

| Acción | `administrator` | `carrier` | `pilot` | `manager` |
|---|---|---|---|---|
| `GET` consultar las paradas | ✅ todos los viajes | ✅ los de su ámbito | **403 siempre** | ✅ todos los viajes |
| Crear / editar / borrar una parada | — | — | — | — |

No existe ninguna acción de escritura para ningún rol.

### El ámbito de lectura es el de SPEC 24 y no se reescribe aquí

Es **exactamente** el mismo que el del detalle del viaje y el del rastro:

- `administrator` y `manager` alcanzan **cualquier** viaje.
- Un `carrier` alcanza los viajes que **asignó su empresa** más la **bolsa libre** (los `pending` sin piloto ni vehículo).
- Fuera de ámbito es **403**, *no* 404: se le confirma que el viaje existe.
- Cualquier `pilot` recibe **403**, incluido el asignado a ese viaje. El piloto emite y nada más.

---

## 3. El objeto `TripTimeout`

```json
{
  "id": 12,
  "latitude": "14.62820000",
  "longitude": "-90.52290000",
  "startedAt": "10-09-2026 08:14:00 AM",
  "endedAt": "10-09-2026 08:41:30 AM",
  "durationMinutes": 27.5,
  "pilotId": 7,
  "startPositionId": 340,
  "endPositionId": 451
}
```

**Nueve claves en camelCase y ninguna más**, en ese orden. **No trae `tripId`**: quien pregunta ya lo lleva en la URL.

| Campo | Tipo | Notas para el front |
|---|---|---|
| `id` | `number` | Id de la parada. **No es parámetro de ninguna ruta**: no existe `/timeouts/{timeout}`. Sirve para deduplicar y como desempate del orden. |
| `latitude` | `string` | ⚠️ **String**, no número. Ocho decimales fijos. Es la latitud **del ancla** (el primer punto del reposo), copiada en la fila para pintar el pin sin un segundo viaje a la base. |
| `longitude` | `string` | ⚠️ **String**, no número. Ocho decimales fijos. Ídem: la del ancla. |
| `startedAt` | `string` | ⚠️ **No es ISO 8601.** Formato `d-m-Y h:i:s A`. Es el `recordedAt` del ancla, no el de la petición que detectó la parada. **Nunca es `null`.** |
| `endedAt` | `string \| null` | Mismo formato. **`null` = parada abierta.** Si la cerró un punto en movimiento es el `recordedAt` de ese punto; si la cerró el `/finish`, el `now()` del servidor. |
| `durationMinutes` | `number \| null` | Calculado en lectura: `round(segundos / 60, 2)`. **`null` mientras la parada esté abierta.** No se puede filtrar ni ordenar por él: la base no lo conoce. Un valor exacto sale sin decimales (`1`, no `1.0`). |
| `pilotId` | `number` | Quién conducía cuando se abrió la parada. **No viene el nombre**: cruzarlo con el detalle del viaje. |
| `startPositionId` | `number` | Id del `trip_position` que ancla la parada. Nunca `null`. Sus coordenadas y su hora son justo `latitude`/`longitude`/`startedAt`, así que cruzarlo con el rastro es opcional. |
| `endPositionId` | `number \| null` | Id del punto que cerró la parada. **`null` con `endedAt` puesto = la cerró el fin del viaje.** |

### Tipos TypeScript sugeridos

```ts
export interface TripTimeout {
  id: number;
  /** String de 8 decimales; usar parseFloat antes de pintar. Coordenadas del ancla. */
  latitude: string;
  longitude: string;
  /** Formato d-m-Y h:i:s A, NO ISO 8601. */
  startedAt: string;
  /** null = la parada sigue abierta. */
  endedAt: string | null;
  /** null mientras la parada esté abierta. Minutos con hasta dos decimales. */
  durationMinutes: number | null;
  pilotId: number;
  startPositionId: number;
  /** null (con endedAt puesto) = la cerró el PATCH /finish del viaje. */
  endPositionId: number | null;
}

export const isOpen = (t: TripTimeout): boolean => t.endedAt === null;

export const closedByTripFinish = (t: TripTimeout): boolean =>
  t.endedAt !== null && t.endPositionId === null;
```

---

## 4. Formato de las respuestas

### Listado sin paginar (sin `limit`)

`data` es el array completo y **no hay** metadatos de paginación:

```json
{ "statusCode": 200, "message": "Paradas obtenidas correctamente", "data": [ /* TripTimeout[] */ ] }
```

### Listado paginado (con `limit` numérico)

Los metadatos se aplanan **en la raíz** del sobre, **no** bajo `meta`:

```json
{
  "statusCode": 200,
  "message": "Paradas obtenidas correctamente",
  "data": [ /* TripTimeout[] */ ],
  "total": 101,
  "currentPage": 1,
  "lastPage": 2
}
```

### Errores de negocio (401, 403, 404) — sobre

```json
{ "statusCode": 403, "message": "No tienes permisos para consultar las paradas de un viaje", "data": null }
```

### Error de validación (422) — **no ocurre en este endpoint**

El resto de la API usa para el 422 el formato estándar de Laravel `{ message, errors }`, distinto del sobre. **Aquí no aparece nunca**: no hay cuerpo, ni query param obligatorio, ni FormRequest. Un `limit` absurdo no es 422, es un listado completo.

---

## 5. Endpoints

### 5.1 `GET /api/trips/{trip}/timeouts` — consultar las paradas de un viaje

Cualquier autenticado **salvo `pilot`**, acotado por el ámbito de SPEC 24. `{trip}` es el `id` del viaje, **en la URL**: no hay listado global de paradas ni query param `tripId`.

**Sin cuerpo.**

**Query params:**

| Param | Efecto |
|---|---|
| `limit` | **Su presencia activa la paginación.** Numérico, **acotado a `[10, 100]`**: `limit=3` devuelve páginas de **10** y `limit=500`, de **100**. Omitido o no numérico (`limit=abc`) → se devuelven **todas** las paradas sin metadatos. |
| `page` | Página, solo con `limit`. Como el orden es ascendente, `page=1` es el principio del viaje. |
| cualquier otro | **Se ignora en silencio.** `?open=true&dateFrom=2026-01-01&sortDir=desc` devuelve el listado completo con 200. |

**Orden:** `startedAt` **ascendente**, con desempate por `id` ascendente — de la primera parada del viaje a la última, igual que el rastro de SPEC 26 y al revés que la mayoría de listados del proyecto. No hay `sortBy` ni `sortDir`.

**Respuestas:**

| Código | Situación | `message` |
|:--:|---|---|
| 200 | Paradas devueltas (posiblemente ninguna) | `Paradas obtenidas correctamente` |
| 401 | Sin token o expirado | `El token de sesión no es válido o ha expirado` |
| 403 | Quien consulta es `pilot` (incluido el asignado) | `No tienes permisos para consultar las paradas de un viaje` |
| 403 | `carrier` fuera de ámbito | `No puedes acceder a un viaje que no pertenece a tu empresa transportista` |
| 404 | El viaje no existe **o está borrado** | `El viaje no existe` |

Un viaje **sin paradas** responde **200 con `data: []`**, nunca 404. Y un `data` vacío puede significar tres cosas indistinguibles: «no paró», «no reportó posiciones» o «es anterior a SPEC 27» (no hubo backfill).

### 5.2 Cómo nacen y mueren las paradas (no es un endpoint)

No hay forma de escribir una parada, pero conviene saber qué las mueve:

| Momento | Qué pasa |
|---|---|
| `POST /api/trips/{trip}/positions` responde **201** y el punto está a **< 5 m** del anterior, sin parada abierta | **Se abre** una parada anclada en el **punto anterior** |
| `POST` responde **201** y el punto está a **≥ 5 m del ancla**, con parada abierta | **Se cierra** con el `recordedAt` y el `id` de ese punto |
| `POST` responde **201** y el punto está a **< 5 m del ancla**, con parada abierta | **Nada**: no se toca ni una columna |
| `POST` responde **200** (piso de 15 s) | **Nada**: el punto no se escribió, así que no se evalúa |
| Primer punto del viaje | **Nada**: no hay contra qué medir |
| `PATCH /api/trips/{trip}/finish` | La parada que siguiera abierta **se cierra** con `ended_at = now()` y **`endPositionId` queda en `null`** |
| `PATCH /{trip}/assignment`, `PATCH /{trip}/start`, `PATCH` general, `DELETE` del viaje | **Nada.** La baja lógica del viaje **conserva** sus paradas |

Un punto **nunca cierra y abre en la misma petición**: el punto que cierra una parada es, por definición, un punto en movimiento. Y un viaje **nunca tiene dos paradas abiertas a la vez**.

---

## 6. Tabla de mensajes de error (literales)

Se pueden mostrar tal cual al usuario; ya están en español.

| Código | Mensaje | Cuándo |
|:--:|---|---|
| 401 | `El token de sesión no es válido o ha expirado` | Sin token, manipulado o expirado |
| 403 | `No tienes permisos para consultar las paradas de un viaje` | Cualquier `pilot`, **incluido el asignado al viaje** |
| 403 | `No puedes acceder a un viaje que no pertenece a tu empresa transportista` | `carrier` que pide un viaje asignado por otra empresa |
| 404 | `El viaje no existe` | Id inexistente **o** viaje con baja lógica (indistinguibles) |

### Mensaje de éxito

| Código | Mensaje |
|:--:|---|
| 200 | `Paradas obtenidas correctamente` |

No hay 400, no hay 422 y no hay 201: este dominio solo lee.

---

## 7. Checklist de implementación en el frontend

- [ ] Cliente HTTP con `Authorization: Bearer` y `Accept: application/json`.
- [ ] `parseFloat` sobre `latitude`/`longitude` antes de pintar el pin de la parada.
- [ ] Mostrar `startedAt`/`endedAt` como **texto plano**; no parsearlos como ISO 8601.
- [ ] Tratar `endedAt === null` como **parada en curso** y pintarla distinta; su `durationMinutes` **también es `null`** — si quieres mostrar «lleva X min», calcúlalo tú contra `startedAt`, sabiendo que es una estimación local.
- [ ] Distinguir «cerrada porque arrancó» de «cerrada porque terminó el viaje» por **`endPositionId === null`**, no por la hora.
- [ ] **Filtrar el ruido en el cliente**: sin umbral mínimo de duración, los semáforos aparecen como paradas de 15–30 s. Un filtro por `durationMinutes >= N` casi siempre hace falta.
- [ ] En viajes largos o urbanos, **usar `limit`**, y **no asumir el tamaño pedido**: sube al piso de 10 y baja al techo de 100.
- [ ] Paginar leyendo `total`/`currentPage`/`lastPage` **de la raíz** del sobre, no de `meta`.
- [ ] Tratar `data: []` como «sin paradas registradas», no como error — y recordar que puede ser un viaje anterior a la spec.
- [ ] **No suscribirse a nada**: no hay evento de websocket para las paradas. Si el mapa está en vivo, refresca este `GET` cada cierto tiempo o al recibir puntos nuevos por `.trip.position.updated`.
- [ ] Ocultar la vista de paradas para el rol `pilot` (el 403 del servidor es la red, no la UX).
- [ ] No construir UI de alta, edición ni borrado de paradas: **no existen esos endpoints**.
- [ ] Cruzar `startPositionId`/`endPositionId` con `GET /api/trips/{trip}/positions` solo si necesitas el punto entero: la parada ya trae las coordenadas y la hora del ancla.

---

## 8. Lo que este dominio **no** hace (para no diseñarlo en el front)

- **No se crea, ni se edita, ni se borra nada.** Sin `POST`, sin `PATCH`, sin `DELETE`. Una parada mal detectada es historial y se queda.
- **No hay motivo de la parada**: sin `reason`, sin `type`, sin `notes`, sin catálogo de causas. Ni el piloto ni nadie explica por qué se detuvo.
- **No hay umbral mínimo de duración** ni filtros de ningún tipo (`open`, `dateFrom`, `dateTo`, `minDurationMinutes`, `sortDir`).
- **No hay tiempo total parado del viaje**: sumar `durationMinutes` es del consumidor.
- **No hay websocket, ni evento, ni canal nuevos.** El payload de `.trip.position.updated` sigue con sus seis claves.
- **El viaje no cambió de forma**: `TripResource` sigue con 34 claves y `TripListResource` con 15 — sin `openTimeoutId`, sin `isStopped`, sin `totalStoppedMinutes` — y la tabla `trips` no ganó ninguna columna.
- **`GET /api/trips/{trip}/positions` responde exactamente igual que antes**, y el `POST` de posiciones conserva su cuerpo de dos campos, sus cuatro guardas y su piso de 15 s.
- **No hay alertas ni geocercas**: nadie recibe correo ni push por un «lleva 40 min parado».
- **No hay telemetría**: ni velocidad, ni rumbo, ni precisión del GPS, ni motor encendido. La parada se deduce **solo** de la distancia entre dos puntos.
- **No hubo backfill**: los viajes anteriores a esta spec no tienen paradas, y un viaje que ya estaba `in_route` al desplegar empieza a detectarlas desde su siguiente punto.
- **No hay purga por antigüedad**: las paradas no se borran nunca, como las posiciones.
- **No hay job de cierre por inactividad**: si el piloto deja de reportar y nadie finaliza el viaje, la parada se queda abierta indefinidamente.
