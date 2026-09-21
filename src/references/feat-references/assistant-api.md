# Asistente del tablero (IA) — referencia de integración para el frontend

Referencia completa del dominio **Assistant** de la API de Legumex Transportes: **un solo endpoint**, `POST /api/assistant/chat`, que responde en lenguaje natural preguntas sobre viajes, flota y gastos de mantenimiento, y genera reportes Excel bajo demanda. Detrás hay un agente (`laravel/ai`, proveedor Gemini) con **trece herramientas** que envuelven los mismos services que `/api/dashboard`, `/api/trips`, `/api/vehicles` y `/api/vehicle-expenses`: el modelo nunca toca la base y hereda **exactamente** el ámbito por rol de cada dominio.

Todo lo que hay aquí está verificado contra la implementación real (Laravel 13 + `laravel/ai`) y contra su suite de tests. Los mensajes de error son literales: se pueden mostrar tal cual al usuario.

> Documentación OpenAPI viva: `/api/documentation`.

---

## 1. Lo mínimo que hay que saber antes de escribir código

1. **La respuesta NO es el sobre `{ statusCode, message, data }`.** Es un stream **Server-Sent Events** con el protocolo *UI Message Stream* del Vercel AI SDK (`Content-Type: text/event-stream`, cabecera `x-vercel-ai-ui-message-stream: v1`, líneas `data: {...}` y un `data: [DONE]` final). Está pensado para consumirse con `useChat` + `DefaultChatTransport` de `@ai-sdk/react`; no lo leas con `axios` ni con `response.json()`.
2. **La memoria vive en el cliente.** La API no guarda nada: en cada petición mandas la conversación **completa** (`messages[]`, 1–50, en orden cronológico). El último mensaje debe ser `user` y es la pregunta; los anteriores son contexto. Si el cliente pierde la lista, el asistente no recuerda nada. No hay `conversationId`, ni historial en servidor, ni borrado.
3. **El cuerpo no es el nativo de `useChat`.** `useChat` manda `UIMessage[]` con `parts[]`; la API espera `{ messages: [{ role, content }] }` con `content` **string**. Hace falta un `prepareSendMessagesRequest` que aplane cada mensaje (ver §8). Un `role: 'system'` es 422.
4. **Lo que puede fallar con código HTTP falla ANTES de abrir el stream** (401, 403, 422) y sale con el sobre JSON de siempre. **Una vez abierto el stream, todo es 200**: un fallo del proveedor de IA llega **dentro** del stream como un part `{"type":"error","errorText":"…"}`, nunca como 5xx.
5. **Mismos permisos que el tablero**: `administrator`, `manager` y `carrier` con empresa. `pilot` → 403; `carrier` sin empresa → 403. El `carrier` solo ve su empresa: las herramientas ignoran cualquier `carrierId` que el modelo intente mandar.
6. **El asistente solo consulta y exporta.** Ninguna herramienta escribe en la base. Lo único que deja atrás es un `.xlsx` en el bucket cuando el usuario pide **explícitamente** un reporte/Excel/exportar. La URL llega en el texto como enlace Markdown **y** en el part `tool-output-available` (parseable).
7. **El texto del asistente es Markdown** (enlaces, listas, tablas cortas, negritas). El chat necesita un renderizador de Markdown; sin él el usuario verá `[viajes-2026-09-21-101530.xlsx](https://…)` en crudo.
8. **Un turno puede tardar.** El presupuesto del servidor es **90 s por turno**, con hasta 12 pasos de herramientas. No pongas un timeout de cliente de 10–30 s sobre esta petición.

---

## 2. Autenticación y permisos

El endpoint exige el token JWT que devuelve el login:

```
Authorization: Bearer {token}
Accept: application/json
Content-Type: application/json
```

Sin token, o con uno expirado, la respuesta es **401** (sobre JSON, sin stream):

```json
{ "statusCode": 401, "message": "El token de sesión no es válido o ha expirado", "data": null }
```

| Acción | `administrator` | `carrier` | `pilot` | `manager` |
|---|:--:|:--:|:--:|:--:|
| `POST /api/assistant/chat` | ✅ todas las empresas | ✅ solo su empresa | 403 | ✅ todas las empresas |

