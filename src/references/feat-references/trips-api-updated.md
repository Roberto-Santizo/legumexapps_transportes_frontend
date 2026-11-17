# Viajes de exportación — referencia de integración para el frontend

Referencia completa del dominio **Trips** de la API de Legumex Transportes: nueve endpoints REST bajo `/api/trips` (más `GET /api/trips/current`) para publicar viajes de exportación, que una empresa transportista toma y un piloto ejecuta.

Todo lo que hay aquí está verificado contra la implementación real de la rama `spec-24-trips` (rutas, FormRequests, Resource, Service y su suite de 244 tests), actualizado en la rama `spec-28-trip-traveled-polyline` con la ruta real del viaje, en la rama `spec-30-trip-estimates` con la distancia y la duración estimadas, en la rama `spec-32-trip-traveled-metrics` con la distancia y la duración **reales** en la rama `spec-41-trip-booking-and-reference` con el booking y la referencia en la rama `spec-42-trip-cancellation` con la cancelación y **actualizado en la rama `spec-43-trip-sales-order`** con la orden de venta (477 tests en `TripTest`, 156 en `TripServiceTest`). Los mensajes de error son literales: se pueden mostrar tal cual al usuario.

> **Qué cambió después de SPEC 24 y dónde está documentado.** El objeto `Trip` pasó de 32 a **42 claves** en seis specs aditivas, ninguna con ruta nueva: SPEC 25 añadió `pilotDpiImage` y `pilotLicenseImage` (→ `references/pilot-documents-api.md`), SPEC 27 añadió `totalFuelGallons` (→ `references/trip-fuels-api.md`), SPEC 28 añadió `traveledPolyline` y `traveledPoints`, la ruta real del viaje (§1.11, §4.1, §6.8), SPEC 30 añadió `estimatedKilometers` y `estimatedHours` (§1.12, §4, §6.2, §6.4), SPEC 31 añadió `totalExpensesAmount` (→ `references/trip-expenses-api.md`) y **SPEC 32 añade `traveledKilometers` y `traveledHours`, documentadas aquí** (§1.13, §4, §6.8). `TripListItem` pasa de 17 a **19 claves**: las dos nuevas también salen en el listado, como las estimaciones.

> **SPEC 43 añade la orden de venta, `ov`, y no rompe nada.** Es **opcional** en el `POST` (sigue en 16 campos obligatorios) y en el `PATCH`, donde `null`, `""` o solo espacios **la borran** con 200. Se normaliza como `reference` (MAYÚSCULAS, espacios colapsados), no es única y `null` significa «sin OV». Sale en el detalle **y** en el listado justo después de `reference`: `Trip` pasa a **50 claves** (51 en el detalle) y `TripListItem` a **23**. `search` busca también en ella. ⚠️ **El Excel de `GET /api/reports/trips` gana la columna «OV» en la B, para todos los roles**, y corre una posición todas las demás: quien lea el reporte por posición de columna debe ajustarse. Detalle en §1.16, §4, §6.1, §6.2, §6.4 y §6.10.

> ⚠️ **SPEC 42 añade un cuarto estado, `cancelled`, y una ruta nueva, `PATCH /api/trips/{trip}/cancel`** (solo `administrator` y `export`, solo desde `pending`). Un viaje cancelado **sigue visible** en el listado, el detalle, el tablero y el Excel, pero **cualquier escritura posterior responde 400 «El viaje está cancelado»** —incluidas las cargas, los viáticos, los gastos emergentes y las líneas de productos—; el `DELETE` sigue permitido. `Trip` gana `cancelledAt` y `cancelledByName` tras `endDate`: 49 claves (50 en el detalle; **50/51 desde SPEC 43**). `TripListItem` sigue en 22 (**23 desde SPEC 43**). El `PATCH` general con `status: "cancelled"` es **422**. ⚠️ **Un `switch` sobre `status` sin rama `cancelled` cae en su rama por defecto**: despliega el front junto al back. Detalle en §1.15, §4, §6.9 y §8.

> ⚠️ **SPEC 41 es un cambio incompatible en el body del alta, sin periodo de gracia.** El `POST` pasa de **15 a 16 campos obligatorios**: `booking` (el booking de la naviera) es obligatorio y `reference` (referencia comercial) es opcional. Un `POST` sin `booking` es **422 «El booking es obligatorio»**. Las dos claves salen en el detalle **y** en el listado, justo después de `container`, y `search` las barre. Tras SPEC 41 `Trip` tenía **47 claves** (48 en el detalle); desde SPEC 42 tiene 49 (50), desde SPEC 43 **50** (51), y `TripListItem` **23**. El despliegue del front debe ir junto al del back. Detalle en §1.14, §4, §6.1, §6.2 y §6.4.

> **Claves que llegaron entre SPEC 32 y SPEC 41 y se documentan en su propia referencia:** `statusLabel` en el listado, `positions` en el detalle (`references/trip-positions-api.md`), `totalEmergencyExpensesAmount` (`references/trip-emergency-expenses-api.md`), `bonus` (`references/trip-bonus-api.md`), `cargoInsurance` (`references/trip-cargo-insurance-api.md`) y el campo `products` del alta (`references/trip-finished-products-api.md`). Aquí salen en los objetos y tipos para que los conteos cuadren.

> **SPEC 32 no rompe nada.** No hay ruta nueva, ningún body cambia y ningún campo nuevo se acepta: las dos claves las **calcula el servidor** al cerrar el viaje con `/finish`. Un front que ignore las dos claves nuevas sigue funcionando igual.

> ⚠️ **SPEC 30 es un cambio incompatible en el body, sin periodo de gracia.** El `POST` pasa de **12 a 14 campos obligatorios** (`estimatedKilometers`, `estimatedHours`) y el `PATCH` general exige que `polyline`, `estimatedKilometers` y `estimatedHours` viajen **juntos o ninguno**: un `PATCH` con solo `polyline`, válido hasta ahora, es **422**. El despliegue del front debe ir junto al del back.

> Documentación OpenAPI viva: `/api/documentation`.

---

## 1. Lo mínimo que hay que saber antes de escribir código

1. **Un viaje no pertenece a ninguna empresa: la empresa se lo queda al tomarlo.** No existe `carrierId` en la tabla. Un viaje nace sin dueño operativo, y cuando una empresa lo asigna, ese acto es lo que lo hace suyo. Todo el ámbito de lectura sale de ahí — es lo que el contrato no puede contarte y está entero en §3.
2. **Un viaje que nadie toma se queda atascado para siempre.** El administrador **no puede asignar** (`/assignment` es solo del `carrier`) y **nadie puede desasignar** (ninguna vía devuelve `pilotId`/`vehicleId` a `null`). Si ninguna empresa lo toma, o lo toma la equivocada y no lo suelta, la única salida por API es **borrar el viaje y crearlo de nuevo**. Diseña la pantalla contando con eso.
3. **La ruta prevista no se recalcula sola, nunca, y desde SPEC 30 son tres campos.** `polyline`, `estimatedKilometers` y `estimatedHours` los manda el front, sacados de la **misma** respuesta de `GET /api/places/directions` (`polyline`, `distanceKilometers`, `durationHours`) y sin convertir nada. Si un `PATCH` cambia `locationId` o `departurePointId` y no remandas los tres en el **mismo** `PATCH`, los guardados quedan mintiendo **a la vez** y **la API no avisa de nada**: el mapa dibujará una ruta que ya no corresponde y la tabla mostrará kilómetros de otro destino.
4. **`status` no tiene máquina de estados y puede contradecir a las fechas.** El administrador mueve `pending`, `in_route` y `finished` a mano en cualquier orden (`cancelled` no: ver §1.15): un `finished` puede volver a `pending` conservando `startDate` y `endDate`. Cuando el estado y las fechas se contradigan, **pinta el relato desde las fechas**.
5. **El `PATCH` general ignora en silencio lo que no le toca.** Mandar `pilotId`, `vehicleId`, `assignedBy` o `registeredBy` responde **200 sin cambiar nada**. No hay error que te avise de que tu campo no se aplicó.
6. **Reparto 422 / 400: un id inventado es 422, un id borrado o inservible es 400.** Las cuatro claves foráneas llevan `exists:`, que lee la tabla en crudo y **no ve el borrado lógico**: un `clientId` de un cliente borrado pasa la validación y lo para el service con un 400. Son dos formatos de respuesta distintos (§5).
7. **Toda respuesta viaja en un sobre** `{ statusCode, message, data }`… **salvo el 422**, que usa el formato de Laravel `{ message, errors }`.
8. **`DELETE` borra de verdad** (baja lógica irreversible): el viaje desaparece del listado y del detalle, **no hay `/restore`** y no existe ningún parámetro que devuelva los borrados. Es para el viaje **creado por error**; el viaje real que no se hará se **cancela** (§1.15).
9. **El cuerpo va en camelCase y las fechas vuelven en `d-m-Y h:i:s A`, no en ISO 8601.** Lo que envías y lo que recibes **no tienen el mismo formato de fecha** (§4).
10. **El listado y el detalle NO devuelven el mismo objeto.** `GET /api/trips` devuelve un `TripListItem` de **23 claves** —una vista de tabla—; los otros ocho endpoints devuelven el `Trip` completo de **50** (51 en `GET /api/trips/{trip}` con `positions`, salvo para el piloto). En el listado no vienen los **ids de las relaciones**, ni `polyline`, ni `points`, ni las dos claves de la ruta real, ni las marcas de tiempo: para el mapa y para cualquier id hay que pedir el detalle (§4).
11. **Hay dos polilíneas y no son la misma (SPEC 28).** `polyline`/`points` es la ruta **prevista** que mandó el front; `traveledPolyline`/`traveledPoints` es la ruta **real**, el rastro de `GET /api/trips/{trip}/positions` codificado por el servidor **una sola vez, al cerrar el viaje con `/finish`**. Mientras el viaje no esté finalizado valen `null` y `[]` **aunque esté `in_route` con miles de puntos reportados**: para el rastro en vivo siguen el websocket y las posiciones. Nadie manda esas claves en ningún body: se ignoran en silencio.
12. **Los kilómetros y las horas estimadas salen como cadena, valen `null` solo en viajes viejos, y en el `PATCH` viajan con la polilínea o no viajan (SPEC 30).** `estimatedKilometers` (`"104.32"`) y `estimatedHours` (`"1.75"`, **horas decimales**, no minutos) son strings de dos decimales que hay que parsear para operar. **`null` significa exactamente «viaje creado antes de SPEC 30»**: no hubo backfill y por la API no se puede crear ni editar un viaje que quede sin ellos. En el `PATCH`, mandar uno solo o dos de los tres campos de la ruta es **422**, con un mensaje por cada campo que falta. La API **no** calcula, recalcula ni coteja los números con `polyline` ni con el recorrido real: si mandas 1000 km con una línea de 5 km, se guardan. Tampoco son un ETA. Sí salen en el listado.
13. **Los kilómetros y las horas reales los calcula el servidor al cerrar, son datos brutos, y `null` y `"0.00"` no significan lo mismo (SPEC 32).** `traveledKilometers` (`"111.40"`) y `traveledHours` (`"2.10"`, **horas decimales**) son el espejo real de las dos estimaciones: mismo formato de cadena de dos decimales, misma escala, para pintar «estimado 104.32 km · 1.75 h — real 111.40 km · 2.10 h» sin convertir nada. **Nadie los manda**: se calculan **una sola vez**, en `PATCH /api/trips/{trip}/finish`, y mandarlos en cualquier body se ignora en silencio con 200/201. `traveledKilometers` es la **suma Haversine en crudo** de todos los segmentos consecutivos del rastro de `GET /api/trips/{trip}/positions`: **no filtra el ruido GPS** de un camión parado (el jitter de 2-4 m cada 15 s suma) ni un salto espurio del dispositivo, así que puede venir inflado. `traveledHours` es `endDate − startDate`, **tiempo bruto**: no descuenta las paradas de `GET /api/trips/{trip}/timeouts`. **`null` significa «el viaje no ha terminado» o «terminó antes de SPEC 32»** (sin backfill); un viaje que terminó **sin puntos o con uno solo** vale **`"0.00"`**, a diferencia de `traveledPolyline`, que ahí queda `null`. La API **no compara** estimado con real: el desvío o el retraso es una resta tuya. Sí salen en el listado y en `GET /api/trips/current` (siempre `null` ahí: un viaje en curso no ha terminado).
14. **El booking es obligatorio al crear, la referencia no, y los dos se normalizan como la orden (SPEC 41).** `booking` es el número de booking de la naviera: **obligatorio en el `POST`** (16 campos obligatorios desde SPEC 41) y **no vaciable** en el `PATCH` (`null`, `""` o solo espacios son 422). `reference` es una referencia comercial **opcional**: en el `POST` se puede omitir, y vacía, de solo espacios o `null` se guarda **`null`**; en el `PATCH` mandarla en `null`, `""` o en blanco **la borra** con 200 —junto con `ov` (§1.16), son las **dos únicas** claves del `PATCH` que se pueden vaciar—. Los dos se guardan como `order` y `container`: **MAYÚSCULAS con espacios colapsados** (`"  bk-2026   001  "` → `"BK-2026 001"`), y **ninguno es único**: un booking puede cubrir varios contenedores y, por tanto, varios viajes. ⚠️ **`booking: null` significa exactamente «viaje creado antes de SPEC 41»** (sin backfill); un administrador puede completarlo por `PATCH`. `reference: null` es «sin referencia», legítimo en cualquier viaje. `search` del listado busca también en los dos.
15. **Cancelar no es borrar, y un cancelado es de solo lectura (SPEC 42).** `PATCH /api/trips/{trip}/cancel` (solo `administrator` y `export`, sin cuerpo) lleva un viaje **`pending`** —libre o asignado— a `status: "cancelled"` y escribe `cancelledAt` (hora del servidor) y `cancelledByName` (el usuario del token). **No toca nada más**: la tripulación, `bonus`, `cargoInsurance`, las cargas, los viáticos y las líneas de productos se quedan como registro, y el viaje **no vuelve a la bolsa**. Es **irreversible** (no hay descancelar). Desde ese momento **toda escritura** sobre el viaje responde **400 «El viaje está cancelado»**: el `PATCH` general (aunque el cuerpo venga vacío), `/assignment`, `/start`, `/finish`, `POST /fuels`, `POST /expenses`, las dos confirmaciones (también la reconfirmación, que antes era 200), `POST`/`PATCH`/`DELETE` de gastos emergentes y `POST`/`PATCH`/`DELETE` de líneas de productos terminados. Las lecturas siguen igual y **el `DELETE` del viaje sigue permitido**. Quien no alcanza el viaje (otra empresa, otro piloto) sigue recibiendo su **403**, no el 400. El `PATCH` general **no cancela**: `status: "cancelled"` ahí es **422**.
16. **La orden de venta (`ov`) es opcional, se normaliza como la referencia y se puede borrar (SPEC 43).** En el `POST` se puede omitir —el alta **sigue en 16 campos obligatorios**—, y omitida, `""`, de solo espacios o `null` se guarda **`null`** con 201. En el `PATCH` mandarla en `null`, `""` o en blanco **la borra** con 200; omitirla **no** la toca. Se guarda en **MAYÚSCULAS con espacios colapsados** (`"  ov-2026   15  "` → `"OV-2026 15"`), **no es única** (una OV puede cubrir varios viajes, de cualquier cliente) y no se valida su formato. `ov: null` es «sin OV», legítimo en cualquier viaje, anterior o posterior a la spec: no hubo backfill. Sale en el detalle y en el listado, la ve también `shipment` (no es dinero), `search` busca en ella y el Excel de `GET /api/reports/trips` la pinta en la **columna B**. `/assignment`, `/start`, `/finish` y `/cancel` no la leen ni la escriben.

