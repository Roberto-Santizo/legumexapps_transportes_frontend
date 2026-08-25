# Gastos de mantenimiento de vehículos — referencia de integración para el frontend

Referencia completa del dominio **VehicleExpenses** de la API de Legumex Transportes: cinco endpoints REST bajo `/api/vehicle-expenses` para registrar los gastos de mantenimiento de un vehículo —categoría, naturaleza preventiva o correctiva, monto, fecha, descripción y, desde SPEC 19, **si el gasto fue facturado y el archivo de la factura**—.

Todo lo que hay aquí está verificado contra la implementación real (Laravel 13) y contra su suite de tests (203 pruebas). Los mensajes de error son literales: se pueden mostrar tal cual al usuario.

> Documentación OpenAPI viva: `/api/documentation`.

---

## ⚠️ CAMBIO INCOMPATIBLE EN EL ALTA — LÉELO ANTES DE NADA

`POST /api/vehicle-expenses` **pasó de seis campos obligatorios a siete**. El campo nuevo es `is_invoiced` y **no tiene valor por omisión**: un alta que ayer devolvía 201 hoy devuelve **422** con el mensaje `Debes indicar si el gasto fue facturado`.

**No hay periodo de gracia ni versión de compatibilidad.** El front es interno y se despliega junto con la API: si se despliega la API primero, **todas las altas de gastos se rompen**. Coordina el despliegue.

Y su compañero: `is_invoiced` e `invoice` **son inmutables**. Se fijan en el alta y **no existe ningún endpoint para cambiarlos** — ni marcar, ni desmarcar, ni reemplazar el archivo, ni eliminarlo. Ver la sección 1, puntos 11 a 14.

---

## 1. Lo mínimo que hay que saber antes de escribir código

1. **`vehicleId` es obligatorio en el listado.** `GET /api/vehicle-expenses` sin `vehicleId` responde **422**, no un listado vacío ni los gastos de toda la flota. Es el único filtro obligatorio de toda la API: este dominio existe para una sola pantalla, el detalle de un vehículo. **No hay listado global de la flota** y no lo habrá.
2. **`totalAmount` no es `total`.** Los dos viajan en la raíz del mismo sobre y significan cosas distintas: `total` es el **conteo de registros** que aporta el paginador, `totalAmount` es la **suma en GTQ** de los montos. Confundirlos es el error más caro de este dominio.
3. **`totalAmount` suma todos los gastos filtrados, no los de la página.** Con `limit=10` sobre 12 gastos, `data` trae 10 elementos pero `totalAmount` suma los 12. Y aparece **siempre**, con y sin paginación, porque es dato de negocio y no metadata del paginador.
4. **El cuerpo va en `snake_case`, la respuesta sale en `camelCase`.** Se envía `vehicle_id`, `expense_date` e `is_invoiced`; se recibe `vehicleId`, `expenseDate` e `isInvoiced`. No es simétrico y no hay conversión automática.
5. **Las fechas salen formateadas, no en ISO 8601.** `expenseDate` es `12-08-2026` (`d-m-Y`) y `createdAt` es `12-08-2026 04:31:07 PM` (`d-m-Y h:i:s A`). `new Date(...)` sobre esas cadenas devuelve `Invalid Date`: trátalas como texto ya listo para pintar.
6. **Toda respuesta viaja en un sobre** `{ statusCode, message, data }`… **salvo el 422 de validación**, que usa el formato estándar de Laravel `{ message, errors }`. Son dos formas distintas y el cliente debe distinguirlas.
7. **`categoría` y `naturaleza` son ejes independientes.** No hay validación cruzada: cualquiera de las 22 categorías admite `preventive` y `corrective`. Cambiar llantas por desgaste programado es `tires` + `preventive`; por un reventón, `tires` + `corrective`.
8. **`DELETE` borra de verdad.** No es baja lógica: la fila desaparece y un segundo `DELETE` del mismo id responde 404. No hay papelera, no hay `SoftDeletes` y no hay historial de ediciones.
9. **El vehículo del gasto es inmutable.** El `PATCH` no acepta `vehicle_id`; mandarlo no es un error, simplemente se ignora. Mover un gasto de vehículo es borrarlo y volverlo a crear.
10. **Un vehículo `inactive` acepta gastos igual que uno `active`.** El mantenimiento pudo ocurrir antes de la baja, así que el estado del vehículo nunca bloquea nada aquí.
11. **`is_invoiced` es obligatorio en el alta y no tiene valor por omisión.** Ver el aviso de arriba. Acepta `true`, `false`, `1`, `0`, `"1"` y `"0"`; cualquier otra cosa es 422.
12. **Cuando se adjunta factura el alta va en `multipart/form-data`, no en JSON.** Un archivo no viaja en un cuerpo JSON. Sin factura sirven los dos formatos.
13. **Con `is_invoiced` en `false`, un archivo enviado se descarta EN SILENCIO.** La respuesta es **201**, no 422: no se sube nada y el gasto queda sin factura. **El backend no avisa** — es responsabilidad del front no dejar que el usuario adjunte un archivo con el interruptor apagado, o detectarlo leyendo `isInvoiced` en la respuesta.
14. **La facturación es inmutable y el `PATCH` la ignora en silencio.** Mandar `is_invoiced` o subir un `invoice` en la edición responde **200 sin guardar nada** y sin error. Corregir un gasto mal facturado es **borrarlo y volverlo a crear**, perdiendo su `id`, su `createdAt` y su `registeredBy` original.
15. **El `DELETE` borra también el archivo de la factura.** Es el único endpoint del proyecto que hace esto. Si el usuario necesita el archivo, hay que **descargarlo antes de borrar**: después la URL deja de resolver.
16. **`invoiceUrl` es una URL pública sin token y sin caducidad**, servida desde el dominio del bucket y no desde el de esta API. Quien la tenga ve la factura sin autenticarse: no la reenvíes fuera de la aplicación ni la guardes como identificador (puede cambiar de dominio sin que cambie el gasto).

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
| Listar (`GET /`) | ✅ todas las empresas | ✅ solo la suya | 403 | ✅ todas las empresas |
| Ver detalle (`GET /{id}`) | ✅ | ✅ solo la suya | 403 | ✅ |
| Registrar (`POST /`) | ✅ | ✅ solo la suya | 403 | **403** |
| Editar (`PATCH /{id}`) | ✅ | ✅ solo la suya | 403 | **403** |
| Borrar (`DELETE /{id}`) | ✅ | ✅ solo la suya | 403 | **403** |