La ruta lleva `carrier.required`: `administrator` y `manager` están exentos; un `carrier` que aún no registró su empresa recibe 403 «Debes estar vinculado a un transportista para acceder a este recurso». El ámbito lo aplican **las herramientas** desde el usuario del token (vínculo en la base, no el claim), no el modelo: un `carrier` que pregunte por otra empresa recibirá una respuesta educada diciendo que solo tiene acceso a la suya, y los números que vea son solo los suyos.

Un rol sin permiso recibe **403**:

```json
{ "statusCode": 403, "message": "No tienes permisos para acceder a este recurso", "data": null }
```

> El JWT de acceso dura 60 minutos. Si expira a mitad de una conversación, la **siguiente** petición responde 401 con el sobre JSON (el stream en curso no se corta). El cliente debe reemitir con `/api/auth/check-status` y reintentar el turno **con la misma lista de mensajes**; no se pierde nada porque la memoria es suya.

---

## 3. El cuerpo de la petición

Un solo campo, `messages`: la conversación tal como la tiene el cliente.

```json
{
  "messages": [
    { "role": "user", "content": "¿Cuántos viajes hay en ruta?" },
    { "role": "assistant", "content": "Hay 3 viajes en ruta ahora mismo." },
    { "role": "user", "content": "¿Y cuántos de esos son de El Sol?" }
  ]
}
```

| Campo | Regla | Mensaje 422 |
|---|---|---|
| `messages` | Obligatorio, array, **1 a 50** elementos | `Los mensajes son obligatorios` / `Los mensajes deben ser una lista` / `Debes enviar al menos un mensaje` / `No puedes enviar más de 50 mensajes` |
| `messages.*.role` | Obligatorio, `user` o `assistant` (**`system` es 422**) | `Cada mensaje debe indicar su rol` / `El rol del mensaje debe ser user o assistant` |
| `messages.*.content` | Obligatorio, **string**, ≤ 10 000 caracteres. Solo espacios cuenta como vacío | `Cada mensaje debe tener contenido` / `El contenido del mensaje debe ser una cadena de texto` / `Un mensaje no puede superar los 10000 caracteres` |
| Último mensaje | Debe ser `role: user` | `El último mensaje debe ser del usuario` (clave `messages`) |
| Último mensaje | Tras `trim`, ≤ **4 000** caracteres (más estricto que el historial) | `El mensaje no puede superar los 4000 caracteres` (clave `messages`) |

Detalles que importan:

- **`[]` es 422** con `Los mensajes son obligatorios` (Laravel trata el array vacío como ausente), no con `Debes enviar al menos un mensaje`.
- Las dos reglas del último mensaje solo se evalúan si las demás pasaron; el 422 trae **un solo grupo de errores** cada vez.
- El `content` del último mensaje se recorta con `trim` antes de mandarlo al modelo; el historial viaja **tal cual**, sin filtrar.
- Cualquier otra clave del body (`conversationId`, `id`, `trigger`, `parts`…) **se ignora en silencio**.
- Un `content` de `assistant` vacío (por ejemplo un turno anterior que terminó en `error` sin texto) es 422: el cliente debe **descartar** esos mensajes antes de mandar la lista.
- El tope de 50 obliga a **recortar el historial** en el cliente: conserva los últimos N (N ≤ 49) y la pregunta. Como el modelo no ve más que texto, cortar por el principio pierde solo contexto viejo.

### Tipos TypeScript

```ts
export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  /** Texto plano (o Markdown, en el caso del asistente). Nunca vacío. */
  content: string;
}

export interface ChatRequestBody {
  /** 1–50 mensajes en orden cronológico; el último es role 'user' y ≤ 4000 caracteres. */
  messages: ChatMessage[];
}

/** Sobre estándar de la API: lo que llega cuando NO se abre el stream (401, 403, 500). */
export interface ApiEnvelope<T = null> {
  statusCode: number;
  message: string;
  data: T;
}

/** 422 de validación: formato estándar de Laravel, no el sobre. */
export interface ValidationError {
  message: string;
  errors: Record<string, string[]>;
}
```

---

## 4. El stream: protocolo y parts

Cabeceras de la respuesta 200:

```
HTTP/1.1 200 OK
Content-Type: text/event-stream; charset=UTF-8
Cache-Control: no-cache, no-transform
x-vercel-ai-ui-message-stream: v1
```

Cada evento es una línea `data: <JSON>` seguida de una línea en blanco; el stream termina **siempre** con `data: [DONE]`, también tras un `error`. No hay `event:` ni `id:`; el JSON lleva la clave `type`.