---

## 2. Autenticación y permisos

Todos los endpoints exigen el token JWT que devuelve el login:

```
Authorization: Bearer {token}
Accept: application/json
```

Sin token, o con uno expirado, las diez rutas responden **401**:

```json
{ "statusCode": 401, "message": "El token de sesión no es válido o ha expirado", "data": null }
```

| Acción | `administrator` | `carrier` | `pilot` | `manager` |
|---|:--:|:--:|:--:|:--:|
| `GET /api/trips` — listar | ✅ | ✅ | ✅ | ✅ |
| `GET /api/trips/{trip}` — detalle | ✅ | ✅ | ✅ | ✅ |
| `POST /api/trips` — publicar | ✅ | 403 | 403 | 403 |
| `PATCH /api/trips/{trip}` — editar | ✅ | 403 | 403 | 403 |
| `DELETE /api/trips/{trip}` — dar de baja | ✅ | 403 | 403 | 403 |
| `PATCH /api/trips/{trip}/assignment` — tomar | 403 | ✅ + empresa | 403 | 403 |
| `PATCH /api/trips/{trip}/start` — arrancar | 403 | 403 | ✅ asignado | 403 |
| `PATCH /api/trips/{trip}/finish` — cerrar | 403 | 403 | ✅ asignado | 403 |
| `PATCH /api/trips/{trip}/cancel` — cancelar (SPEC 42) | ✅ | 403 | 403 | 403 |

> Los roles `export`, `user` y `shipment` (fuera de esta tabla) se describen en `references/roles-api.md`. Para `/cancel`: **`export` puede cancelar** igual que el `administrator`; `user` y `shipment` reciben 403. Ninguna de las dos lleva `carrier.required`.

**Los cuatro roles leen** — no hay `role:` en las dos rutas de lectura. Lo que cada uno *ve* lo decide el ámbito (§3), no el middleware.

**`carrier.required` actúa solo en `/assignment`.** Un `carrier` que todavía no ha registrado su empresa recibe 403 **antes de llegar al service**:

```json
{ "statusCode": 403, "message": "Debes estar vinculado a un transportista para acceder a este recurso", "data": null }
```

Un rol sin permiso para la ruta recibe:

```json
{ "statusCode": 403, "message": "No tienes permisos para acceder a este recurso", "data": null }
```

⚠️ **Ojo con `/start` y `/finish`:** el rol `pilot` abre la puerta, pero dentro el service comprueba que seas **el piloto asignado a ese viaje**. Otro piloto recibe 403 con un mensaje distinto (§8).

---

## 3. El ámbito de lectura: quién ve qué

**Esto es lo único que no puedes deducir del contrato, y gobierna el listado y el detalle por igual.**

| Rol | Qué ve |
|---|---|
| `administrator` | **Todos** los viajes, asignados o no. |
| `manager` | **Todos** los viajes, asignados o no. |
| `carrier` | La **bolsa** (`status: "pending"` con `pilotId` **y** `vehicleId` en `null`) **más** todos los viajes asignados por **su propia empresa** —incluidos los que se cancelaron después—. Un viaje **cancelado sin asignar** no está en la bolsa (que es solo `pending`) y **no le aparece**. |
| `pilot` | **Solo** aquellos donde `pilotId` es él. **La bolsa no le aparece.** |

Tres consecuencias que se ven en pantalla:

- **En cuanto la empresa A asigna un viaje, ese viaje desaparece del listado de la empresa B.** Para B deja de existir: ni en el listado, ni en el detalle. Si tienes el viaje cacheado en el front, invalídalo.
- **El ámbito es de la empresa, no de la persona.** `assignedById` guarda al **usuario** que asignó, pero la comparación se hace contra su **empresa**: un compañero de la empresa A ve el viaje que tomó su colega, y puede reasignarlo. Sigue viéndose aunque ese colega cause baja.
- **El piloto tiene una agenda, no un catálogo.** No le muestres un buscador de viajes disponibles: no puede tomarlos y su listado solo trae los suyos.

**El ámbito se aplica antes que los filtros.** Ninguna combinación de query params lo salta: `?status=pending` desde la empresa B **no** revela los viajes que ya tomó la A.

**Fuera de ámbito el detalle responde 403, no 404.** El viaje existe y la API no lo niega; simplemente no es tuyo.

---

## 4. Los dos objetos: `Trip` (detalle) y `TripListItem` (listado)

El dominio pinta **dos formas distintas** y conviene tipar las dos:

| Dónde | Objeto | Claves |
|---|---|---|
| `GET /api/trips` y `GET /api/trips/current` (cada elemento de `data`) | `TripListItem` | **23** |
| `GET /api/trips/{trip}` (`data`) | `Trip` + `positions` | **51** (50 para el piloto asignado, que no recibe `positions`) |
| Los otros siete endpoints (`data`), `/cancel` incluido | `Trip` | **50** |

> ⚠️ **No asumas que una fila del listado se puede pasar a la pantalla de detalle.** Le faltan los ids de las relaciones y la ruta: al abrir un viaje hay que pedir `GET /api/trips/{trip}`.

### 4.1 El objeto `Trip` (detalle y escrituras)

Es lo que devuelve `data` en los ocho endpoints que no son el listado. **50 claves**, siempre en camelCase y siempre en este orden (`GET /api/trips/{trip}` añade al final una 51.ª, `positions`, salvo para el piloto):