Los permisos van **por acción**: el `manager` **lee pero no escribe**. El `pilot` recibe 403 en los cinco.

**Este dominio NO lleva el middleware `carrier.required`**, a diferencia de Vehicles. El ámbito lo resuelve el servicio a partir del vehículo del gasto: un `carrier` sin empresa vinculada recibe 403 con el mensaje `No perteneces a ninguna empresa transportista`, que viene del servicio y no de un middleware.

Un `carrier` que toca un vehículo o un gasto **de otra empresa** recibe **403**, nunca 404.

Un rol sin permiso de escritura recibe **403**:

```json
{ "statusCode": 403, "message": "No tienes permisos para acceder a este recurso", "data": null }
```

---

## 3. El objeto `VehicleExpense`

Es lo que devuelve `data` en los cinco endpoints (o cada elemento de `data` en el listado). **Doce claves**, siempre en camelCase y siempre en este orden:

```json
{
  "id": 41,
  "vehicleId": 7,
  "category": "tires",
  "nature": "preventive",
  "amount": "1250.00",
  "expenseDate": "12-08-2026",
  "description": "Cuatro llantas nuevas, taller El Rodaje, factura A-9912",
  "isInvoiced": true,
  "invoiceUrl": "https://bucket.s3.amazonaws.com/invoices/9f3a1c2e-4b5d-6e7f-8a9b-0c1d2e3f4a5b.pdf",
  "invoiceType": "pdf",
  "registeredBy": "Roberto Santizo",
  "createdAt": "12-08-2026 04:31:07 PM"
}
```

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `number` | Identificador del gasto; es el que viaja en `/{id}`. |
| `vehicleId` | `number` | Vehículo al que pertenece. **Inmutable** tras el alta. |
| `category` | `string` | Uno de los 22 valores del enum (sección 3.1). En `snake_case`; la etiqueta en español la pone el front. |
| `nature` | `string` | `preventive` o `corrective`. Eje independiente de `category`. |
| `amount` | `string` | Monto en **GTQ**, siempre con dos decimales. Llega como **string**, no como número: `"1250.00"`. |
| `expenseDate` | `string` | Día del gasto en `d-m-Y`. **Sin hora** y **no es ISO 8601**. |
| `description` | `string` | Texto libre obligatorio. Es donde caben el taller, el número de factura y el detalle de la pieza. |
| `isInvoiced` | `boolean` | **Booleano JSON de verdad** (`true` / `false`), nunca `1`, `0` ni una cadena. **Inmutable** tras el alta. |
| `invoiceUrl` | `string \| null` | URL **pública y absoluta** del archivo, o `null` si el gasto no está facturado. Sin token y sin caducidad. No sirve como identificador. |
| `invoiceType` | `string \| null` | Extensión real del archivo: `"jpg"`, `"png"` o `"pdf"`, o `null` sin factura. **`"jpeg"` no es un valor posible**: se guarda siempre como `jpg`. |
| `registeredBy` | `string` | **Nombre** del usuario que lo registró, no su id. El id no sale nunca por la API. |
| `createdAt` | `string` | Cuándo se **capturó** el gasto, en `d-m-Y h:i:s A`. No es lo mismo que `expenseDate`. |