Ejemplo real de un turno con una herramienta:

```
data: {"type":"start","messageId":"019…"}

data: {"type":"start-step"}

data: {"type":"tool-input-available","toolCallId":"call-1","toolName":"trips_summary","input":{"dateFrom":"2026-09-01","dateTo":"2026-09-30"}}

data: {"type":"tool-output-available","toolCallId":"call-1","output":"{\"total\":12,\"unassigned\":2,\"byStatus\":{…}}"}

data: {"type":"finish-step"}

data: {"type":"start-step"}

data: {"type":"text-start","id":"msg-1"}

data: {"type":"text-delta","id":"msg-1","delta":"En septiembre de 2026 hay "}

data: {"type":"text-delta","id":"msg-1","delta":"12 viajes registrados."}

data: {"type":"text-end","id":"msg-1"}

data: {"type":"finish-step"}

data: {"type":"finish","finishReason":"stop","messageMetadata":{"usage":{"inputTokens":1830,"outputTokens":41,"totalTokens":1871,"reasoningTokens":0,"cachedInputTokens":0}}}

data: [DONE]
```

| `type` | Claves | Qué significa para el front |
|---|---|---|
| `start` | `messageId` | Abre el mensaje del asistente. Va **una vez por turno**, seguido siempre de `start-step`. |
| `start-step` / `finish-step` | — | Cada paso del modelo (una ronda de herramientas o el texto final). Solo para mostrar «pensando…»; no cuentan nada. |
| `text-start` / `text-delta` / `text-end` | `id`, `delta` (solo en delta) | El texto de la respuesta, en trozos. Concatenar los `delta` con el mismo `id`. **Es Markdown.** |
| `tool-input-available` | `toolCallId`, `toolName`, `input` (objeto) | El modelo decidió llamar a una herramienta con esos argumentos. Sirve para pintar «Consultando viajes en ruta…». |
| `tool-output-available` | `toolCallId`, `output` (**string**) | El resultado de la herramienta. `output` es un **JSON serializado como string**: hay que `JSON.parse` para leerlo. Ver §5 para las formas y §6 para los reportes. |
| `reasoning-start` / `reasoning-delta` / `reasoning-end` | `id`, `delta` | Razonamiento del modelo, si el proveedor lo emite. Hoy no se espera de Gemini con esta configuración, pero el SDK lo reenviaría: ignóralos o muéstralos plegados, nunca como respuesta. |
| `error` | `errorText` | Fallo del proveedor a mitad del turno. Tras él **no hay `finish`**, solo `data: [DONE]`. Ver §7. |
| `finish` | `finishReason`, `messageMetadata.usage` | Cierra el turno. `finishReason` es `stop` (normal), `length` (se cortó por tokens), `tool-calls`, `content-filter`, `error` u `other`. `usage` es informativo. |

Lo que **no** vas a ver: `tool-approval-request` (ninguna herramienta pide aprobación), `tool-output-denied`, `file`, `source-url`, `data-*`. Si aparecen, es una versión nueva del backend.

### Qué contiene `output` cuando la herramienta no pudo trabajar

`output` sigue siendo un string, pero cambia de forma según el fallo. El modelo lo lee y lo explica en el texto; el front solo lo necesita si quiere pintar un estado en la burbuja de la herramienta:

| Situación | `output` |
|---|---|
| Éxito | JSON del resultado (§5) |
| Error de negocio del dominio (404 «El viaje no existe», 403 fuera de ámbito, 400) | `{"error":"<mensaje literal del dominio>"}` |
| Argumento obligatorio ausente o mal formado (`tripId`, `vehicleId`) | **Texto plano**, no JSON: `El argumento tripId es obligatorio`, `El argumento tripId debe ser un entero positivo`… El modelo reintenta solo. |
| `vehicle` sin `vehicleId` ni `plate` | `{"error":"Indica el id o la placa del vehículo"}` |
| `vehicle` con placa desconocida | `{"error":"No hay ningún vehículo con la placa P123ABC"}` |

Un fallo **inesperado** dentro de una herramienta (no `ApiException`) no llega como `output`: rompe el turno y sale como part `error` con `errorText: "An error occurred."`.

---

## 5. Las trece herramientas y sus salidas