```json
{
  "id": 1,
  "order": "ORD-2026 0148",
  "status": "pending",
  "clientId": 3,
  "clientName": "AGROEXPORT S.A.",
  "shippingLineId": 2,
  "shippingLineName": "MAERSK LINE",
  "departurePointId": 5,
  "departurePointName": "PLANTA SAN JUAN",
  "locationId": 9,
  "locationName": "PUERTO QUETZAL",
  "destination": "Rotterdam, Países Bajos",
  "container": "MSKU 483920 1",
  "booking": "BK-2026 001",
  "reference": "PEDIDO CLIENTE-77",
  "ov": "OV-2026 15",
  "transport": "Rastra 40 pies",
  "recolectionDate": "02-09-2026 06:00:00 AM",
  "shipDate": "04-09-2026 11:30:00 PM",
  "startDate": null,
  "endDate": null,
  "cancelledAt": null,
  "cancelledByName": null,
  "polyline": "_p~iF~ps|U_ulLnnqC_mqNvxq`@",
  "points": [[38.5, -120.2], [40.7, -120.95], [43.252, -126.453]],
  "estimatedKilometers": "104.32",
  "estimatedHours": "1.75",
  "traveledPolyline": null,
  "traveledPoints": [],
  "traveledKilometers": null,
  "traveledHours": null,
  "observations": "Carga refrigerada a -2 °C.",
  "pilotId": null,
  "pilotName": null,
  "pilotDpiImage": null,
  "pilotLicenseImage": null,
  "vehicleId": null,
  "vehiclePlate": null,
  "vehicleImage": null,
  "assignedById": null,
  "assignedByName": null,
  "registeredByName": "Roberto Santizo",
  "totalFuelGallons": "0.00",
  "totalExpensesAmount": "0.00",
  "totalEmergencyExpensesAmount": "0.00",
  "bonus": null,
  "cargoInsurance": null,
  "createdAt": "27-08-2026 09:14:03 AM",
  "updatedAt": "27-08-2026 09:14:03 AM",
  "deletedAt": null
}
```

| Campo | Tipo | Notas para el front |
|---|---|---|
| `id` | `number` | Es el `{trip}` de las seis rutas de detalle y acción. |
| `order` | `string` | **Siempre en MAYÚSCULAS** con espacios internos colapsados. **No es único**: dos viajes pueden compartirlo. Pinta lo que devuelve la respuesta, no lo que tecleó el usuario. |
| `status` | `"pending" \| "in_route" \| "finished" \| "cancelled"` | **Valor crudo del enum, en inglés y sin traducir.** La traducción es cosa tuya. `cancelled` desde SPEC 42: solo lo escribe `/cancel` y deja el viaje en solo lectura. |
| `clientId` / `clientName` | `number` / `string \| null` | Relación **plana**, nunca objeto anidado. |
| `shippingLineId` / `shippingLineName` | `number` / `string \| null` | Ídem. |
| `departurePointId` / `departurePointName` | `number` / `string \| null` | Ídem. |
| `locationId` / `locationName` | `number` / `string \| null` | El **puerto** de destino. Siempre una `location` de tipo `port`. |
| `destination` | `string` | Destino final en el extranjero. **Texto libre**: no lo respalda ningún catálogo, no es una `location` y no se puede filtrar por él. Se guarda **tal como se teclea**. |
| `container` | `string` | **MAYÚSCULAS** con espacios colapsados, como `order`. **Tampoco es único.** |
| `booking` | `string \| null` | **Booking de la naviera (SPEC 41).** MAYÚSCULAS con espacios colapsados, como `order`. **No es único**: un booking cubre varios viajes. Obligatorio por la API, así que ⚠️ **`null` solo en viajes creados antes de SPEC 41** (sin backfill). Visible para todos los roles, `shipment` incluido. |
| `reference` | `string \| null` | **Referencia comercial opcional (SPEC 41).** Misma normalización. `null` = «sin referencia»: **nunca** sale como cadena vacía. No es única. Visible para todos los roles. |
| `ov` | `string \| null` | **Orden de venta opcional (SPEC 43).** MAYÚSCULAS con espacios colapsados, como `reference`. `null` = «sin OV», legítimo en cualquier viaje: **nunca** sale como cadena vacía. **No es única**: una OV puede cubrir varios viajes. Visible para todos los roles, `shipment` incluido. |
| `transport` | `string` | Medio o empresa de transporte, **tal como se teclea**. Descriptivo: no tiene relación con el `vehicleId` que asigne después el transportista. |
| `recolectionDate` / `shipDate` | `string` | Lo **planificado**. ⚠️ Formato `d-m-Y h:i:s A`, ver abajo. |
| `startDate` / `endDate` | `string \| null` | Lo **ejecutado**. `null` hasta que el piloto llama a `/start` y `/finish`. Los pone el servidor. |
| `cancelledAt` | `string \| null` | **Cuándo se canceló (SPEC 42)**, con la hora del servidor, formato `d-m-Y h:i:s A`. `null` salvo en un viaje cancelado. Ningún body la acepta. |
| `cancelledByName` | `string \| null` | **Nombre de quien canceló (SPEC 42)**, un `administrator` o `export`, tomado del token. `null` salvo en un viaje cancelado. Sin id al lado. Visible para todos los roles. |
| `polyline` | `string` | Polilínea codificada de Google, tal como la mandó el front. **Puede quedar obsoleta** tras un `PATCH` (§1.3). |
| `points` | `[number, number][]` | Pares `[lat, lng]` **decodificados de `polyline`** en cada lectura. Campo calculado, sin columna y sin caché. Coincide con lo que devuelve `GET /api/places/directions` para la misma cadena. |
| `estimatedKilometers` | `string \| null` | **Distancia estimada de la ruta prevista, en kilómetros (SPEC 30)**, cadena de dos decimales (`"104.32"`) como `totalFuelGallons`: parsear antes de operar. Es el `distanceKilometers` de `GET /api/places/directions` para esa misma `polyline`, mandado por el front y guardado tal cual: la API **no lo calcula ni lo comprueba** contra la línea ni contra el rastro. Queda obsoleto junto a `polyline` tras un `PATCH` que cambie el destino sin remandar la ruta (§1.3). ⚠️ **`null` solo en viajes creados antes de SPEC 30** (sin backfill). |
| `estimatedHours` | `string \| null` | **Duración estimada, en horas decimales (SPEC 30)**: `"1.75"` es 1 h 45 min, no «1:75». Cadena de dos decimales. Es el `durationHours` de `/places/directions`, sin convertir. **No es un ETA**: no mira `startDate` ni el rastro. `"0.00"` es legítimo (ruta muy corta redondeada). ⚠️ `null` solo en viajes anteriores a SPEC 30. |
| `traveledPolyline` | `string \| null` | **Ruta real (SPEC 28).** Todo el rastro de `trip_positions` del viaje, en orden `recordedAt asc, id asc`, codificado en el **mismo formato de Google** que `polyline`, tal cual se reportó: sin simplificar y sin colapsar puntos repetidos (un camión parado deja puntos iguales). **La escribe el servidor una sola vez, en `/finish`**; ningún body la acepta. ⚠️ **`null` por tres motivos que la API no distingue:** el viaje no ha terminado (aunque esté `in_route` con rastro reportado), terminó sin ni un punto, o terminó antes de SPEC 28 (sin backfill). |
| `traveledPoints` | `[number, number][]` | Pares `[lat, lng]` **decodificados de `traveledPolyline`** en cada lectura, el espejo de `points` para la ruta real. **`[]` —lista vacía, nunca `null`— siempre que `traveledPolyline` sea `null`.** ⚠️ Coordenadas a **cinco decimales** (formato de Google, ~1 m de pérdida), no a los ocho de `GET /api/trips/{trip}/positions`: el rastro exacto sigue allí. |
| `traveledKilometers` | `string \| null` | **Distancia real recorrida, en kilómetros (SPEC 32)**, cadena de dos decimales (`"111.40"`) en la **misma escala y formato** que `estimatedKilometers`: parsear antes de operar. **La calcula el servidor una sola vez, en `/finish`**: suma Haversine de cada par de puntos consecutivos del rastro de `trip_positions` (orden `recordedAt asc, id asc`, con los ocho decimales de la tabla), `/ 1000`, redondeada a dos decimales. ⚠️ **Es una suma en crudo**: no descarta el ruido GPS de un camión parado ni saltos espurios; el rastro exacto sigue en `GET /api/trips/{trip}/positions` para auditar. ⚠️ **`null` = no ha terminado o terminó antes de SPEC 32** (sin backfill); **`"0.00"` = terminó con cero o un punto**. No confundir con `traveledPolyline`, que en ese caso es `null`. Ningún body la acepta. |
| `traveledHours` | `string \| null` | **Duración real del viaje, en horas decimales (SPEC 32)**: `"2.10"` es 2 h 6 min. Cadena de dos decimales, espejo de `estimatedHours`. `endDate − startDate`, con el **mismo instante** que se escribe en `endDate`. ⚠️ **Tiempo bruto**: no descuenta las paradas de `GET /api/trips/{trip}/timeouts`; el tiempo neto en movimiento no existe en la API. `null` mientras el viaje no ha terminado o si terminó antes de SPEC 32. Ningún body la acepta. |
| `observations` | `string` | **Obligatorio**, nunca `null`. Si el alta la hace el administrador y el viaje lo ejecuta otra empresa, es el único canal de instrucciones que hay. |
| `pilotId` / `pilotName` | `number \| null` / `string \| null` | `null` mientras nadie haya tomado el viaje. |
| `pilotDpiImage` / `pilotLicenseImage` | `string \| null` | URLs absolutas de los documentos del piloto asignado (SPEC 25). Detalle en `references/pilot-documents-api.md`. |
| `vehicleId` / `vehiclePlate` | `number \| null` / `string \| null` | Ídem. Fíjate: aquí el par es id + **placa**, no id + nombre. |
| `vehicleImage` | `string \| null` | URL **absoluta** de la imagen del vehículo asignado, lista para `src` (cuadrado 800x800). Es la **única relación con tres claves**, y sigue plana: no hay objeto `vehicle`. ⚠️ **Dos motivos distintos para el `null`** y desde aquí no se distinguen: el viaje sigue en la bolsa (`vehicleId` también `null`) o el vehículo no tiene imagen (`vehicleId` con valor). **No sale en el listado.** |
| `assignedById` / `assignedByName` | `number \| null` / `string \| null` | El **usuario** que asignó. El ámbito compara su **empresa** (§3). |
| `registeredByName` | `string \| null` | El administrador que publicó el viaje. Nunca se envía en el body y el `PATCH` **no** lo reescribe. No hay `registeredById`. |
| `totalFuelGallons` | `string` | Galones **confirmados** del viaje, cadena de dos decimales (SPEC 27). Detalle en `references/trip-fuels-api.md`. |
| `totalExpensesAmount` | `string` | Viáticos **confirmados** del viaje en GTQ, cadena de dos decimales (SPEC 31). Detalle en `references/trip-expenses-api.md`. |
| `totalEmergencyExpensesAmount` | `string` | Gastos emergentes del viaje en GTQ, cadena de dos decimales (SPEC 39). Detalle en `references/trip-emergency-expenses-api.md`. |
| `bonus` / `cargoInsurance` | `string \| null` | Bonificación y seguro de la carga que fija el transportista en `/assignment`. Detalle en `references/trip-bonus-api.md` y `references/trip-cargo-insurance-api.md`. |
| `createdAt` / `updatedAt` | `string \| null` | ⚠️ Formato `d-m-Y h:i:s A`. |
| `deletedAt` | `string \| null` | **`null` en siete de los ocho endpoints que lo pintan** (el listado ni siquiera trae la clave). Solo trae valor en la respuesta del `DELETE`, que pinta la fila recién dada de baja. |
| `positions` | `[number, number][]` | **Solo en `GET /api/trips/{trip}` y nunca para el piloto.** El rastro reportado como pares `[lat, lng]`. Detalle en `references/trip-positions-api.md`. |

### 4.2 El objeto `TripListItem` (solo el listado)

Cada elemento de `data` en `GET /api/trips` (y el `data` de `GET /api/trips/current`). **23 claves**, en este orden:

```json
{
  "id": 1,
  "order": "ORD-2026 0148",
  "status": "pending",
  "statusLabel": "Pendiente",
  "shippingLineName": "MAERSK LINE",
  "departurePointName": "PLANTA SAN JUAN",
  "locationName": "PUERTO QUETZAL",
  "container": "MSKU 483920 1",
  "booking": "BK-2026 001",
  "reference": null,
  "ov": "OV-2026 15",
  "recolectionDate": "02-09-2026 06:00:00 AM",
  "shipDate": "04-09-2026 11:30:00 PM",
  "startDate": null,
  "endDate": null,
  "estimatedKilometers": "104.32",
  "estimatedHours": "1.75",
  "traveledKilometers": null,
  "traveledHours": null,
  "observations": "Carga refrigerada a -2 °C.",
  "pilotName": null,
  "vehiclePlate": null,
  "registeredByName": "Roberto Santizo"
}
```

Los campos que sí vienen significan **exactamente lo mismo** que en `Trip` (mismo formato de fecha `d-m-Y h:i:s A`, mismo `status` crudo en inglés, mismos nombres de relación en MAYÚSCULAS, mismas cadenas de dos decimales en `estimatedKilometers`, `estimatedHours`, `traveledKilometers` y `traveledHours`).

> **SPEC 30 es la primera spec aditiva que toca el listado.** `estimatedKilometers` y `estimatedHours` sí vienen aquí —al revés que `polyline`/`points`— porque son dos escalares baratos: bastan para pintar «104.32 km · 1.75 h» en cada fila sin pedir el detalle. Van entre `endDate` y `observations`, y también en `GET /api/trips/current`, que usa este mismo objeto.

> **SPEC 41 añade `booking` y `reference` justo después de `container`**, con el mismo valor y el mismo `null` que en el detalle: en la tabla se leen al lado del contenedor. `statusLabel` (justo después de `status`) es el estado ya traducido —`Pendiente`, `En ruta`, `Finalizado` y, desde SPEC 42, `Cancelado`— y solo sale en el listado. **SPEC 42 no añade claves al listado**: `cancelledAt` y `cancelledByName` solo vienen en el detalle. **SPEC 43 añade `ov` justo después de `reference`**, con el mismo valor y el mismo `null` que en el detalle, también en `GET /api/trips/current`.

> **SPEC 32 hace lo mismo con la ruta real.** `traveledKilometers` y `traveledHours` van justo después de `estimatedHours` y antes de `observations`, con el mismo formato: cuatro cadenas seguidas para pintar «estimado vs real» en cada fila de un viaje `finished`. En todo viaje `pending` o `in_route` —incluido el de `GET /api/trips/current`— son `null`; en uno `finished` sin puntos, `"0.00"`.

**Las 28 claves del `Trip` que NO están (29 con `positions`) y dónde conseguirlas:**

| Ausente en el listado | Cómo obtenerlo |
|---|---|
| `clientId`, `clientName` | `GET /api/trips/{trip}`. El listado **no dice de qué cliente es el viaje**: si la tabla necesita esa columna, hay que pedirlo. |
| `shippingLineId`, `departurePointId`, `locationId` | `GET /api/trips/{trip}`. Del listado solo salen los **nombres**, así que un «filtrar por esta naviera» hecho desde una fila necesita el id del catálogo (`GET /api/shipping-lines`, `/api/departure-points`, `/api/locations`), no el de la fila. |
| `pilotId`, `vehicleId`, `vehicleImage` | `GET /api/trips/{trip}`. En el listado, un viaje **de la bolsa** se reconoce por `pilotName === null && vehiclePlate === null`. La **foto del vehículo tampoco viene**: la tabla se queda con la placa. |
| `assignedById`, `assignedByName` | `GET /api/trips/{trip}`. ⚠️ **El truco de separar la bolsa por `assignedById === null` no sirve aquí**: usa los dos `null` de arriba. |
| `destination`, `transport` | `GET /api/trips/{trip}`. Ojo: `locationName` es el **puerto**, no el destino final en el extranjero. |
| `polyline`, `points` | `GET /api/trips/{trip}`. **El listado no decodifica ninguna polilínea**, así que desde una fila no se puede pintar el mapa (ni una miniatura). |
| `traveledPolyline`, `traveledPoints` | `GET /api/trips/{trip}`. Misma razón: un `limit=100` no decodifica cien rastros. Tampoco vienen en `GET /api/trips/current`, que usa `TripListItem`. |
| `pilotDpiImage`, `pilotLicenseImage`, `totalFuelGallons`, `totalExpensesAmount`, `totalEmergencyExpensesAmount`, `bonus`, `cargoInsurance` | `GET /api/trips/{trip}`. Ver `references/pilot-documents-api.md`, `references/trip-fuels-api.md`, `references/trip-expenses-api.md`, `references/trip-emergency-expenses-api.md`, `references/trip-bonus-api.md` y `references/trip-cargo-insurance-api.md`. |
| `positions` | Solo `GET /api/trips/{trip}`, y nunca para el piloto. |
| `cancelledAt`, `cancelledByName` | `GET /api/trips/{trip}`. En el listado un cancelado se reconoce por `status === "cancelled"` / `statusLabel === "Cancelado"`. |
| `createdAt`, `updatedAt`, `deletedAt` | `GET /api/trips/{trip}`. No se puede ordenar ni mostrar «último cambio» desde el listado. |

Lo demás del contrato del listado **no cambia**: mismo ámbito por rol (§3), los mismos diez query params tolerantes, el mismo orden fijo y la misma paginación opt-in (§6.1).
### ⚠️ Las fechas: entra en un formato, sale en otro

- **De salida**, las ocho fechas (`cancelledAt` incluida) usan el formato propio **`d-m-Y h:i:s A`** (`02-09-2026 06:00:00 AM`): día-mes-año con reloj de 12 horas y AM/PM. **No es ISO 8601** y `new Date(...)` sobre él **no funciona**. Está pensado para mostrarse tal cual; si necesitas un `Date`, parsea a mano.
- **De entrada**, `recolectionDate` y `shipDate` aceptan cualquier formato que Laravel parsee — usa ISO 8601 o `Y-m-d H:i:s`. **No mandes el formato de salida.**
- Los filtros `dateFrom`/`dateTo` van en **`Y-m-d` estricto** (§6.1).

### Tipos TypeScript sugeridos

```ts
export type TripStatus = 'pending' | 'in_route' | 'finished' | 'cancelled';