**Invariantes de la factura:**

- `isInvoiced: false` ⟹ `invoiceUrl` e `invoiceType` son **siempre** `null`.
- `isInvoiced: true` con `invoiceUrl: null` **no puede existir**: el archivo es obligatorio cuando el gasto se marca como facturado. No hace falta programar ese caso.
- Para decidir si pintas `<img>` o un enlace de descarga, mira **`invoiceType`**, no la extensión de la URL.

No hay `updatedAt`, ni `mileage`, ni `supplier`, ni `invoiceNumber`, ni fecha de la factura, ni estado de pago.

### 3.1 Las 22 categorías

```
tires · oil_change · brakes · spare_part · battery · suspension · engine ·
transmission · electrical_system · cooling_system · filters ·
alignment_balancing · clutch · exhaust · air_conditioning · bodywork_paint ·
glass_mirrors · inspection · washing · towing · labor · other
```

`other` es un caso más del enum, sin trato especial. **La lista es cerrada y solo cambia con un despliegue**: no hay endpoint que la devuelva ni catálogo administrable, así que el front la escribe a mano. Si algún día se añade una categoría, este documento y el `enum` del Swagger son la fuente a consultar.

### Tipos TypeScript sugeridos

```ts
export type VehicleExpenseCategory =
  | 'tires' | 'oil_change' | 'brakes' | 'spare_part' | 'battery'
  | 'suspension' | 'engine' | 'transmission' | 'electrical_system'
  | 'cooling_system' | 'filters' | 'alignment_balancing' | 'clutch'
  | 'exhaust' | 'air_conditioning' | 'bodywork_paint' | 'glass_mirrors'
  | 'inspection' | 'washing' | 'towing' | 'labor' | 'other';

export type VehicleExpenseNature = 'preventive' | 'corrective';

/** Extensión real del adjunto. Nunca 'jpeg': un JPEG se guarda como 'jpg'. */
export type InvoiceType = 'jpg' | 'png' | 'pdf';

export interface VehicleExpense {
  id: number;
  vehicleId: number;
  category: VehicleExpenseCategory;
  nature: VehicleExpenseNature;
  /** GTQ con dos decimales. Llega como string: parsear antes de operar. */
  amount: string;
  /** Día del gasto, formato d-m-Y. NO es ISO 8601. */
  expenseDate: string;
  description: string;
  /** Booleano JSON de verdad. Inmutable tras el alta. */
  isInvoiced: boolean;
  /** URL pública sin token ni caducidad. null si no está facturado. */
  invoiceUrl: string | null;
  /** Qué pintar: imagen o enlace. null si no está facturado. */
  invoiceType: InvoiceType | null;
  /** Nombre del usuario, no su id. */
  registeredBy: string;
  /** Fecha de captura, formato d-m-Y h:i:s A. NO es ISO 8601. */
  createdAt: string;
}

/** Sobre estándar de la API. */
export interface ApiEnvelope<T> {
  statusCode: number;
  message: string;
  data: T;
}

/** Listado sin `limit`: hay acumulado pero no metadatos de paginación. */
export interface VehicleExpenseList extends ApiEnvelope<VehicleExpense[]> {
  /** Suma en GTQ de TODOS los gastos filtrados, no los de la página. */
  totalAmount: string;
}

/** Listado con `limit` numérico. */
export interface PaginatedVehicleExpenseList extends VehicleExpenseList {
  /** CONTEO de registros, no dinero. */
  total: number;
  currentPage: number;
  lastPage: number;
}

/** Cuerpo del alta: snake_case, a diferencia de la respuesta. */
export interface StoreVehicleExpensePayload {
  vehicle_id: number;
  category: VehicleExpenseCategory;
  nature: VehicleExpenseNature;
  amount: number;
  /** Y-m-d recomendado. No admite fechas futuras. */
  expense_date: string;
  description: string;
  /** OBLIGATORIO. Sin valor por omisión: omitirlo es 422. */
  is_invoiced: boolean;
  /** Obligatorio SOLO si is_invoiced es true. Con false se descarta en silencio. */
  invoice?: File;
}

/**
 * Cuerpo de la edición: todo opcional y SIN vehicle_id, is_invoiced ni invoice.
 * Los tres se ignoran en silencio si se envían.
 */
export type UpdateVehicleExpensePayload = Partial<
  Omit<StoreVehicleExpensePayload, 'vehicle_id' | 'is_invoiced' | 'invoice'>
>;

/** Error de validación: formato distinto al sobre. */
export interface ValidationError {
  message: string;
  errors: Record<string, string[]>;
}
```