El nombre viaja en `toolName`. Cada una envuelve un endpoint ya documentado en `references/`; la forma de las filas es **la de ese endpoint** (mismas claves camelCase, mismos formatos: dinero y galones como `string` de dos decimales, fechas `d-m-Y h:i:s A`, coordenadas `string` de ocho decimales). Solo se documentan aquí las diferencias.

| `toolName` | Envuelve | `input` que puede mandar el modelo | Forma de `output` (parseado) |
|---|---|---|---|
| `trips_summary` | `GET /api/dashboard/trips` | `carrierId?`, `dateFrom?`, `dateTo?` | `TripsSummary` de `dashboard-api.md`, tal cual |
| `trips_in_route` | `GET /api/dashboard/trips/in-route` | `carrierId?` | `{ count, trips: TripInRoute[] }` — sin paginar |
| `vehicle_expenses_summary` | `GET /api/dashboard/vehicle-expenses` | `carrierId?`, `dateFrom?`, `dateTo?` | `VehicleExpensesSummary`, tal cual |
| `fleet` | `GET /api/dashboard/vehicles` | `carrierId?`, `status?`, `condition?`, `inRoute?`, `limit?` | `{ total, returned, vehicles: DashboardVehicle[] }` |
| `trips` | `GET /api/trips` | `status?`, `clientId?`, `shippingLineId?`, `locationId?`, `pilotId?`, `vehicleId?`, `dateFrom?`, `dateTo?`, `search?`, `limit?` | `{ total, returned, trips: TripList[] }` (las 19 claves del listado) |
| `trip` | `GET /api/trips/{trip}` | `tripId` | `TripResource` **menos** `polyline`, `points`, `traveledPolyline`, `traveledPoints`, `pilotDpiImage`, `pilotLicenseImage`, `vehicleImage` (35 claves) |
| `trip_fuels` | `GET /api/trips/{trip}/fuels` | `tripId`, `limit?` | `{ totalGallons, total, returned, fuels: TripFuel[] }` |
| `trip_expenses` | `GET /api/trips/{trip}/expenses` | `tripId`, `limit?` | `{ totalAmount, total, returned, expenses: TripExpense[] }` |
| `trip_timeouts` | `GET /api/trips/{trip}/timeouts` | `tripId`, `limit?` | `{ total, returned, timeouts: TripTimeout[] }` |
| `vehicle` | `DashboardService::getVehicle()` (sin endpoint propio) | `vehicleId?` **o** `plate?` | `DashboardVehicle` + `purchasePrice` + `monthlyInsuranceCost` (13 claves) |
| `vehicle_expenses` | `GET /api/vehicle-expenses` | `vehicleId`, `category?`, `nature?`, `dateFrom?`, `dateTo?`, `isInvoiced?`, `limit?` | `{ totalAmount, total, returned, expenses: VehicleExpense[] }` — cada gasto **sin `invoiceUrl`** |
| `export_trips` | `ReportService::exportTrips()` | los de `trips` sin `limit` | `{ fileName, url, rows, total, truncated }` (§6) |
| `export_vehicle_expenses` | `ReportService::exportVehicleExpenses()` | los de `vehicle_expenses` sin `limit` | `{ fileName, url, rows, total, truncated, totalAmount }` (§6) |

Reglas comunes:

- **Los listados siempre paginan**, aunque el endpoint sea opt-in: primera página, **25 filas por defecto**, tope 100. `total` cuenta todo lo que cumple los filtros y `returned` lo que se devolvió; el modelo tiene instrucción de avisar cuando `total > returned`.
- **Los filtros son tolerantes** como en los endpoints: un valor inválido se ignora y la herramienta devuelve el conjunto completo. El modelo tiene instrucción de decirlo si lo sospecha.
- **`carrierId` de un `carrier` se ignora** siempre; para `administrator`/`manager` es un filtro voluntario.
- `vehicle` por placa **no distingue mayúsculas** y busca entre la flota que el usuario puede ver; es el paso previo que el modelo usa para `vehicle_expenses` y `export_vehicle_expenses` cuando el usuario da una placa.
- **No existe `trip_positions`**: el rastro punto a punto no se expone al modelo, y `trip` recorta las polilíneas. Si el usuario pregunta por el trazado, el asistente remite al mapa del viaje.
- Fuera del alcance del asistente (responde que no lo incluye y sugiere la pantalla): accesorios, salarios de pilotos, tarifas de flete, catálogos de clientes/navieras/destinos, Places, y cualquier **escritura** (crear, asignar, editar, borrar).