/** Par [latitud, longitud]. */
export type LatLng = [number, number];

/** Lo que devuelve GET /api/trips: 23 claves, sin ids de relación y sin ruta (pero con las dos estimaciones y las dos métricas reales). */
export interface TripListItem {
  id: number;
  order: string;
  status: TripStatus;
  /** El estado ya traducido: 'Pendiente' | 'En ruta' | 'Finalizado' | 'Cancelado'. */
  statusLabel: string;
  shippingLineName: string | null;
  departurePointName: string | null;
  locationName: string | null;
  container: string;
  /** SPEC 41 — MAYÚSCULAS; null solo en viajes anteriores a la spec. */
  booking: string | null;
  /** SPEC 41 — opcional; null = sin referencia. */
  reference: string | null;
  /** SPEC 43 — orden de venta opcional, MAYÚSCULAS; null = sin OV. */
  ov: string | null;
  /** Formato d-m-Y h:i:s A, NO ISO 8601. */
  recolectionDate: string;
  shipDate: string;
  startDate: string | null;
  endDate: string | null;
  /** SPEC 30 — cadena de dos decimales ("104.32" km, "1.75" h decimales); null solo en viajes anteriores a la spec. */
  estimatedKilometers: string | null;
  estimatedHours: string | null;
  /** SPEC 32 — cadena de dos decimales calculada por el servidor en /finish; null hasta que el viaje termina, "0.00" si terminó sin puntos. */
  traveledKilometers: string | null;
  traveledHours: string | null;
  observations: string;
  /** null mientras el viaje siga en la bolsa. */
  pilotName: string | null;
  vehiclePlate: string | null;
  registeredByName: string | null;
}

/** Lo que devuelven los otros ocho endpoints: 50 claves. */
export interface Trip {
  id: number;
  order: string;
  status: TripStatus;
  clientId: number;
  clientName: string | null;
  shippingLineId: number;
  shippingLineName: string | null;
  departurePointId: number;
  departurePointName: string | null;
  locationId: number;
  locationName: string | null;
  destination: string;
  container: string;
  /** SPEC 41 — MAYÚSCULAS; null solo en viajes anteriores a la spec. */
  booking: string | null;
  /** SPEC 41 — opcional; null = sin referencia. */
  reference: string | null;
  /** SPEC 43 — orden de venta opcional, MAYÚSCULAS; null = sin OV. */
  ov: string | null;
  transport: string;
  /** Formato d-m-Y h:i:s A, NO ISO 8601. */
  recolectionDate: string;
  shipDate: string;
  startDate: string | null;
  endDate: string | null;
  /** SPEC 42 — d-m-Y h:i:s A; las dos null salvo en un viaje cancelado. */
  cancelledAt: string | null;
  cancelledByName: string | null;
  /** Ruta PREVISTA, la que mandó el front. */
  polyline: string;
  points: LatLng[];
  /** SPEC 30 — estimaciones de la ruta PREVISTA, cadenas de dos decimales; null solo en viajes anteriores a la spec. */
  estimatedKilometers: string | null;
  estimatedHours: string | null;
  /** Ruta REAL (SPEC 28): null y [] hasta que el piloto cierre el viaje con /finish. Cinco decimales. */
  traveledPolyline: string | null;
  traveledPoints: LatLng[];
  /** SPEC 32 — distancia (km) y duración (h decimales) REALES, cadenas de dos decimales calculadas en /finish. null = no ha terminado o anterior a la spec; "0.00" km = terminó sin puntos. */
  traveledKilometers: string | null;
  traveledHours: string | null;
  observations: string;
  pilotId: number | null;
  pilotName: string | null;
  /** SPEC 25 — ver pilot-documents-api.md. */
  pilotDpiImage: string | null;
  pilotLicenseImage: string | null;
  vehicleId: number | null;
  vehiclePlate: string | null;
  /** URL absoluta, o null si el viaje está en la bolsa o el vehículo no tiene imagen. */
  vehicleImage: string | null;
  assignedById: number | null;
  assignedByName: string | null;
  registeredByName: string | null;
  /** SPEC 27 — cadena de dos decimales, ver trip-fuels-api.md. */
  totalFuelGallons: string;
  /** SPEC 31 — cadena de dos decimales, ver trip-expenses-api.md. */
  totalExpensesAmount: string;
  /** SPEC 39 — cadena de dos decimales, ver trip-emergency-expenses-api.md. */
  totalEmergencyExpensesAmount: string;
  /** Ver trip-bonus-api.md y trip-cargo-insurance-api.md. */
  bonus: string | null;
  cargoInsurance: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  deletedAt: string | null;
}

/** GET /api/trips/{trip}: las 50 claves más el rastro (salvo para el piloto). */
export interface TripDetail extends Trip {
  positions?: LatLng[];
}

export interface StoreTripBody {
  order: string;
  clientId: number;
  shippingLineId: number;
  departurePointId: number;
  locationId: number;
  destination: string;
  container: string;
  /** SPEC 41 — obligatorio; se guarda en MAYÚSCULAS con espacios colapsados. */
  booking: string;
  /** SPEC 41 — opcional; vacía, en blanco o null se guarda null. */
  reference?: string | null;
  /** SPEC 43 — opcional; vacía, en blanco o null se guarda null. */
  ov?: string | null;
  transport: string;
  /** Futura. ISO 8601 o Y-m-d H:i:s. */
  recolectionDate: string;
  /** Futura y >= recolectionDate. */
  shipDate: string;
  /** Los tres de la ruta salen de la misma respuesta de GET /api/places/directions. */
  polyline: string;
  /** distanceKilometers de /directions, sin convertir. numeric, 0 ≤ x ≤ 999999.99. */
  estimatedKilometers: number;
  /** durationHours de /directions, sin convertir (horas decimales). numeric, 0 ≤ x ≤ 9999.99. */
  estimatedHours: number;
  observations: string;
  /** SPEC 37 — al menos una línea, sin repetir producto. Ver trip-finished-products-api.md. */
  products: { finishedProductId: number; boxes: number }[];
}

/** Los tres campos de la ruta viajan juntos o ninguno en el PATCH (SPEC 30). */
export interface TripRouteBody {
  polyline: string;
  estimatedKilometers: number;
  estimatedHours: number;
}

/**
 * El PATCH acepta lo mismo del alta, todo opcional, MÁS status y SIN pilotId/vehicleId ni products,
 * con la salvedad de que la ruta es todo o nada: o van los tres campos o no va ninguno.
 * booking no se puede vaciar; reference (SPEC 41) y ov (SPEC 43) sí: null, "" o en blanco las borran.
 */
export type UpdateTripBody = Partial<Omit<StoreTripBody, keyof TripRouteBody | 'products'>>
  & (TripRouteBody | { polyline?: never; estimatedKilometers?: never; estimatedHours?: never })
  /** cancelled es 422: solo se cancela con PATCH /api/trips/{trip}/cancel (SPEC 42). */
  & { status?: Exclude<TripStatus, 'cancelled'> };