---

## 4. `totalAmount` frente a `total`

Merece sección propia porque es el punto donde este dominio se rompe en silencio.

| Clave | Qué es | Tipo | ¿Cuándo aparece? |
|---|---|---|---|
| `totalAmount` | **Suma en GTQ** de `amount` de todos los gastos que cumplen los filtros | `string` con dos decimales | **Siempre**, con y sin `limit` |
| `total` | **Conteo** de registros que cumplen los filtros | `number` | Solo con un `limit` numérico |

Las dos viajan **en la raíz del sobre**, una al lado de la otra. Reglas prácticas:

- Para pintar «Gasto acumulado: Q 18,430.50» usa **`totalAmount`**, nunca la suma de `data`, que solo cubre la página actual.
- Para pintar «23 gastos» usa **`total`** cuando pagines, o `data.length` cuando no.
- `totalAmount` **respeta los filtros**: al filtrar por `category=tires` el acumulado pasa a ser solo el de las llantas. Es la cifra correcta para un resumen filtrado.
- **Lo mismo con `isInvoiced`**: `?isInvoiced=true` devuelve el acumulado **solo de lo facturado**. Es la única forma de obtener ese desglose — el listado **no** devuelve un total facturado y otro sin facturar por separado. Para pintar los dos, hacen falta dos llamadas.
- Un vehículo sin gastos devuelve `"totalAmount": "0.00"`, no `null` ni `0`.

---

## 5. Formato de las respuestas

### Éxito

```json
{ "statusCode": 200, "message": "Gasto obtenido correctamente", "data": { ... } }
```

### Listado sin paginar (sin `limit`)

`data` es el array completo, hay `totalAmount` y **no hay** metadatos de paginación:

```json
{
  "statusCode": 200,
  "message": "Gastos obtenidos correctamente",
  "data": [ /* VehicleExpense[] */ ],
  "totalAmount": "18430.50"
}
```

### Listado paginado (con `limit` numérico)

Los metadatos se aplanan **en la raíz** del sobre, **no** bajo `meta`, junto al acumulado:

```json
{
  "statusCode": 200,
  "message": "Gastos obtenidos correctamente",
  "data": [ /* VehicleExpense[] */ ],
  "total": 23,
  "currentPage": 1,
  "lastPage": 3,
  "totalAmount": "18430.50"
}
```

### Error de negocio (401, 403, 404, 400)

```json
{ "statusCode": 404, "message": "El gasto no existe", "data": null }
```

### Error de validación (422) — **formato distinto**

No lleva `statusCode` ni `data`. Es el formato estándar de Laravel:

```json
{
  "message": "Debes indicar si el gasto fue facturado (and 2 more errors)",
  "errors": {
    "is_invoiced": ["Debes indicar si el gasto fue facturado"],
    "amount": ["El monto debe ser mayor que cero"],
    "expense_date": ["La fecha del gasto no puede ser futura"]
  }
}
```

En el **listado**, la clave del error es `vehicleId` (camelCase, porque es un query param); en el **alta**, es `vehicle_id` (snake_case, porque es un campo del cuerpo). No es un descuido: son dos parámetros distintos.

---

## 6. Endpoints

### 6.1 `GET /api/vehicle-expenses` — listar los gastos de un vehículo

Roles: `carrier`, `administrator`, `manager`.

**`vehicleId` es obligatorio.** Sin él, 422.