El modelo razona las fechas relativas («este mes», «la semana pasada») con la hora del servidor en **`America/Guatemala`**, y responde siempre en español, traduciendo los enums (`in_route` → «en ruta», `preventive` → «preventivo») y formateando dinero como `Q 12,345.67`.

---

## 6. Reportes Excel

Cuando el usuario pide **explícitamente** un archivo («genérame un reporte de Excel de los viajes terminados», «exporta los gastos del P123ABC de agosto»), el modelo llama a `export_trips` o `export_vehicle_expenses` con los mismos filtros que usaría para consultar. La API genera el `.xlsx` **en el servidor**, lo sube al bucket bajo `reports/{uuid}.xlsx` con URL **pública y permanente** (mismo mecanismo que las facturas y los documentos del piloto) y la herramienta devuelve:

```json
{
  "fileName": "viajes-2026-09-21-101530.xlsx",
  "url": "https://bucket.s3.amazonaws.com/reports/0199a1b2-….xlsx",
  "rows": 2,
  "total": 2,
  "truncated": false
}
```

| Campo | Tipo | Notas para el front |
|---|---|---|
| `fileName` | `string` | **Solo para mostrar.** `viajes-{Y-m-d-His}.xlsx` o `gastos-vehiculo-{vehicleId}-{Y-m-d-His}.xlsx`, hora de Guatemala. El navegador descargará `{uuid}.xlsx`; para forzar el nombre bonito, descarga por `fetch` → `Blob` → `<a download={fileName}>`. |
| `url` | `string` | Absoluta, pública, sin caducidad ni firma. No hay `Content-Disposition`. |
| `rows` | `number` | Filas escritas en el archivo. |
| `total` | `number` | Filas que cumplen los filtros (lo que devolvería el endpoint sin `limit`). |
| `truncated` | `boolean` | `true` cuando `total > rows`: **tope de 5 000 filas por archivo**; el archivo trae solo las primeras. El modelo tiene instrucción de avisar y ofrecer acotar. |
| `totalAmount` | `string` | Solo en `export_vehicle_expenses`: suma de **todos** los gastos que cumplen los filtros, no solo los exportados. |

El modelo cita el archivo en el texto como `[fileName](url)`; el front puede leerlo **también** del part `tool-output-available` (`JSON.parse(output)`) para pintar un botón de descarga propio. Columnas del archivo: viajes — `Id, Orden, Estado, Naviera, Punto de partida, Puerto, Contenedor, Fecha recolección, Fecha embarque, Inicio, Fin, Km estimados, Horas estimadas, Observaciones, Piloto, Placa, Registrado por`; gastos — `Id, Categoría, Naturaleza, Monto (Q), Fecha, Descripción, Facturado, Factura (URL), Registrado por, Creado`. `Estado` y `Naturaleza` van traducidos; importes y estimaciones como número.

Lo que hay que saber:

- **Sin purga.** Los reportes se acumulan en el bucket; no hay endpoint de listado, de descarga ni de borrado. Guardar la URL en el cliente es la única forma de volver a él.
- El ámbito es **el del usuario que pide**: un `carrier` exporta solo los viajes de su bolsa + su empresa y solo los gastos de sus vehículos (vehículo ajeno → `{"error": …}` con el 403 del dominio).
- Un reporte de un vehículo sin gastos es un archivo válido con solo cabeceras (`rows: 0`).
- Si falla la escritura o la subida, la herramienta devuelve `{"error":"…"}` y el modelo lo explica; no hay reintento.

---

## 7. Errores

### Antes de abrir el stream (sobre JSON)

| HTTP | Mensaje | Cuándo |
|---|---|---|
| 401 | `El token de sesión no es válido o ha expirado` | Sin token, token manipulado o expirado. |
| 403 | `No tienes permisos para acceder a este recurso` | El usuario es `pilot`. |
| 403 | `Debes estar vinculado a un transportista para acceder a este recurso` | `carrier` sin empresa registrada. |
| 422 | `{ message, errors }` de Laravel con los mensajes de §3 | Cuerpo inválido. |
| 500 | Sobre con `statusCode: 500` | Fallo al construir el agente (p. ej. `GEMINI_API_KEY` ausente). Excepcional. |

### Dentro del stream (siempre 200)