/** Ver trip-fuels-api.md, trip-expenses-api.md, trip-bonus-api.md y trip-cargo-insurance-api.md. */
export interface AssignTripBody {
  pilotId: number;
  vehicleId: number;
  fuelGallons: number;
  fuelType: 'regular' | 'premium' | 'diesel' | 'diesel_premium';
  bonus: number;
  cargoInsurance: number;
  expenseAmount?: number | null;
  expenseDescription?: string | null;
}
```

---

## 5. Formato de las respuestas

### Sobre estándar

Todo lo que no sea un 422 viaja así:

```json
{ "statusCode": 200, "message": "Viaje obtenido correctamente", "data": { } }
```

### Listado sin paginar (sin `limit`)

`data` es el array completo de **`TripListItem`** —23 claves por elemento, no las 50 del detalle— y **no viajan metadatos**:

```json
{ "statusCode": 200, "message": "Viajes obtenidos correctamente", "data": [ { }, { } ] }
```

### Listado paginado (con `limit`)

`data` vuelve a ser un array de **`TripListItem`**, y `total`, `currentPage` y `lastPage` van **aplanados en la raíz del sobre**, no bajo `meta`:

```json
{
  "statusCode": 200,
  "message": "Viajes obtenidos correctamente",
  "data": [ { } ],
  "total": 57,
  "currentPage": 1,
  "lastPage": 6
}
```

### Error de negocio (400, 401, 403, 404)

```json
{ "statusCode": 400, "message": "El viaje ya fue eliminado", "data": null }
```

### ⚠️ Error de validación (422) — formato distinto

Es el estándar de Laravel y **no lleva `statusCode` ni `data`**:

```json
{
  "message": "La orden es obligatoria (and 3 more errors)",
  "errors": {
    "order": ["La orden es obligatoria"],
    "clientId": ["El cliente es obligatorio"],
    "shipDate": ["La fecha de embarque no puede ser anterior a la de recolección"]
  }
}
```

El manejador de errores del front debe distinguir las dos formas: `errors` presente → pinta por campo; si no → muestra `message`.

---

## 6. Endpoints

### 6.1 `GET /api/trips` — listar

Cualquier autenticado. Devuelve lo que el ámbito del rol permita (§3).

**Query params — los diez son opcionales y todos son tolerantes: un valor inválido se ignora y devuelve el listado completo, nunca 422 ni lista vacía.**

| Param | Formato | Notas |
|---|---|---|
| `status` | `pending` \| `in_route` \| `finished` \| `cancelled` | Coincidencia exacta y sensible a mayúsculas. `?status=PENDING` se ignora. `?status=cancelled` (SPEC 42) devuelve solo los cancelados. |
| `clientId` | numérico | |
| `shippingLineId` | numérico | |
| `locationId` | numérico | |
| `pilotId` | numérico | |
| `vehicleId` | numérico | |
| `dateFrom` | `Y-m-d` **estricto** | Sobre `recolectionDate`, por día completo. `31-12-2026` se ignora. |
| `dateTo` | `Y-m-d` **estricto** | Incluye el día entero: un viaje de las 18:00 entra en el `dateTo` de ese día. |
| `search` | texto | `LIKE` sobre `order`, `container`, `booking`, `reference` **y** `ov` (`booking` y `reference` desde SPEC 41, `ov` desde SPEC 43), en un solo grupo. Insensible a mayúsculas (el término se normaliza como una referencia: recorte, espacios colapsados, MAYÚSCULAS): `search=ov-2026` encuentra `OV-2026 15`. Un viaje con `reference` u `ov` en `null` se sigue encontrando por los demás campos. |
| `limit` | numérico | **Activa la paginación.** Acotado a `[1, 100]` —la única paginación del proyecto sin piso de 10—: `limit=5` → páginas de cinco y `limit=500` → 100. Sin él, colección completa. |

- **Orden fijo:** `recolectionDate` descendente y, a igualdad, `id` descendente. **No hay `sortBy` ni `sortDir`.**
- **Los borrados no salen nunca**, con filtro o sin él, y no hay parámetro que los devuelva. **Los cancelados sí salen por defecto** (SPEC 42), con `statusLabel: "Cancelado"`: si la pantalla no los quiere, filtra por estado.
- Sin coincidencias es **200 con `data: []`**, no 404.
- ⚠️ **El ámbito se aplica antes que `search`**: un `carrier` que busca el booking o la OV de un viaje que tomó otra empresa recibe `data: []`, no el viaje.
- **No hay filtro exacto `?booking=`, `?reference=` ni `?ov=`**, ni orden por ellos: el término de `search` es un `LIKE %…%`, así que `search=B` puede casar con muchos viajes.

⚠️ **La salida no es el objeto completo.** Cada elemento es un `TripListItem` de **23 claves** (§4.2): sin `clientId`/`clientName`, sin los ids de las demás relaciones, sin `destination`, sin `transport`, sin `polyline`, **sin `points`** y sin `createdAt`/`updatedAt`/`deletedAt`. Sí trae `estimatedKilometers` y `estimatedHours` (SPEC 30) `booking` y `reference` (SPEC 41) y `ov` (SPEC 43). Para pintar el mapa o navegar a cualquier catálogo hay que pedir el detalle. **No hay filtro ni orden por distancia o duración.**

⚠️ **Los filtros por id siguen existiendo aunque los ids no salgan.** `?clientId=`, `?shippingLineId=`, `?locationId=`, `?pilotId=` y `?vehicleId=` se aplican igual; lo que no se puede es sacar esos ids de una fila del propio listado — vienen de sus catálogos.

**200** · `Viajes obtenidos correctamente`

### 6.2 `POST /api/trips` — publicar

Solo `administrator` (y `export`). **Dieciséis campos obligatorios y dos opcionales** (`reference` y, desde SPEC 43, `ov`; catorce obligatorios hasta SPEC 37 y quince hasta SPEC 41; un `POST` sin `booking` es **422 «El booking es obligatorio»**).

| Campo | Reglas |
|---|---|
| `order` | texto, máx. 255. Se guarda en MAYÚSCULAS con espacios colapsados. |
| `clientId` | entero, `exists:clients,id`. ⚠️ Borrado → **400**. |
| `shippingLineId` | entero, `exists:shipping_lines,id`. ⚠️ Borrada → **400**. |
| `departurePointId` | entero, `exists:departure_points,id`. ⚠️ Inactivo → **400**. |
| `locationId` | entero, `exists:locations,id`. ⚠️ Debe ser de tipo **`port`** y estar **activo**; si no, **400**. |
| `destination` | texto, máx. 255. Solo `trim`. |
| `container` | texto, máx. 255. MAYÚSCULAS con espacios colapsados. |
| `booking` | **Obligatorio (SPEC 41).** Texto, máx. 255. MAYÚSCULAS con espacios colapsados: `"  bk-2026   001  "` → `"BK-2026 001"`. De solo espacios o `null` → **422** `El booking es obligatorio`. **No es único.** |
| `reference` | **Opcional (SPEC 41).** Texto, máx. 255, misma normalización. Omitida, `""`, de solo espacios o `null` → se guarda **`null`** con 201, sin 422. **No es única.** |
| `ov` | **Opcional (SPEC 43).** Texto, máx. 255, misma normalización: `"  ov-2026   15  "` → `"OV-2026 15"`. Omitida, `""`, de solo espacios o `null` → se guarda **`null`** con 201, sin 422. No texto → **422** `La orden de venta debe ser texto`; más de 255 → **422** `La orden de venta no puede superar los 255 caracteres`. **No es única**: dos viajes con la misma OV se crean los dos. |
| `transport` | texto, máx. 255. Solo `trim`. |
| `recolectionDate` | fecha válida y **futura**. |
| `shipDate` | fecha válida, **futura** y **>= `recolectionDate`**. |
| `polyline` | texto. La resuelve el front con `GET /api/places/directions`. |
| `estimatedKilometers` | numérico, **0 ≤ x ≤ 999999.99**. El `distanceKilometers` de la **misma** respuesta de `/directions`, sin convertir. `0` es válido. Se guarda con dos decimales y **no se coteja** con `polyline`. |
| `estimatedHours` | numérico, **0 ≤ x ≤ 9999.99**. El `durationHours` de la **misma** respuesta, en **horas decimales** (no minutos ni segundos). `0` es válido. |
| `observations` | texto. Obligatorio. |
| `products` | Lista de al menos una línea `{ finishedProductId, boxes }` (SPEC 37). Detalle en `references/trip-finished-products-api.md`. |

**Cinco campos se descartan sin error:** `status`, `pilotId`, `vehicleId`, `assignedBy` y `registeredBy`. El viaje nace `pending`, con los tres campos de tripulación en `null`, y `registeredByName` sale del token.

**201** · `Viaje registrado correctamente` · **422** falta un campo, fecha inválida o estimación negativa / no numérica / por encima del tope · **400** catálogo inservible.

La respuesta ya trae `estimatedKilometers` y `estimatedHours` como cadena de dos decimales (`104.32` → `"104.32"`, `4` → `"4.00"`), y `booking`/`reference`/`ov` ya normalizados.

### 6.3 `GET /api/trips/{trip}` — detalle

Cualquier autenticado, **dentro de su ámbito**. Es el **único endpoint de lectura que devuelve el `Trip` completo** (§4.1): **51 claves** con `positions` (50 para el piloto asignado); el listado se queda en 23, así que abrir un viaje siempre cuesta esta llamada. Es también donde se lee la ruta real de un viaje ya cerrado: `traveledPoints` con valor solo aquí y en las respuestas de escritura posteriores al `/finish` (`PATCH` y `DELETE`).

**200** · `Viaje obtenido correctamente` · **403** fuera de ámbito · **404** id inexistente **o borrado** (indistinguibles).

### 6.4 `PATCH /api/trips/{trip}` — editar

Solo `administrator`. Acepta también `PUT`, pero **no reemplaza el recurso completo**: se comporta igual que el `PATCH`.

- **Todos los campos son opcionales**; un **cuerpo vacío responde 200** sin cambiar nada (ni `updatedAt`).
- Opcional **no** es vaciable: mandar una clave con `null` o en blanco es **422** —con **dos** excepciones, `reference` y `ov` (abajo)—.
- Son los mismos del alta **más `status`** y **menos `pilotId`, `vehicleId` y `products`** (este último se ignora en silencio).
- **`booking` (SPEC 41)**: si viaja, obligatorio, texto y máx. 255, normalizado como en el alta. `null`, `""` o solo espacios → **422** `El booking es obligatorio`: **no se puede vaciar**.
- **`reference` (SPEC 41)**: si viaja con valor, se normaliza y se reescribe; si viaja en `null`, `""` o de solo espacios, **se borra** (queda `null`) con **200**. Si no viaja, no se toca —omitirla **no** es borrarla—.
- **`ov` (SPEC 43)**: exactamente igual que `reference`. Con valor se normaliza y se reescribe; en `null`, `""` o de solo espacios **se borra** con **200**; sin la clave, no se toca. No texto o más de 255 caracteres → **422**.
- ⚠️ **La ruta es todo o nada (SPEC 30).** `polyline`, `estimatedKilometers` y `estimatedHours` se exigen entre sí: mandar **uno solo o dos de los tres** es **422**, con un mensaje en cada campo que falta (`Si se envía la ruta deben enviarse también la distancia y la duración estimadas` en los dos números; `Si se envían la distancia o la duración estimadas debe enviarse también la ruta` en `polyline`). Con los tres, **200** y se reescriben los tres; sin ninguno, **200** y no se tocan. Un `PATCH` con solo `polyline` —válido hasta SPEC 30— ya no pasa. Los tres, si viajan, siguen sin poder ir vacíos ni en `null` (`La ruta es obligatoria`, `La distancia estimada es obligatoria`, `La duración estimada es obligatoria`).
- **Las dos fechas dejan de exigir futuro** aquí: editar un viaje ya arrancado no obliga a reprogramarlo.
- **Los catálogos se revalidan siempre**, aunque solo muevas una fecha: si el puerto se desactivó desde el alta, el `PATCH` responde **400** aunque no toques `locationId`.
- **`status` acepta `pending`, `in_route` y `finished` en cualquier orden**, sin tocar las fechas. **`cancelled` es 422** `El estado no es válido; para cancelar un viaje usa la acción de cancelar` (SPEC 42): se cancela solo con §6.9.
- **Sobre un viaje cancelado responde 400 `El viaje está cancelado`**, también con el cuerpo vacío (SPEC 42).

**200** · `Viaje actualizado correctamente` · **400** catálogo inservible, viaje borrado o cancelado · **404** no existe · **422** valor inválido o ruta incompleta.

### 6.5 `DELETE /api/trips/{trip}` — dar de baja

Solo `administrator` (y `export`). Baja lógica **irreversible**: desaparece del listado y del detalle, y **no hay `/restore`**. **También borra un viaje cancelado** (SPEC 42): cancelar no bloquea la limpieza de un error.

**200** · `Viaje eliminado correctamente`, con `deletedAt` **con valor** (única vez que lo verás) · **400** segundo intento · **404** id inexistente.

### 6.6 `PATCH /api/trips/{trip}/assignment` — tomar el viaje

Solo `carrier`, **y con empresa registrada**. Seis campos obligatorios y dos opcionales:

```json
{ "pilotId": 12, "vehicleId": 8, "fuelGallons": 45.5, "fuelType": "diesel", "bonus": 250, "cargoInsurance": 100, "expenseAmount": 350.5, "expenseDescription": "Alimentación y peajes" }
```

`fuelGallons`/`fuelType` crean la primera carga (`references/trip-fuels-api.md`), `expenseAmount`/`expenseDescription` el primer viático opcional (`references/trip-expenses-api.md`), y `bonus`/`cargoInsurance` se escriben en el viaje (`references/trip-bonus-api.md`, `references/trip-cargo-insurance-api.md`). **`booking` y `reference` no se aceptan aquí**: mandarlos se ignora y no tocan el viaje.

- **No se puede asignar solo piloto o solo vehículo**: falta cualquiera → **422**.
- **`null` en cualquiera de los dos → 422**: la desasignación no existe.
- `assignedBy` **no se envía**: sale del token.
- **Reasignar solo mientras el viaje siga `pending`**, y solo desde la empresa que ya lo tomó. Un viaje `in_route` o `finished` → **400**. Un viaje **cancelado** → **400 `El viaje está cancelado`** (SPEC 42) para la empresa que lo tomó, y para cualquiera si estaba libre; otra empresa sobre uno ya tomado sigue recibiendo el **403**.
- Un `carrier` de otra empresa sobre un viaje ya tomado → **403**.
- La escritura corre en transacción con bloqueo de fila: dos transportistas a la vez no se pisan, solo uno gana.

Reglas de negocio, todas **400**: el usuario debe tener rol `pilot`, tener empresa, el vehículo debe estar `active` (`inactive` y `under_repair` se rechazan) y **los dos deben ser de la misma empresa**.

**200** · `Viaje asignado correctamente`

### 6.7 `PATCH /api/trips/{trip}/start` — arrancar

Solo el **piloto asignado**. **No tiene cuerpo**: `startDate` la pone el `now()` del **servidor** y mandar una fecha no la usa. Deja `status: "in_route"`.

**200** · `Viaje iniciado correctamente` · **403** no eres su piloto · **400** ya iniciado, viaje borrado o **cancelado** (`El viaje está cancelado`, SPEC 42, después del 403) · **404** no existe.

### 6.8 `PATCH /api/trips/{trip}/finish` — cerrar

Solo el **piloto asignado**. Sin cuerpo. Deja `endDate` con la hora del servidor y `status: "finished"`, y desde SPEC 28 y SPEC 32 escribe además la ruta real con sus dos números.

**400 si el viaje no tiene `startDate`**: no se cierra un viaje que nunca arrancó.

**Desde SPEC 28 escribe además la ruta real.** En el mismo UPDATE que `endDate` y `status`, codifica **todo** el rastro de `trip_positions` del viaje —en orden `recordedAt asc, id asc`, sin simplificar— en `traveledPolyline`, y la respuesta ya trae `traveledPolyline` (string) y `traveledPoints` (pares `[lat, lng]` a cinco decimales) con valor. Es la **única escritura de esas dos claves en toda la API**. Sin ningún punto reportado quedan en `null` y `[]` y el cierre **no se bloquea**: `/finish` no gana guardas ni mensajes nuevos. Ejemplo de `data` tras un cierre con rastro:

```json
{
  "status": "finished",
  "startDate": "05-09-2026 06:02:11 AM",
  "endDate": "05-09-2026 10:47:39 AM",
  "polyline": "_p~iF~ps|U_ulLnnqC_mqNvxq`@",
  "points": [[38.5, -120.2], [40.7, -120.95], [43.252, -126.453]],
  "estimatedKilometers": "104.32",
  "estimatedHours": "1.75",
  "traveledPolyline": "_lgxA~vmgPrIoAzmE~}A~j`Crzp@",
  "traveledPoints": [[14.6248, -90.5152], [14.6231, -90.5148], [14.59, -90.53], [13.9276, -90.7853]],
  "traveledKilometers": "111.40",
  "traveledHours": "4.76"
}
```

**Desde SPEC 32 calcula además los dos números de la ruta real**, en el mismo UPDATE y con la misma lectura del rastro (una sola consulta a `trip_positions` para la polilínea y la distancia):

| Clave | Cómo se calcula | Sin puntos | Con un punto |
|---|---|---|---|
| `traveledKilometers` | Suma Haversine de **cada par de puntos consecutivos** del rastro, en orden `recordedAt asc, id asc`, **sin umbral ni filtro** (el ruido GPS de un camión parado suma), `/ 1000`, redondeada a dos decimales | `"0.00"` | `"0.00"` |
| `traveledHours` | `endDate − startDate` en horas decimales, con el **mismo instante** que se escribe en `endDate`, redondeado a dos decimales (`2 h 30 min` → `"2.50"`, `1 h 20 min` → `"1.33"`). **No descuenta las paradas** | horas normales | horas normales |

Los dos salen en la respuesta del `/finish` como cadena de dos decimales, **nunca `null`** tras un cierre. Cada `/finish` recalcula y sobrescribe los dos —pero por la API no hay segundo cierre: el segundo es 400 «El viaje ya fue finalizado», salvo que el administrador limpie el viaje a mano por fuera—. `/finish` **no gana guardas ni mensajes nuevos** por esto: un viaje sin rastro se cierra igual.

`/assignment`, `/start` y `/finish` **no tocan** `estimatedKilometers`, `estimatedHours`, `booking`, `reference` ni `ov`: las devuelven tal como estaban. `/assignment` y `/start` tampoco tocan `traveledKilometers` ni `traveledHours` (siguen en `null`), y mandarlas en cualquier body —`POST`, `PATCH` general, `/assignment`, `/start`— **se ignora en silencio** con 200/201.

**200** · `Viaje finalizado correctamente` · **403** no eres su piloto · **400** ya finalizado, sin iniciar, viaje borrado o **cancelado** (`El viaje está cancelado`, SPEC 42, después del 403) · **404** no existe.

### 6.9 `PATCH /api/trips/{trip}/cancel` — cancelar (SPEC 42)

Solo `administrator` y `export` (los demás roles, **403** del middleware). **No tiene cuerpo** ni FormRequest: cualquier campo enviado se ignora, `cancelledAt` la pone el `now()` del **servidor** y `cancelledByName` sale del token.

- **Solo desde `pending`**, con o sin tripulación asignada. `in_route` o `finished` → **400**.
- Escribe `status: "cancelled"`, `cancelledAt` y `cancelledByName` **juntos**, con bloqueo de fila (una asignación simultánea no se cuela).
- **No toca nada más**: `pilotId`, `vehicleId`, `assignedById`, `bonus`, `cargoInsurance`, las cargas, los viáticos y las líneas de productos quedan como estaban. El viaje **no vuelve a la bolsa**.
- **Irreversible.** No hay ruta para descancelar; si el viaje vuelve a hacerse, se crea uno nuevo.
- Si el viaje tenía piloto, se le envía la push `trip.cancelled` (`references/trip-notifications-api.md`).
- Desde aquí el viaje es de **solo lectura** (§1.15).
- Tampoco toca `ov` (SPEC 43): mandarla en el cuerpo se ignora.

**Orden de las guardas:** no existe (**404** `El viaje no existe`) → borrado (**400** `El viaje ya fue eliminado`) → ya cancelado (**400** `El viaje ya fue cancelado`) → no está pendiente (**400** `Solo se puede cancelar un viaje pendiente`).

```json
{
  "statusCode": 200,
  "message": "Viaje cancelado correctamente",
  "data": { "id": 1, "status": "cancelled", "endDate": null, "cancelledAt": "16-11-2026 03:12:40 PM", "cancelledByName": "Ana López", "...": "las 50 claves de Trip" }
}
```

**200** · `Viaje cancelado correctamente` · **400** borrado, ya cancelado o no pendiente · **403** rol sin permiso · **404** no existe.

**Efecto en los dominios hijos (SPEC 42).** Sobre un viaje cancelado responden **400 `El viaje está cancelado`**: `POST /api/trips/{trip}/fuels`, `PATCH /api/trip-fuels/{id}/confirm`, `POST /api/trips/{trip}/expenses`, `PATCH /api/trip-expenses/{id}/confirm`, `POST /api/trips/{trip}/emergency-expenses`, `PATCH`/`DELETE /api/trip-emergency-expenses/{id}` y `POST`/`PATCH`/`DELETE /api/trip-finished-products`. La guarda va **después** del 403 de cada ruta (empresa que no tomó el viaje, piloto no asignado) y **antes** de la reconfirmación idempotente: reconfirmar una carga o un viático de un viaje cancelado es 400, no 200. Las lecturas (`/fuels`, `/expenses`, `/emergency-expenses`, `/positions`, `/timeouts`, `trip-finished-products`) no cambian, y `GET /api/trips/{trip}/cost` responde el 400 de siempre: `El costo solo está disponible para viajes finalizados`.

**Efecto en el tablero y en el Excel.** `GET /api/dashboard/trips` gana `byStatus.cancelled`, la cuarta clave fija (con `0`), y los cancelados siguen contando en `total` y en todos los demás desgloses (`references/dashboard-api.md`). La columna «Estado» de `GET /api/reports/trips` muestra «Cancelado», sin columnas nuevas.


### 6.10 Excel de `GET /api/reports/trips` — la columna «OV» (SPEC 43)

El reporte descargable de viajes (SPEC 38) gana la columna **«OV»** en la **segunda posición (columna B) para todos los roles**, entre «Orden» y «Cliente». No depende del rol porque no es dinero ni producto.

| Rol | Columnas | Orden de las primeras |
|---|---|---|
| `administrator`, `manager`, `export`, `shipment` | **15** (antes 14) | Orden · **OV** · Cliente · Producto · Cajas · Naviera · … |
| `carrier`, `user` | **13** (antes 12) | Orden · **OV** · Cliente · Naviera · … |

Las 15 columnas, en orden: Orden, OV, Cliente, Producto, Cajas, Naviera, Destino, Contenedor, Punto de Partida, Fecha de recolección, Fecha de embarque, Booking, Punto de llegada, Transporte, Status. `carrier` y `user` reciben las mismas sin Producto ni Cajas.

- Un viaje con N líneas de producto ocupa N filas y **la OV se repite en las N**, como el resto de datos del viaje.
- Un viaje sin OV deja la celda **vacía** (no «null» ni guion).
- ⚠️ Todas las columnas desde «Cliente» se corrieron **una posición a la derecha**. Quien lea el archivo por letra de columna (macros, `BUSCARV`, importaciones) debe ajustarse; el reporte nunca prometió posiciones fijas (ya variaba entre roles).
- El Excel de la tool `export_trips` del asistente **no** cambia: no trae OV.

---

## 7. Impacto sobre Clientes y Navieras

Este dominio **cambia el comportamiento de dos endpoints ya publicados**:

| Endpoint | Antes | Ahora |
|---|---|---|
| `DELETE /api/clients/{client}` | 200 siempre | **400** si el cliente tiene viajes |
| `DELETE /api/shipping-lines/{shippingLine}` | 200 siempre | **400** si la naviera tiene viajes |

La comprobación **cuenta también los viajes borrados**: borrar el viaje no libera al cliente. Un cliente o una naviera **sin** viajes se siguen borrando con 200, exactamente como antes, y el resto de su contrato queda intacto.

---

## 8. Tabla de mensajes de error (literales)

Listos para mostrarse al usuario, tal como los devuelve la API.

### Validación — 422, dentro de `errors[campo]`

| Campo | Mensajes |
|---|---|
| `order` | `La orden es obligatoria` · `La orden debe ser texto` · `La orden no puede superar los 255 caracteres` |
| `clientId` | `El cliente es obligatorio` · `El cliente debe ser un identificador válido` · `El cliente seleccionado no existe` |
| `shippingLineId` | `La naviera es obligatoria` · `La naviera debe ser un identificador válido` · `La naviera seleccionada no existe` |
| `departurePointId` | `El punto de partida es obligatorio` · `El punto de partida debe ser un identificador válido` · `El punto de partida seleccionado no existe` |
| `locationId` | `El puerto de destino es obligatorio` · `El puerto de destino debe ser un identificador válido` · `El puerto de destino seleccionado no existe` |
| `destination` | `El destino final es obligatorio` · `El destino final debe ser texto` · `El destino final no puede superar los 255 caracteres` |
| `container` | `El contenedor es obligatorio` · `El contenedor debe ser texto` · `El contenedor no puede superar los 255 caracteres` |
| `booking` | `El booking es obligatorio` · `El booking debe ser texto` · `El booking no puede superar los 255 caracteres` |
| `reference` | `La referencia debe ser texto` · `La referencia no puede superar los 255 caracteres` (vacía o en blanco **no** es error: se guarda `null`) |
| `ov` | `La orden de venta debe ser texto` · `La orden de venta no puede superar los 255 caracteres` (vacía o en blanco **no** es error: se guarda `null`) |
| `transport` | `El transporte es obligatorio` · `El transporte debe ser texto` · `El transporte no puede superar los 255 caracteres` |
| `recolectionDate` | `La fecha de recolección es obligatoria` · `La fecha de recolección no es válida` · `La fecha de recolección debe ser futura` |
| `shipDate` | `La fecha de embarque es obligatoria` · `La fecha de embarque no es válida` · `La fecha de embarque debe ser futura` · `La fecha de embarque no puede ser anterior a la de recolección` |
| `polyline` | `La ruta es obligatoria` · `La ruta debe ser texto` · (solo PATCH) `Si se envían la distancia o la duración estimadas debe enviarse también la ruta` |
| `estimatedKilometers` | `La distancia estimada es obligatoria` · `La distancia estimada debe ser un número` · `La distancia estimada no puede ser negativa` · `La distancia estimada supera el máximo permitido` · (solo PATCH) `Si se envía la ruta deben enviarse también la distancia y la duración estimadas` |
| `estimatedHours` | `La duración estimada es obligatoria` · `La duración estimada debe ser un número` · `La duración estimada no puede ser negativa` · `La duración estimada supera el máximo permitido` · (solo PATCH) `Si se envía la ruta deben enviarse también la distancia y la duración estimadas` |
| `observations` | `Las observaciones son obligatorias` · `Las observaciones deben ser texto` |
| `products` (solo POST) | `Los productos terminados son obligatorios` · `Los productos terminados deben ser una lista` · `El viaje debe llevar al menos un producto terminado` · por línea: `El producto terminado es obligatorio` · `El producto terminado debe ser un identificador válido` · `El producto terminado está repetido en el viaje` · `El producto terminado seleccionado no existe` · `Las cajas son obligatorias` · `Las cajas deben ser un número entero` · `Las cajas deben ser al menos 1` · `Las cajas no pueden superar 999999` |
| `status` (solo PATCH) | `El estado del viaje es obligatorio` · `El estado no es válido; para cancelar un viaje usa la acción de cancelar` (cualquier valor fuera de `pending`/`in_route`/`finished`, `cancelled` incluido) |
| `pilotId` (solo assignment) | `El piloto es obligatorio` · `El piloto debe ser un identificador válido` · `El piloto seleccionado no existe` |
| `vehicleId` (solo assignment) | `El vehículo es obligatorio` · `El vehículo debe ser un identificador válido` · `El vehículo seleccionado no existe` |

### Negocio — 400, en `message`

| Mensaje | Cuándo |
|---|---|
| `El cliente seleccionado fue eliminado` | `clientId` de un cliente borrado. |
| `La naviera seleccionada fue eliminada` | `shippingLineId` de una naviera borrada. |
| `El destino seleccionado no es un puerto` | `locationId` de una `location` de tipo `destination`. |
| `El puerto de destino está inactivo` | `locationId` de un puerto con `status: false`. |
| `El punto de partida está inactivo` | `departurePointId` con `status: false`. |
| `El usuario seleccionado no es un piloto` | `pilotId` de un usuario que no tiene rol `pilot`. |
| `El piloto seleccionado no pertenece a ninguna empresa transportista` | El piloto no está vinculado a ninguna empresa. |
| `El vehículo seleccionado no está activo` | Vehículo `inactive` o `under_repair`. |
| `El piloto y el vehículo deben pertenecer a la misma empresa transportista` | Tripulación de dos empresas. |
| `Solo se puede asignar un viaje pendiente` | Reasignar un viaje `in_route` o `finished`. |
| `El viaje ya fue iniciado` | Segundo `/start`. |
| `El viaje ya fue finalizado` | Segundo `/finish`. |
| `El viaje no ha sido iniciado` | `/finish` sobre un viaje sin `startDate`. |
| `El viaje ya fue eliminado` | `PATCH`, `/assignment`, `/start`, `/finish`, `/cancel` o segundo `DELETE` sobre un viaje borrado. |
| `El viaje ya fue cancelado` | Segundo `/cancel` (SPEC 42). |
| `Solo se puede cancelar un viaje pendiente` | `/cancel` sobre un viaje `in_route` o `finished` (SPEC 42). |
| `El viaje está cancelado` | Cualquier escritura sobre un viaje cancelado (SPEC 42): `PATCH` general, `/assignment`, `/start`, `/finish` y las escrituras de cargas, viáticos, gastos emergentes y líneas de productos. |
| `No se puede eliminar el cliente porque tiene viajes asociados` | `DELETE /api/clients/{client}`. |
| `No se puede eliminar la naviera porque tiene viajes asociados` | `DELETE /api/shipping-lines/{shippingLine}`. |

### Autorización — 401, 403, 404, en `message`

| Código | Mensaje | Cuándo |
|---|---|---|
| 401 | `El token de sesión no es válido o ha expirado` | Sin token o expirado, en las diez rutas. |
| 403 | `No tienes permisos para acceder a este recurso` | El rol no alcanza la ruta (middleware). |
| 403 | `Debes estar vinculado a un transportista para acceder a este recurso` | `carrier` sin empresa en `/assignment`. |
| 403 | `No puedes acceder a un viaje que no pertenece a tu empresa transportista` | Detalle de un viaje tomado por otra empresa. |
| 403 | `No puedes acceder a un viaje que no tienes asignado` | Un piloto pidiendo el detalle de un viaje ajeno o de la bolsa. |
| 403 | `No puedes asignar un viaje que ya tomó otra empresa transportista` | `/assignment` sobre un viaje de otra empresa. |
| 403 | `No puedes iniciar un viaje que no tienes asignado` | `/start` desde otro piloto. |
| 403 | `No puedes finalizar un viaje que no tienes asignado` | `/finish` desde otro piloto. |
| 403 | `Necesitas pertenecer a una empresa transportista para asignar un viaje` | `/assignment` sin empresa (respaldo del service). |
| 404 | `El viaje no existe` | Id inexistente, y también un viaje borrado en el detalle. |

⚠️ **Orden de las guardas en `/start` y `/finish`:** primero se comprueba si el viaje está borrado y después si eres su piloto. Un piloto ajeno sobre un viaje borrado recibe **400**, no 403.

---

## 9. Checklist de implementación en el frontend

- [ ] Enviar el header `Authorization: Bearer {token}` en las diez llamadas.
- [ ] Distinguir los dos formatos de error: `errors` presente → 422 por campo; si no → `message`.
- [ ] **Tipar dos objetos, no uno:** `TripListItem` (23 claves) para la tabla y `Trip` (50; 51 con `positions` en el detalle) para el resto. No reutilizar una fila del listado como si fuera el viaje completo.
- [ ] **Pedir `GET /api/trips/{trip}` al abrir un viaje**, siempre: el mapa (`points`) y todos los ids de relación solo existen ahí.
- [ ] **Pintar una interfaz distinta por rol.** El `carrier` necesita dos listas (la bolsa y lo suyo; en el listado se separan por `pilotName === null && vehiclePlate === null`, porque `assignedById` **no viene**, y en el detalle por `assignedById === null`); el `pilot`, solo su agenda, **sin buscador de viajes disponibles**; el `administrator`, el CRUD completo **sin** botones de asignar, arrancar ni cerrar.
- [ ] Resolver la ruta con `GET /api/places/directions` **antes** de mandar el alta, y reenviar **los tres valores de esa misma respuesta**: `polyline`, `distanceKilometers` → `estimatedKilometers` y `durationHours` → `estimatedHours`, sin convertir unidades. Volver a resolverla y **remandar los tres en el mismo `PATCH`** cada vez que cambies `locationId` o `departurePointId`.
- [ ] **Nunca mandar `polyline` sola en un `PATCH`**, ni uno solo de los dos números: es 422 desde SPEC 30. O van los tres o no va ninguno.
- [ ] Parsear `estimatedKilometers` y `estimatedHours` (`parseFloat`) antes de sumar u ordenar en el cliente: llegan como cadena. Pintar `estimatedHours` como horas decimales (`"1.75"` → «1 h 45 min»), no como «1:75».
- [ ] Tratar `estimatedKilometers === null` / `estimatedHours === null` como «sin estimación» (viaje anterior a SPEC 30), igual que `traveledPolyline: null` y `pilotDpiImage: null`: no es un error y no se puede rellenar sin remandar la ruta completa por `PATCH`.
- [ ] Pintar el mapa con `points` **del detalle** (ya viene decodificado); no decodificar `polyline` a mano y no esperar ninguno de los dos en el listado.
- [ ] **Pintar dos trazos distintos en el mapa de un viaje cerrado:** la ruta prevista (`points`) y la real (`traveledPoints`), con estilos que se distingan. Mostrar la real **solo cuando `traveledPolyline !== null`**; con `traveledPoints.length === 0` no hay nada que pintar, y no es un error.
- [ ] **No esperar la ruta real mientras el viaje esté `in_route`:** ahí `traveledPoints` es `[]` aunque el piloto lleve horas reportando. Para el rastro en vivo usar el websocket y `GET /api/trips/{trip}/positions`, y al recibir el 200 del `/finish` sustituirlo por `traveledPoints` de esa misma respuesta.
- [ ] Tratar `traveledPolyline: null` en un viaje `finished` como «sin rastro» (viaje anterior a SPEC 28 o sin ningún punto), no como fallo: pintar solo la prevista.
- [ ] No mandar `traveledPolyline` en ningún body: se ignora con 200/201 y no se guarda.
- [ ] **Pintar «estimado vs real» solo cuando `traveledKilometers !== null`** (SPEC 32): en `pending`, `in_route`, `GET /api/trips/current` y en los viajes cerrados antes de la spec las dos claves son `null` y no hay nada que comparar. El desvío (`parseFloat(traveledKilometers) − parseFloat(estimatedKilometers)`) y el retraso en horas los calculas tú; la API no los da.
- [ ] **Distinguir `null` de `"0.00"` en `traveledKilometers`:** `null` es «sin dato»; `"0.00"` es «terminó sin recorrido medible» (cero o un punto reportado) y es legítimo, no un error. En ese caso `traveledPolyline` es `null` y `traveledPoints` es `[]`.
- [ ] Avisar en la interfaz (tooltip o leyenda) de que **la distancia real es una suma bruta del rastro** —incluye el ruido GPS de las paradas— y de que **las horas reales son tiempo bruto** —incluyen las paradas—: si se necesita el tiempo neto, restar `durationMinutes` de `GET /api/trips/{trip}/timeouts` en el cliente.
- [ ] Parsear `traveledKilometers` y `traveledHours` (`parseFloat`) antes de operar, y pintar `traveledHours` como horas decimales (`"2.10"` → «2 h 6 min»), igual que las estimaciones.
- [ ] Tras el 200 del `/finish`, refrescar la fila del listado o el detalle desde **esa misma respuesta**: ya trae las dos métricas calculadas; no hace falta otra petición.
- [ ] No mandar `traveledKilometers` ni `traveledHours` en ningún body: se ignoran con 200/201.
- [ ] Formatear las fechas de entrada como ISO 8601 o `Y-m-d H:i:s`, y **no reenviar el formato de salida** `d-m-Y h:i:s A`.
- [ ] Usar `Y-m-d` estricto en `dateFrom`/`dateTo`.
- [ ] Traducir `status` en el cliente: la API lo devuelve en inglés.
- [ ] **Contar el relato desde las fechas, no desde `status`**, cuando se contradigan.
- [ ] Deshabilitar el botón de asignar cuando `status !== "pending"`: la API responde 400.
- [ ] Deshabilitar el de cerrar cuando `startDate` sea `null`.
- [ ] No ofrecer «desasignar», «descancelar» ni «restaurar»: no existen.
- [ ] **Añadir `cancelled` a todo `switch`/mapa sobre `status`** (SPEC 42) y pintar «Cancelado» (o usar `statusLabel` del listado).
- [ ] Ofrecer **«Cancelar viaje»** solo a `administrator` y `export`, y solo con `status === "pending"`; distinguirlo en la interfaz de «Eliminar» (cancelar = historial que se queda; eliminar = error que desaparece) y confirmar con un aviso de que **no se puede deshacer**.
- [ ] Sobre un viaje cancelado, **ocultar o deshabilitar toda acción de escritura** (editar, asignar, arrancar, cerrar, cargas, viáticos, confirmaciones, gastos emergentes, productos): la API responde 400 `El viaje está cancelado`. Dejar solo «Eliminar» a quien lo tenga.
- [ ] Mostrar `cancelledAt` y `cancelledByName` en el detalle de un cancelado (no vienen en el listado).
- [ ] No mandar `status: "cancelled"` en el `PATCH` general: es 422.
- [ ] Decidir si la tabla muestra los cancelados: salen por defecto en `GET /api/trips`; `?status=cancelled` los aísla.
- [ ] Leer `byStatus.cancelled` en el tablero y no asumir que `byStatus` trae tres claves.
- [ ] Confirmar el `DELETE` con un aviso claro de que **no se puede deshacer**.
- [ ] Invalidar el viaje en caché tras un `/assignment` ajeno: puede haber salido de tu ámbito.
- [ ] No confiar en un 200 del `PATCH` como prueba de que se aplicó `pilotId` o `vehicleId`: se ignoran en silencio.
- [ ] Recordar que `order`, `container`, `booking`, `reference` y `ov` **no son únicos**: no los uses como clave en una lista, usa `id`.
- [ ] **Añadir `booking` (obligatorio) y `reference` (opcional) al formulario de alta** (SPEC 41): sin `booking` el `POST` es 422. Pintar lo que devuelve la respuesta (en MAYÚSCULAS), no lo tecleado.
- [ ] En la edición, **no mandar `booking` vacío** (422) y ofrecer «quitar referencia» mandando `reference: null`; si el campo no cambió, omitirlo —omitir `reference` no la borra—.
- [ ] Tratar `booking === null` como «sin booking» (viaje anterior a SPEC 41), igual que `estimatedKilometers: null`; un `administrator` o `export` puede completarlo por `PATCH`.
- [ ] Añadir las columnas «Booking» y «Referencia» a la tabla junto al contenedor: ya vienen en el listado, sin pedir el detalle.
- [ ] Indicar en el buscador que `search` cubre orden, contenedor, booking, referencia y OV.
- [ ] **Añadir `ov` (opcional) a los formularios de alta y edición** (SPEC 43), etiquetada «Orden de venta» u «OV»; pintar lo que devuelve la respuesta (en MAYÚSCULAS). Para «quitar OV» mandar `ov: null`; si no cambió, omitirla —omitirla no la borra—.
- [ ] Añadir la columna «OV» a la tabla junto a la referencia: ya viene en el listado. Tratar `ov === null` como «sin OV», no como error.
- [ ] **Avisar a quien consuma el Excel de `GET /api/reports/trips` por posición de columna** (macros, fórmulas, importaciones): desde SPEC 43 la B es «OV» y todo lo demás se corrió una columna.
- [ ] Pedir `limit` solo cuando quieras paginar, y leer `total`/`currentPage`/`lastPage` **de la raíz**, no de `meta`.

---

## 10. Lo que este dominio **no** hace (para no diseñarlo en el front)

- **No hay máquina de estados.** Nada impide que un `finished` vuelva a `pending` conservando sus dos fechas de ejecución.
- **No se puede descancelar ni reabrir un viaje cancelado (SPEC 42)**, ni cancelar uno `in_route` o `finished`, ni cancelar desde el `carrier` o el piloto. No hay motivo de cancelación, la cancelación **no libera** la tripulación ni devuelve el viaje a la bolsa, la push `trip.cancelled` solo llega al piloto asignado, `cancelledAt`/`cancelledByName` **no salen** en el listado ni en los Excel, y los cancelados no se ocultan por defecto ni se excluyen de los agregados del tablero (salvo `byStatus`).
- **No se puede desasignar.** `pilotId` y `vehicleId` no vuelven a `null` por ninguna vía, y el viaje **no regresa nunca a la bolsa**.
- **El administrador no puede asignar** piloto ni vehículo por ninguna ruta.
- **No se puede restaurar un viaje borrado.** Sin `/restore` y sin `?trashed=true`.
- **No se valida el solapamiento** de piloto ni de vehículo: un mismo piloto puede estar en dos viajes con fechas que se pisan.
- **No hay bitácora.** Editar un viaje o reasignarlo pisa el valor anterior sin dejar rastro: no se sabe quién movió el `status` ni cuándo.
- **No hay costos, tarifas ni facturación.** El viaje no cotiza nada y no toca `freight_rates`; `GET /api/freight-rates/quote` no cambió de forma.
- **No hay archivos adjuntos** (ni carta de porte, ni foto de contenedor), **ni notificaciones en este documento** (las push de asignación, arranque, cierre y cancelación están en `references/trip-notifications-api.md`; publicar un viaje no notifica a nadie), **ni seguimiento en tiempo real en este dominio** (`polyline` es la ruta prevista y se guarda una sola vez; la posición en vivo es de `references/trip-positions-api.md`, y su resumen cerrado es `traveledPolyline`).
- **La API no llama a Google** ni recalcula la polilínea, **ni calcula, recalcula o valida `estimatedKilometers`/`estimatedHours` (SPEC 30)**: no los coteja con `polyline`, ni con el par punto de partida / puerto, ni con el recorrido real. No hay desvío, retraso ni ETA; no hay filtro ni orden por distancia o duración en `GET /api/trips`; no hubo backfill (los viajes anteriores quedan en `null`); y `TripInRouteResource` del tablero (`GET /api/dashboard/trips/in-route`), `TripPositionResource` y el payload del websocket **no** las traen.
- **La ruta real no se actualiza en vivo ni se compara con la prevista (SPEC 28).** `traveledPolyline` se escribe **una sola vez**, en `/finish`, y se queda así: no se recalcula con cada posición, no se expone mientras el viaje está `in_route`, no se simplifica (sin Douglas-Peucker ni colapso de puntos repetidos), no hay desvío, distancia recorrida ni alertas entre `points` y `traveledPoints`, no hay backfill para los viajes cerrados antes de la spec y no existe ningún `GET /api/trips/{trip}/traveled-route`. Un segundo `/finish` es 400 «El viaje ya fue finalizado», así que en la práctica la ruta real de un viaje **no cambia nunca después de escrita**.
- **La distancia y el tiempo reales son brutos y no se comparan con nada (SPEC 32).** `traveledKilometers` **no filtra** el ruido GPS (segmentos por debajo de los 5 m que sí usan las paradas), **no descarta** saltos espurios ni simplifica el rastro; `traveledHours` **no descuenta** las paradas de `trip_timeouts`. No hay desvío, retraso, porcentaje ni ETA calculado en el servidor; no hay filtro ni orden por distancia o tiempo real en `GET /api/trips`; no hubo backfill (los viajes cerrados antes de la spec quedan en `null` en las dos); `TripInRouteResource` del tablero, `TripPositionResource` y el payload de `TripPositionUpdated` **no** las traen; `GET /api/trips/current` las trae **siempre en `null`**; y ningún body las acepta. El asistente del tablero (`POST /api/assistant/chat`) sí las ve en su tool `trip`, sin cambios en esa API.
- **El administrador no puede filtrar por empresa asignataria.** No hay `?assignedBy=` ni `?carrierId=`: el ámbito lo aplica el rol, no un parámetro.
- **El listado no trae la ruta ni los ids de las relaciones**, y no hay parámetro que los añada: no existe `?include=`, ni `?fields=`, ni una versión «completa» del listado. Una tabla que necesite el cliente de cada viaje tiene que pedir el detalle de cada fila.
- **`order`, `container`, `booking`, `reference` y `ov` no son únicos**, y no hay forma de exigir que lo sean.
- **El booking no se valida contra la naviera (SPEC 41)**: ni prefijo, ni longitud fija, ni dígito verificador; cualquier texto de hasta 255 caracteres vale. No hubo backfill (los viajes viejos quedan con `booking: null`), no hay filtros exactos `?booking=`/`?reference=` ni orden por ellos, y `reference` **no sale** en el Excel de `GET /api/reports/trips` (el `booking` sí, en su columna «Booking»); ninguno de los dos sale en `export_trips` del asistente, en `GET /api/dashboard/trips/in-route` ni en los textos de las notificaciones push.
- **La OV no se valida ni se cruza con nada (SPEC 43)**: ni formato, ni unicidad (ni global ni por cliente), ni relación con un sistema de ventas. No hubo backfill, no hay filtro exacto `?ov=` ni orden por ella, y **no sale** en `GET /api/dashboard/trips/in-route`, en `export_trips` del asistente ni en los textos de las notificaciones push. `/assignment`, `/start`, `/finish` y `/cancel` no la tocan.

### Hueco conocido, aceptado a propósito

**El `PATCH` no compara `shipDate` contra la `recolectionDate` almacenada.** Si mandas **solo** `shipDate` con una fecha anterior a la recolección guardada, la API responde **200** y guarda el viaje incoherente: la regla `after_or_equal` solo actúa cuando las dos fechas viajan en el **mismo** cuerpo. Mientras no se cierre, **manda siempre las dos juntas** cuando toques cualquiera de ellas, o valida el orden en el front antes de enviar.