| Query param | Tipo | Obligatorio | Comportamiento |
|---|---|:--:|---|
| `vehicleId` | entero | **Sí** | Vehículo cuyos gastos se piden. Si no existe → **404**. Si es de otra empresa y eres `carrier` → **403**. |
| `category` | string | No | Filtra por categoría exacta. **Tolerante**: un valor fuera del enum se ignora y devuelve el listado completo. |
| `nature` | string | No | `preventive` o `corrective`. **Tolerante** igual que `category`. |
| `dateFrom` | `Y-m-d` | No | Cota inferior de `expenseDate`, **inclusive**. Una fecha malformada (`2026-13-45`, `ayer`) se ignora. |
| `dateTo` | `Y-m-d` | No | Cota superior de `expenseDate`, **inclusive**. Se ignora si es malformada. |
| `isInvoiced` | booleano | No | `true` → solo los facturados; `false` → solo los no facturados; omitido → ambos. **Tolerante**: `isInvoiced=quizá`, `isInvoiced=2` o el parámetro **vacío** se ignoran y devuelven el listado completo. |
| `limit` | entero | No | Activa la paginación. Se acota a **`[10, 100]`**: `limit=5` pagina de 10 en 10 y `limit=500`, de 100 en 100. No numérico → sin paginar. |
| `page` | entero | No | Página a devolver, solo tiene efecto con `limit`. |

**Los filtros son tolerantes**: un valor inválido **se ignora en silencio** y devuelve el listado completo con 200, nunca 422 ni una lista vacía. Se pueden mandar vacíos sin romper la pantalla.

**Orden fijo**: `expenseDate` descendente, y a igualdad de fecha, `id` descendente (el gasto capturado más tarde va primero). **No es configurable**: no hay `sortBy` ni `sortDir`.

Éxito: **200** · `Gastos obtenidos correctamente`.

```
GET /api/vehicle-expenses?vehicleId=7&category=tires&isInvoiced=true&limit=10
```

### 6.2 `POST /api/vehicle-expenses` — registrar un gasto

Roles: `carrier` (solo su empresa), `administrator` (cualquiera). El `manager` recibe 403.

Cuerpo en **snake_case**, los **siete** campos obligatorios, más `invoice` condicional.

**Sin factura** (`is_invoiced: false`) sirve JSON:

```json
{
  "vehicle_id": 7,
  "category": "tires",
  "nature": "preventive",
  "amount": 1250.00,
  "expense_date": "2026-08-12",
  "description": "Cuatro llantas nuevas, taller El Rodaje, factura A-9912",
  "is_invoiced": false
}
```

**Con factura** (`is_invoiced: true`) el cuerpo **debe ir en `multipart/form-data`**, porque lleva un archivo:

```js
const body = new FormData();
body.append('vehicle_id', String(vehicleId));
body.append('category', 'tires');
body.append('nature', 'preventive');
body.append('amount', '1250.00');
body.append('expense_date', '2026-08-12');
body.append('description', 'Cuatro llantas nuevas, taller El Rodaje');
body.append('is_invoiced', '1');       // "1" / "0" es lo natural en multipart
body.append('invoice', file);          // File del <input type="file">

await fetch('/api/vehicle-expenses', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  body, // NO pongas Content-Type a mano: el navegador añade el boundary
});
```

| Campo | Reglas |
|---|---|
| `vehicle_id` | Obligatorio, entero. Inexistente → **404** (no 422). De otra empresa siendo `carrier` → **403**. Un vehículo `inactive` **sí** acepta gastos. |
| `category` | Obligatorio, uno de los 22 valores del enum. |
| `nature` | Obligatorio, `preventive` o `corrective`. Sin validación cruzada con `category`. |
| `amount` | Obligatorio, numérico, **mínimo `0.01`** (un `0` es 422) y máximo `99999999.99`. En GTQ. |
| `expense_date` | Obligatorio, fecha, **no puede ser futura**: hoy se acepta, mañana es 422. Manda `Y-m-d`. |
| `description` | Obligatoria, texto, máximo 1000 caracteres. |
| `is_invoiced` | **Obligatorio** (cambio incompatible). Acepta `true`, `false`, `1`, `0`, `"1"`, `"0"`. Cualquier otro valor → 422 `La facturación debe ser verdadero o falso`. |
| `invoice` | Archivo. **Obligatorio solo si `is_invoiced` es verdadero.** `jpg`, `jpeg`, `png` o `pdf`; máximo **3 MB (3072 KB)**, límite **inclusivo**. |

**Reglas del archivo, en detalle:**

