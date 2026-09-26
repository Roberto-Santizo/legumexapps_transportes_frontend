# Reportes descargables — referencia de integración para el frontend

Referencia del dominio **Reports** de la API de Legumex Transportes, con **un solo endpoint**: `GET /api/reports/trips`, bajo el prefijo `/api/reports` (SPEC 38). Devuelve **en binario** un Excel (`.xlsx`) con los viajes cuya fecha de recolección cae en un rango.

Todo lo que hay aquí está verificado contra la implementación real (`routes/reports.php`, `ReportController`, `ExportTripsReportRequest`, `ReportService::downloadTrips()`) y contra su suite (`tests/Feature/ReportTest.php`, `tests/Unit/ReportServiceTest.php`). Los mensajes de error son literales: se pueden mostrar tal cual al usuario.

> Documentación OpenAPI viva: `/api/documentation` (tag **Reports**).

---

## 1. Lo mínimo que hay que saber antes de escribir código

1. **La respuesta exitosa NO es JSON.** Es el archivo `.xlsx` en binario: léela con `response.blob()`, nunca con `response.json()`. Es la única respuesta de la API que no viaja en el sobre `{ statusCode, message, data }`.
2. **Los errores sí son JSON.** 400, 401 y 403 llegan en el sobre habitual, y el 422 con el formato de validación de Laravel. Comprueba `response.ok` (o el `Content-Type`) **antes** de decidir entre `blob()` y `json()`: si haces `blob()` a ciegas, el usuario descarga un «Excel» que en realidad es un JSON de error.
3. **No puedes leer el nombre del archivo desde la cabecera si el front está en otro origen.** El backend manda `Content-Disposition: attachment; filename="viajes-{dateFrom}_{dateTo}.xlsx"`, pero `config/cors.php` tiene `exposed_headers: []`, y `Content-Disposition` no es una cabecera que el navegador exponga por defecto: en una petición cross-origin, `response.headers.get('Content-Disposition')` devuelve `null`. El nombre es determinista, así que **constrúyelo tú** con las mismas fechas que mandaste: `` `viajes-${dateFrom}_${dateTo}.xlsx` ``.
4. **`dateFrom` y `dateTo` son obligatorios** y van en `Y-m-d` estricto (`2026-09-01`, no `01/09/2026` ni `2026-9-1`). Los dos extremos son **inclusivos y cuentan el día completo**: `dateTo=2026-09-30` incluye un viaje de ese día a las 23:59:59. No hay rango máximo.
5. **Más de 5000 viajes en el rango es un 400**, no un archivo cortado: «El reporte excede 5000 viajes; acota el rango de fechas». Muéstralo tal cual y deja que el usuario acote las fechas.
6. **Las columnas dependen del rol.** Todos reciben 22 columnas base; `administrator`, `manager`, `export` y `shipment` reciben además «Productos» y «Total de cajas» al final (24). `carrier` y `user` se quedan en 22 **aunque sí puedan leer `GET /api/trip-finished-products`**: el reporte tiene su propia matriz.
7. **Un rango sin viajes no es un error**: responde 200 con un Excel que solo trae la fila de encabezados. No lo trates como 404 ni como fallo.

---

## 2. Autenticación y permisos

El endpoint exige el token JWT que devuelve el login:

```
Authorization: Bearer {token}
Accept: application/json
```

`Accept: application/json` no impide recibir el Excel en el 200; sirve para que los errores lleguen como JSON.

Sin token, o con uno expirado, la respuesta es **401**:

```json
{ "statusCode": 401, "message": "El token de sesión no es válido o ha expirado", "data": null }
```

| Acción | `administrator` | `manager` | `carrier` | `export` | `user` | `shipment` | `pilot` |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Descargar el reporte | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 403 |
| Viajes que recibe | todos | todos | bolsa libre + los que tomó su empresa | todos | todos | todos | — |
| Columnas | 24 | 24 | 22 | 24 | 22 | 24 | — |