```
data: {"type":"error","errorText":"…"}

data: [DONE]
```

- `errorText` es el mensaje del proveedor cuando el fallo lo reportó él (cuota agotada, modelo no disponible, credencial rechazada…) y **`An error occurred.`** enmascarado para cualquier otra excepción a mitad del turno (una herramienta que reventó, el timeout de 90 s). No lo muestres tal cual: es inglés y puede exponer detalles del proveedor. Pinta un «El asistente no pudo responder, inténtalo de nuevo» y deja el botón de reintento.
- Tras un `error` **no hay `finish`**. `useChat` lo expone en `error` y en `onError`; el mensaje del asistente puede quedar con texto parcial.
- **No reintentes automáticamente**: cada turno cuesta y un error de cuota se repetiría. Deja que el usuario reenvíe; la lista de mensajes sigue en el cliente.

### Cómo los ve `useChat`

Con `DefaultChatTransport`, una respuesta no-2xx lanza un `Error` cuyo `message` es **el cuerpo como texto**: el sobre JSON del 401/403 o el `{ message, errors }` del 422. Parsea `error.message` con `try/catch` para distinguir un 401 (reemitir token y reintentar) de un 422 (bug del cliente: normalmente un `content` vacío o `system` en la lista).

---

## 8. Integración con React (`@ai-sdk/react`)

Requisitos: `ai` y `@ai-sdk/react` **v5** (los que hablan el protocolo `x-vercel-ai-ui-message-stream: v1`) y un renderizador de Markdown (`react-markdown` o similar).

```ts
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';

/** Aplana un UIMessage al { role, content } que espera la API. */
function toApiMessage(message: UIMessage): { role: 'user' | 'assistant'; content: string } | null {
  if (message.role !== 'user' && message.role !== 'assistant') return null; // 'system' sería 422

  const content = message.parts
    .filter((part): part is Extract<typeof part, { type: 'text' }> => part.type === 'text')
    .map((part) => part.text)
    .join('')
    .trim();

  return content ? { role: message.role, content } : null; // un content vacío sería 422
}

const MAX_MESSAGES = 50;

export function useAssistantChat(getToken: () => string) {
  return useChat({
    transport: new DefaultChatTransport({
      api: `${import.meta.env.VITE_API_URL}/api/assistant/chat`,
      headers: () => ({
        Authorization: `Bearer ${getToken()}`,
        Accept: 'application/json',
      }),
      prepareSendMessagesRequest: ({ messages, headers }) => {
        const flat = messages.map(toApiMessage).filter((m) => m !== null);

        // Recortar por el principio conservando la pregunta (el último) y el tope de 50.
        const body = { messages: flat.slice(-MAX_MESSAGES) };

        return { body, headers };
      },
    }),
  });
}
```

Y en la UI:

```tsx
const { messages, sendMessage, status, error, stop } = useAssistantChat(getToken);

// Enviar la pregunta del usuario:
sendMessage({ text: input });

// Pintar:
messages.map((m) => (
  <div key={m.id} data-role={m.role}>
    {m.parts.map((part, i) => {
      if (part.type === 'text') return <Markdown key={i}>{part.text}</Markdown>;

      // Herramientas: part.type === `tool-${toolName}`; state: 'input-available' | 'output-available' | 'output-error'
      if (part.type === 'tool-export_trips' || part.type === 'tool-export_vehicle_expenses') {
        if (part.state !== 'output-available') return <Spinner key={i} label="Generando reporte…" />;
        const report = JSON.parse(part.output as string) as { fileName: string; url: string; rows: number; total: number; truncated: boolean };
        return report.url ? <a key={i} href={report.url} download={report.fileName}>{report.fileName}</a> : null;
      }

      if (part.type.startsWith('tool-')) return <Spinner key={i} label="Consultando…" hidden={part.state === 'output-available'} />;

      return null;
    })}
  </div>
));
```

Notas:

- `status` pasa por `submitted` → `streaming` → `ready` (o `error`). Deshabilita el envío mientras no sea `ready`: **no hay cola de turnos** en el servidor y dos peticiones en paralelo compiten por el mismo historial.
- `stop()` cierra la conexión desde el cliente; el servidor no se entera hasta que intenta escribir, así que el turno puede seguir consumiendo cuota y **puede llegar a generar el reporte** que ya no verás.
- Al reenviar tras un `error`, el `UIMessage` del asistente con texto parcial se manda como historial (es texto válido); el que quedó **sin ningún texto** lo descarta `toApiMessage`. Si prefieres, elimínalo del estado antes de reenviar.
- El historial que viaja es **solo texto**: en el turno siguiente el modelo no recuerda los datos de las herramientas más que por lo que escribió en la respuesta. Si el usuario quiere «los mismos viajes de antes pero en Excel», el modelo volverá a consultarlos; es lo esperado.
- Si el front no usa React, cualquier parser de SSE vale: lee `data:` línea a línea, ignora `[DONE]`, y aplica la tabla de §4. Con `fetch` + `ReadableStream`; `EventSource` no sirve porque no admite `POST` ni cabeceras.
- **Proxies y buffering.** La respuesta lleva `Cache-Control: no-cache, no-transform`, pero no `X-Accel-Buffering`. Si el despliegue tiene Nginx delante con `proxy_buffering on`, el cliente verá el turno entero de golpe al final en vez de en streaming: es infraestructura, no la API.

---

## 9. Checklist de implementación en el frontend

- [ ] Ocultar el asistente a `pilot` y al `carrier` sin empresa (el 403 del servidor es la red, no la UX).
- [ ] `useChat` con `DefaultChatTransport` + `prepareSendMessagesRequest` que aplane `parts[]` a `content` string, descarte roles distintos de `user`/`assistant` y mensajes vacíos, y recorte a 50.
- [ ] Limitar el input del usuario a 4 000 caracteres **antes** de enviar; el servidor hace `trim`.
- [ ] Persistir la lista de mensajes en el cliente (estado de la página, `sessionStorage`…) si se quiere sobrevivir a una recarga: **el servidor no la guarda**.
- [ ] Renderizar el texto del asistente como Markdown (enlaces, listas, tablas).
- [ ] `JSON.parse` sobre `output` de `tool-output-available`; contemplar que sea texto plano o `{"error"}`.
- [ ] Botón de descarga propio para `export_*` leyendo `fileName`/`url` del tool part; avisar si `truncated`.
- [ ] Mapear el part `error` a un mensaje genérico en español con reintento manual; no mostrar `errorText`.
- [ ] Parsear `error.message` de `useChat` como JSON para distinguir 401 (reemitir con `check-status` y reintentar el mismo turno) de 403/422.
- [ ] Sin timeout corto de cliente sobre esta petición (turnos de hasta 90 s); deshabilitar el envío mientras `status !== 'ready'`.
- [ ] Indicador de «consultando…» a partir de `tool-input-available` / `start-step`; no contar pasos ni asumir un número fijo de herramientas.
- [ ] Ignorar parts desconocidos (`reasoning-*`, futuros `data-*`) sin romper el render.

---

## 10. Lo que este dominio **no** hace (para no diseñarlo en el front)

- **No guarda conversaciones.** Sin `conversationId`, sin `GET` de historial, sin borrado, sin cabecera `X-Conversation-Id`. Las tablas `agent_conversations` del paquete existen en la base pero **nadie escribe en ellas**.
- **No escribe datos de negocio.** Ninguna herramienta crea, asigna, edita ni borra; el asistente lo dice y remite a la pantalla. Lo único que persiste es el `.xlsx` de un reporte.
- **No expone el rastro GPS** (`trip_positions`) ni las polilíneas ni las imágenes: para el mapa y las fotos están `GET /api/trips/{trip}` y `/positions`.
- **No cubre** accesorios, salarios, tarifas de flete, catálogos, Places ni combustible agregado por empresa o periodo.
- **No pagina más allá de la primera página** dentro de una herramienta: el modelo puede pedir `limit` hasta 100 y avisar de que hay más; no hay `page`.
- **No acepta mensajes `system`** ni instrucciones del cliente al modelo: el prompt del sistema es del servidor y lleva nombre, rol, empresa y hora del usuario.
- **No purga ni firma los reportes**; no hay endpoint de descarga ni `Content-Disposition`.
- **No reintenta** contra el proveedor ni encola turnos; un error de cuota es un part `error` y punto.
- **No emite por websocket** ni notifica nada: el stream vive dentro de la petición `POST`.
- **No valida coherencia de la respuesta**: el modelo puede equivocarse al interpretar; los números salen de las herramientas, la redacción no. Para una cifra oficial está el tablero.