- **Con `is_invoiced: true` y sin archivo → 422** (`La factura es obligatoria cuando el gasto fue facturado`).
- **Con `is_invoiced: false` y con archivo → 201.** El archivo **se descarta en silencio**, no se sube y `invoiceUrl` vuelve `null`. **Ni siquiera se valida**: un `.exe` de 10 MB con el interruptor apagado devuelve 201, no 422. Es la trampa número 13 de la sección 1.
- **El tipo se deduce del contenido, no del nombre.** Un `factura.exe` con contenido JPEG se acepta y se guarda como `.jpg`; un `factura.pdf` que en realidad es un GIF se rechaza con 422.
- **Se guarda tal cual**: sin recorte, sin redimensionado y sin recompresión. Un PDF de dos páginas sigue teniendo dos páginas; una imagen de 1600×900 conserva sus dimensiones.
- **Requisito de servidor:** `upload_max_filesize` y `post_max_size` ≥ **4M** en cada entorno. Si PHP corta la petición antes que Laravel, el error que ve el usuario es un `required` confuso y no uno de tamaño.

**`registered_by` no se envía**: sale siempre del usuario autenticado. Mandarlo en el cuerpo no hace nada.

Éxito: **201** · `Gasto registrado correctamente`, con el gasto creado en `data`.

### 6.3 `GET /api/vehicle-expenses/{id}` — detalle

Roles: `carrier`, `administrator`, `manager`.

Éxito: **200** · `Gasto obtenido correctamente`. Id inexistente → **404** `El gasto no existe`. Gasto de otra empresa siendo `carrier` → **403**.

### 6.4 `PATCH /api/vehicle-expenses/{id}` — editar

Roles: `carrier` (solo su empresa), `administrator`. El `manager` recibe 403.

Todos los campos son **opcionales**, pero ninguno acepta `null` una vez enviado. Las reglas de cada uno son las mismas del alta.

```json
{ "amount": 1400.00, "description": "Cuatro llantas nuevas, taller El Rodaje" }
```

- **`vehicle_id` no se acepta.** Mandarlo no es un error: se ignora y el gasto sigue en su vehículo. Lo mismo con `vehicleId`.
- **`is_invoiced` no se acepta.** Mandarlo responde **200** y el valor almacenado **no cambia**.
- **`invoice` no se acepta.** Subir aquí un archivo de 3 MB responde **200 sin guardar nada**: no se sube al almacenamiento, no reemplaza la factura anterior y no queda rastro del intento. **No hay forma de marcar, desmarcar, reemplazar ni eliminar la factura de un gasto ya creado.**
- **La única corrección posible es borrar el gasto y volverlo a crear**, asumiendo que se pierden su `id`, su `createdAt` y su `registeredBy` original.
- **`registered_by` no se reescribe.** Aunque edite un `administrator`, `registeredBy` sigue mostrando al usuario que creó el gasto.
- **Un cuerpo vacío `{}` responde 200 y no cambia nada.** No es un error.
- **`PUT` también funciona** y hace exactamente lo mismo que `PATCH`: es una actualización **parcial**, no un reemplazo. Un `PUT` con un solo campo deja los demás intactos. Usa `PATCH` por claridad.

Éxito: **200** · `Gasto actualizado correctamente`.

### 6.5 `DELETE /api/vehicle-expenses/{id}` — borrar

Roles: `carrier` (solo su empresa), `administrator`. El `manager` recibe 403.

**Borrado real.** La fila desaparece de la base de datos y del listado, y el `totalAmount` deja de incluirla. **No se puede deshacer**: recuperar el gasto es volver a capturar los siete campos y a adjuntar la factura.

**El archivo de la factura se borra con el gasto.** Es el único `DELETE` del proyecto que elimina también el objeto del almacenamiento: la URL que devolvía `invoiceUrl` deja de resolver. **Si el usuario necesita conservar la factura, hay que descargarla antes.**

Éxito: **200** · `Gasto eliminado correctamente`, con el gasto ya borrado en `data` (útil para un «Se eliminó el gasto de Q 1,250.00»). Un segundo `DELETE` del mismo id → **404**.

---

## 7. Tabla de mensajes de error (literales)

Se pueden mostrar tal cual al usuario; ya están en español.

**Validación (422, formato `{ message, errors }`)**