- **Sin `carrier.required`**, igual que `GET /api/trips`: el ámbito del `carrier` lo resuelve el servidor. Un `carrier` sin empresa vinculada no recibe 403: descarga lo que el listado de viajes le mostraría (la bolsa libre).
- El ámbito es **exactamente el de `GET /api/trips`**: si un usuario no ve un viaje en el listado, tampoco sale en el Excel.

El `pilot` recibe **403**:

```json
{ "statusCode": 403, "message": "No tienes permisos para acceder a este recurso", "data": null }
```

---

## 3. El recurso: el archivo `.xlsx`

No hay objeto JSON en la respuesta exitosa. `data` no existe: el cuerpo **es** el archivo.

```
HTTP/1.1 200 OK
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="viajes-2026-09-01_2026-09-30.xlsx"

<bytes del .xlsx>
```

El archivo tiene **una sola hoja**. La primera fila son los encabezados, en negrita; después viene una fila por viaje, ordenadas por **fecha de recolección descendente** y, en caso de empate, por **id descendente** (el mismo orden que `GET /api/trips`). Los viajes borrados nunca aparecen.

### Columnas base (22, todos los roles autorizados)

| # | Encabezado | Contenido | Tipo de celda |
|---|---|---|---|
| 1 | Id | id del viaje | número |
| 2 | Orden | `order` | texto |
| 3 | Estado | `Pendiente` / `En ruta` / `Finalizado` (**traducido al español**, no el valor del enum) | texto |
| 4 | Cliente | nombre del cliente | texto |
| 5 | Naviera | nombre de la naviera | texto |
| 6 | Punto de partida | nombre del punto de partida | texto |
| 7 | Puerto | nombre del destino (puerto) | texto |
| 8 | Destino final | `destination` | texto |
| 9 | Transporte | `transport` | texto |
| 10 | Contenedor | `container` | texto |
| 11 | Fecha recolección | `d-m-Y h:i:s A` | texto |
| 12 | Fecha embarque | `d-m-Y h:i:s A` | texto |
| 13 | Inicio | `d-m-Y h:i:s A`, vacía si no ha iniciado | texto |
| 14 | Fin | `d-m-Y h:i:s A`, vacía si no ha terminado | texto |
| 15 | Km estimados | vacía en viajes anteriores a SPEC 30 | **número** |
| 16 | Horas estimadas | horas decimales; vacía en viajes anteriores a SPEC 30 | **número** |
| 17 | Km reales | vacía mientras el viaje no haya terminado | **número** |
| 18 | Horas reales | horas decimales; vacía mientras no haya terminado | **número** |
| 19 | Observaciones | `observations` | texto |
| 20 | Piloto | nombre del piloto; **vacía** en un viaje de la bolsa | texto |
| 21 | Placa | placa del vehículo; **vacía** en un viaje de la bolsa | texto |
| 22 | Registrado por | nombre de quien publicó el viaje | texto |

### Columnas de productos (2 más, solo `administrator`, `manager`, `export` y `shipment`)

| # | Encabezado | Contenido | Tipo de celda |
|---|---|---|---|
| 23 | Productos | `CODE1 × 120 cajas; CODE2 × 40 cajas`, en el orden en que se agregaron las líneas; **vacía** si el viaje no tiene líneas. Un producto terminado borrado después sigue saliendo con su `code`. | texto |
| 24 | Total de cajas | suma de las cajas de todas las líneas; **`0`** sin líneas | número |

Formatos, explícitos:

- Las fechas van en el formato propio de la API, **`d-m-Y h:i:s A`** (`10-09-2026 03:00:00 PM`), **no ISO 8601**, y como texto: Excel no las reconoce como fecha.
- Km, horas y total de cajas son celdas **numéricas** (Excel las suma); cualquier `null` es una **celda vacía**, no `0` ni `"null"`.
- El separador de productos es `; ` y el signo de multiplicar es `×` (U+00D7), no la letra `x`.