| Campo | Mensaje |
|---|---|
| `vehicleId` (listado) | `El vehículo es obligatorio` · `El vehículo debe ser un número entero` |
| `vehicle_id` (alta) | `El vehículo es obligatorio` · `El vehículo debe ser un número entero` |
| `category` | `La categoría del gasto es obligatoria` · `La categoría del gasto no es válida` |
| `nature` | `La naturaleza del gasto es obligatoria` · `La naturaleza del gasto no es válida` |
| `amount` | `El monto es obligatorio` · `El monto debe ser un número` · `El monto debe ser mayor que cero` · `El monto no puede superar los 99999999.99` |
| `expense_date` | `La fecha del gasto es obligatoria` · `La fecha del gasto no es válida` · `La fecha del gasto no puede ser futura` |
| `description` | `La descripción es obligatoria` · `La descripción debe ser texto` · `La descripción no puede superar los 1000 caracteres` |
| `is_invoiced` | `Debes indicar si el gasto fue facturado` · `La facturación debe ser verdadero o falso` |
| `invoice` | `La factura es obligatoria cuando el gasto fue facturado` · `La factura debe ser un archivo` · `La factura debe ser un archivo jpg, jpeg, png o pdf` · `La factura no puede pesar más de 3 MB` |

**Sobre `{ statusCode, message, data }`**

| Código | Mensaje | Cuándo |
|---|---|---|
| 400 | `No se pudo almacenar el archivo` | El almacenamiento rechazó la factura. El gasto **no** se crea. Es un fallo de infraestructura: reintentar es razonable. |
| 401 | `El token de sesión no es válido o ha expirado` | Sin token, o con uno expirado. |
| 403 | `No tienes permisos para acceder a este recurso` | Rol sin permiso para la acción: `pilot` en los cinco endpoints, `manager` en los tres de escritura. Lo emite el middleware. |
| 403 | `No puedes acceder a un vehículo que no pertenece a tu empresa transportista` | Un `carrier` lista o registra sobre un vehículo de otra empresa. **No queda ningún archivo subido**: el ámbito se comprueba antes de tocar el almacenamiento. |
| 403 | `No puedes acceder a un gasto que no pertenece a tu empresa transportista` | Un `carrier` consulta, edita o borra un gasto de otra empresa. |
| 403 | `No perteneces a ninguna empresa transportista` | Un `carrier` que todavía no ha registrado su empresa. |
| 404 | `El vehículo no existe` | `vehicleId` inexistente, en el listado y en el alta. |
| 404 | `El gasto no existe` | Id inexistente en detalle, edición o borrado — incluido el segundo `DELETE`. |

Los **cuatro 403 distintos** importan: el primero significa «tu rol no puede hacer esto» (esconde el botón), los otros tres significan «este recurso no es tuyo» o «no tienes empresa» (mensajes muy distintos de cara al usuario).

---

## 8. Checklist de implementación en el frontend

**Base del dominio**

- [ ] Cliente HTTP que adjunta `Authorization: Bearer` y `Accept: application/json` en las cinco llamadas.
- [ ] Manejo **de dos formatos de error**: sobre `{statusCode, message, data}` para 400/401/403/404 y `{message, errors}` para 422.
- [ ] **Nunca llamar al listado sin `vehicleId`**: la pantalla de gastos solo existe dentro del detalle de un vehículo.
- [ ] Distinguir `totalAmount` (dinero, string) de `total` (conteo, number) al pintar el resumen y el paginador.
- [ ] Parsear `amount` y `totalAmount` con `parseFloat` **solo para formatear**; no operar aritmética de dinero en float.
- [ ] Formatear el importe como GTQ en la UI (`Q 1,250.00`); la API no manda símbolo de moneda.
- [ ] Enviar el cuerpo en **snake_case** y leer la respuesta en **camelCase**; no reutilizar el mismo tipo para ambos.
- [ ] Mostrar `expenseDate` y `createdAt` como **texto plano**; no pasarlos por `new Date()` ni por un parser ISO.
- [ ] Selector de categoría con las 22 opciones y su etiqueta en español mantenida en el front.
- [ ] Selector de naturaleza independiente del de categoría: **no** condicionar uno al otro.
- [ ] Date picker del alta con **máximo = hoy** (el 422 del servidor es la red, no la UX).
- [ ] Validar `amount > 0` en el formulario antes de enviar.
- [ ] Formulario de edición **sin campo de vehículo**: es inmutable.
- [ ] Paginación leyendo `total`/`currentPage`/`lastPage` **de la raíz**, y modo sin `limit` para vehículos con pocos gastos.
- [ ] Mandar los filtros vacíos sin miedo: se ignoran; no hace falta limpiarlos del query string.
- [ ] Ocultar o deshabilitar las acciones de escritura para `manager` y todo `pilot`.
- [ ] Permitir registrar gastos también sobre vehículos `inactive`.

**Facturación (SPEC 19)**

- [ ] **Desplegar el front junto con esta versión de la API**: sin `is_invoiced`, todas las altas devuelven 422.
- [ ] Interruptor «¿Facturado?» en el alta, **sin valor por defecto silencioso**: el usuario decide, y el campo es obligatorio.
- [ ] Enviar el alta como **`FormData`** cuando hay archivo, **sin fijar `Content-Type` a mano** (el navegador añade el boundary).
- [ ] Campo de archivo **visible solo con el interruptor encendido**, y obligatorio en ese caso: si no, el usuario adjunta y el backend lo descarta sin avisar.
- [ ] Si el interruptor se apaga con un archivo ya elegido, **limpiar el archivo del formulario**: mandarlo no da error pero se pierde en silencio.
- [ ] Validar en cliente **`jpg` / `jpeg` / `png` / `pdf`** y **≤ 3 MB** antes de subir, para no gastar la subida.
- [ ] Confirmar con el servidor: tras el 201, comprobar `isInvoiced` e `invoiceUrl` en la respuesta y **avisar en pantalla** si el usuario creía haber adjuntado factura y no quedó.
- [ ] Formulario de edición **sin interruptor de facturación y sin campo de archivo**: son inmutables y el `PATCH` los ignora sin error.
- [ ] Si el usuario quiere corregir la facturación, guiarlo explícitamente a **borrar y volver a crear**, avisando de que se pierden `id`, `createdAt` y el registrador original.
- [ ] Pintar el adjunto según **`invoiceType`**: `<img>` para `jpg`/`png`, enlace o visor para `pdf`. No adivinar por la URL.
- [ ] Tratar `invoiceUrl` como **enlace público**: no incrustarlo en correos, exportaciones ni sitios fuera de la aplicación.
- [ ] **Confirmación reforzada en el `DELETE` de un gasto facturado**: el archivo se borra con él y no se puede recuperar. Ofrecer descargarlo antes.
- [ ] Filtro «Solo facturados / Solo sin factura / Todos» mapeado a `isInvoiced=true` / `false` / omitido.
- [ ] Si quieres mostrar «facturado Q X de Q Y», hacer **dos llamadas** (`isInvoiced=true` y sin filtro): la API no devuelve el desglose.
- [ ] Comprobar con quien despliegue que `upload_max_filesize` y `post_max_size` son ≥ 4M en todos los entornos.

---

## 9. Lo que este dominio **no** hace (para no diseñarlo en el front)

- **No hay listado global de gastos de la flota** ni comparativas entre vehículos. `vehicleId` es obligatorio, siempre.
- **No hay reportes ni agregados** por categoría, por mes, por empresa o por naturaleza. Solo existe un `totalAmount`, sin desglose.
- **No se puede cambiar la facturación después del alta**: ni marcar, ni desmarcar, ni reemplazar el archivo, ni eliminarlo. Tampoco hay bitácora de esos cambios.
- **No hay más de una factura por gasto.**
- **No es un módulo de facturación**: no hay número de factura, serie, NIT, proveedor, taller, fecha de la factura, estado de pago, monto facturado distinto del `amount`, impuestos ni retenciones. Todo eso sigue cabiendo en `description`.
- **No se lee el contenido del archivo**: ni OCR, ni extracción del total, ni comprobación de que el PDF sea realmente una factura o de que el monto coincida.
- **No hay desglose de `totalAmount`** en facturado y no facturado. Se consigue con dos llamadas filtradas.
- **No hay miniaturas, previsualización ni conversión de PDF a imagen.** El front pinta el archivo tal cual.
- **No hay URLs firmadas, endpoint de descarga ni control de acceso al archivo.** El objeto es público: la key lleva un UUID no adivinable y la URL solo sale por endpoints autenticados, pero quien la tenga ve el archivo.
- **No hay costo por kilómetro**, costo total de propiedad ni proyección de mantenimiento.
- **No hay mantenimiento programado**: ni próximo servicio, ni avisos por kilometraje o fecha, ni órdenes de trabajo. Por eso `expense_date` no admite futuro.
- **No hay kilometraje del gasto** (`mileageAtExpense`). Está previsto para otra spec y no tocará `vehicles.mileage`.
- **No hay catálogo administrable de categorías**: son un enum cerrado y añadir una es un despliegue.
- **No hay bitácora de ediciones**: el `PATCH` no deja rastro y el `DELETE` borra de verdad.
- **No hay exportación** a CSV ni a Excel.
- **No hay moneda configurable**: GTQ es convención del dominio y no viaja en la respuesta.
- **No cambia nada en `GET /api/vehicles/{vehicle}`**: el detalle del vehículo **no** trae sus gastos ni ningún campo nuevo. Los gastos se piden aparte, siempre.