### Tipos TypeScript sugeridos

```ts
export type TripStatusFilter = 'pending' | 'in_route' | 'finished';

export interface TripsReportParams {
  /** Y-m-d, obligatorio, inclusivo. */
  dateFrom: string;
  /** Y-m-d, obligatorio, inclusivo, no anterior a dateFrom. */
  dateTo: string;
  status?: TripStatusFilter;
  clientId?: number;
  shippingLineId?: number;
  locationId?: number;
  pilotId?: number;
  vehicleId?: number;
  search?: string;
}

export interface ApiEnvelopeError {
  statusCode: number;
  message: string;
  data: null;
}

export interface ValidationErrorResponse {
  message: string;
  errors: Partial<Record<'dateFrom' | 'dateTo', string[]>>;
}

export const tripsReportFileName = (p: Pick<TripsReportParams, 'dateFrom' | 'dateTo'>): string =>
  `viajes-${p.dateFrom}_${p.dateTo}.xlsx`;
```

---

## 4. Formato de las respuestas

### Éxito (200) — binario

Sin sobre. Cuerpo = bytes del `.xlsx`; cabeceras `Content-Type` y `Content-Disposition` como en la sección 3. **No hay listado paginado ni sin paginar**: el archivo trae siempre todos los viajes del rango, y `limit` se ignora.

### Error de negocio (400, 401, 403)

Sobre habitual, `Content-Type: application/json`:

```json
{ "statusCode": 400, "message": "El reporte excede 5000 viajes; acota el rango de fechas", "data": null }
```

### Error de validación (422) — **formato distinto**

No lleva `statusCode` ni `data`: es el formato estándar de Laravel `{ message, errors }`.

```json
{
  "message": "La fecha inicial es obligatoria (and 1 more error)",
  "errors": {
    "dateFrom": ["La fecha inicial es obligatoria"],
    "dateTo": ["La fecha final es obligatoria"]
  }
}
```

---

## 5. Endpoint

### 5.1 `GET /api/reports/trips` — descargar el reporte de viajes

Todo rol salvo `pilot`. Sin cuerpo: todo va en la query string.

**Query params**

| Param | Obligatorio | Reglas | Notas |
|---|:--:|---|---|
| `dateFrom` | ✅ | `Y-m-d` estricto | Primer día del rango sobre la fecha de recolección, inclusive. |
| `dateTo` | ✅ | `Y-m-d` estricto, igual o posterior a `dateFrom` | Último día, inclusive y por día completo. `dateFrom` igual a `dateTo` es válido (un solo día). Sin rango máximo. |
| `status` | — | tolerante | `pending`, `in_route` o `finished`. Cualquier otro valor (`?status=basura`) **se ignora** y no filtra. |
| `clientId`, `shippingLineId`, `locationId`, `pilotId`, `vehicleId` | — | tolerantes | Un id numérico filtra; un valor no numérico se ignora. |
| `search` | — | tolerante | `LIKE` sobre orden y contenedor, sin distinguir mayúsculas. |
| `limit` | — | se ignora | El archivo trae todos los viajes del rango. |

Los filtros opcionales son **los mismos de `GET /api/trips`** y con las mismas reglas: nunca producen 422 ni un Excel vacío por un valor inválido.

**Ejemplo**

```
GET /api/reports/trips?dateFrom=2026-09-01&dateTo=2026-09-30&status=finished
```

**Respuestas**

| Código | Cuándo | Cuerpo |
|---|---|---|
| 200 | Rango válido, 0–5000 viajes | `.xlsx` binario (con 0 viajes, solo encabezados) |
| 400 | Más de 5000 viajes en el rango | sobre: `El reporte excede 5000 viajes; acota el rango de fechas` |
| 401 | Sin token o token expirado | sobre: `El token de sesión no es válido o ha expirado` |
| 403 | El rol es `pilot` | sobre: `No tienes permisos para acceder a este recurso` |
| 422 | Falta alguna fecha, formato inválido o `dateTo` anterior a `dateFrom` | `{ message, errors }` |

No hay mensaje de éxito: el 200 no lleva sobre.

**Descarga en el navegador (ejemplo)**

```ts
export async function downloadTripsReport(params: TripsReportParams, token: string): Promise<void> {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)]),
  );

  const response = await fetch(`${API_URL}/api/reports/trips?${query}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });

  if (!response.ok) {
    // 400/401/403 → ApiEnvelopeError; 422 → ValidationErrorResponse
    throw await response.json();
  }

  const url = URL.createObjectURL(await response.blob());
  const link = Object.assign(document.createElement('a'), { href: url, download: tripsReportFileName(params) });
  link.click();
  URL.revokeObjectURL(url);
}
```

---

## 6. Tabla de mensajes de error (literales)

Se pueden mostrar tal cual al usuario; ya están en español.

| Campo / código | Mensaje |
|---|---|
| `dateFrom` (422) | `La fecha inicial es obligatoria` · `La fecha inicial debe tener el formato AAAA-MM-DD` |
| `dateTo` (422) | `La fecha final es obligatoria` · `La fecha final debe tener el formato AAAA-MM-DD` · `La fecha final no puede ser anterior a la fecha inicial` |
| 400 | `El reporte excede 5000 viajes; acota el rango de fechas` · `No se pudo generar el reporte` (fallo interno al escribir el archivo) |
| 401 | `El token de sesión no es válido o ha expirado` |
| 403 | `No tienes permisos para acceder a este recurso` |

---

## 7. Checklist de implementación en el frontend

- [ ] Selector de rango con `dateFrom` y `dateTo` obligatorios, serializados como `YYYY-MM-DD` (nunca con la hora ni en ISO completo).
- [ ] Validar en el cliente que `dateTo >= dateFrom` antes de pedir; el 422 del servidor es la red, no la UX.
- [ ] Reutilizar los filtros del listado de viajes (`status`, `clientId`, `shippingLineId`, `locationId`, `pilotId`, `vehicleId`, `search`) y **no** mandar `limit`.
- [ ] `fetch` con `Authorization: Bearer` y `Accept: application/json`; comprobar `response.ok` **antes** de `blob()`.
- [ ] En error, parsear JSON y distinguir el sobre `{ statusCode, message, data }` (400/401/403) del `{ message, errors }` (422).
- [ ] Nombre del archivo construido en el cliente: `viajes-{dateFrom}_{dateTo}.xlsx` (no depender de `Content-Disposition`, que en cross-origin no es legible).
- [ ] Mostrar el 400 de «excede 5000 viajes» como aviso para acotar el rango, no como error genérico.
- [ ] Ocultar el botón de descarga al `pilot`.
- [ ] Estado de carga mientras se genera: un rango grande (hasta 5000 viajes) tarda más que una página del listado.
- [ ] No pintar columnas de productos en ninguna vista previa para `carrier` y `user`: el archivo no las trae.

---

## 8. Lo que este dominio **no** hace (para no diseñarlo en el front)

- No devuelve JSON con las filas ni una vista previa: solo el archivo.
- No sube el archivo a ningún bucket, no devuelve URL y no guarda historial de reportes: cada descarga se genera en la petición.
- No hay galones, viáticos, costo del viaje ni ninguna columna de dinero.
- No hay rango máximo de fechas; el único freno es el tope de 5000 viajes.
- No hay otros reportes descargables (gastos de vehículo, flota, etc.) ni formatos distintos de `.xlsx` (CSV, PDF).
- No hay generación asíncrona, cola ni aviso por correo o push cuando el reporte está listo.
- No es el mismo archivo que genera el asistente (tool `export_trips`): aquella exportación sube a `reports/{uuid}.xlsx`, trae otras 17 columnas y no distingue roles.
- No hay orden configurable (`sortBy`, `sortDir`) ni selección de columnas.
