# Gastos emergentes del viaje — referencia de integración para el frontend

Referencia completa del dominio **Trip Emergency Expenses** de la API de Legumex Transportes: **cuatro endpoints**. Dos van anidados bajo `/api/trips/{trip}/emergency-expenses` (registrar y listar) y dos sueltos en `/api/trip-emergency-expenses/{tripEmergencyExpense}` (corregir y borrar). Sirven para que la empresa transportista registre los **imprevistos pagados con el viaje en ruta** —una llanta pinchada, una grúa—, con un comprobante opcional.

Es **hermano de los viáticos (Trip Expenses, SPEC 31), no su calco**:

- El viático es dinero que la empresa **entrega** y el piloto **confirma**.
- El gasto emergente es dinero que **ya se gastó**. Lo registra la empresa cuando el piloto le avisa **por fuera del sistema** y **no tiene confirmación**.

Las dos cosas van **separadas** en todas partes: listados, totales, detalle del viaje y costo.

Todo lo que hay aquí está verificado contra la implementación real de la rama `spec-39-trip-emergency-expenses` (Laravel 13) y contra su suite: 86 tests de Feature y 27 de Unit del service, más los casos nuevos en `TripTest`, `TripCostTest`/`TripCostServiceTest`, `ReportServiceTest` y los tests de tools. Los mensajes de error son literales: se pueden mostrar tal cual al usuario.

> Documentación OpenAPI viva: `/api/documentation`, tag **Trip Emergency Expenses**.

---

## 1. Lo mínimo que hay que saber antes de escribir código

1. **No es un viático.** No hay `isConfirmed`, ni `receivedAt`, ni ruta `/confirm`. Todo gasto emergente **suma desde que se registra**, en `totalAmount` y en `totalEmergencyExpensesAmount`.
2. **Solo se registra con el viaje `in_route`.** Con `pending` o `finished`, el `POST` es **400** «Solo se pueden registrar gastos emergentes en un viaje en ruta».
3. **Se corrige y se borra también con el viaje `finished`**, porque la factura suele llegar después del cierre. Solo un viaje `pending` lo impide, y a ese estado solo se llega si el administrador lo devuelve con el `PATCH` general.
4. **No es append-only.** Hay `PATCH` (monto, descripción y comprobante) y `DELETE` **físico**, que además borra el archivo del almacenamiento. No hay papelera ni bitácora.
5. **Con archivo, el cuerpo va en `multipart/form-data`.**
   - El `POST` es un `POST` normal.
   - **El `PATCH` con archivo se manda como `POST` con `_method=PATCH`**: PHP no lee archivos en un `PATCH` real.
   - Sin archivo, sirve JSON en los dos.
6. **`description` es obligatoria.** No hay categorías: es lo único que dice qué pasó.
7. **El piloto asignado SÍ lee** el listado de su viaje. `shipment` **no**, porque es dinero: recibe 403.
8. **Toda respuesta viaja en un sobre** `{ statusCode, message, data }`… **salvo el 422**, que usa `{ message, errors }`.
9. **`amount` sale como `string` de dos decimales** (`"450.00"`), no como número: hay que hacer `parseFloat` antes de sumar. Es GTQ por convención; no hay campo de moneda.
10. **Las fechas no son ISO 8601.** `createdAt` y `updatedAt` salen en `d-m-Y h:i:s A` (`05-10-2026 02:15:00 PM`). Si `updatedAt` es distinto de `createdAt`, el gasto se corrigió.
11. **Salida en camelCase.** El cuerpo del `POST`/`PATCH` también usa camelCase (`removeReceipt`).
12. **El costo de un viaje cerrado puede cambiar.** Corregir o borrar un gasto emergente después del cierre mueve `GET /api/trips/{trip}/cost`. Es intencional.

---

## 2. Autenticación y permisos

Los cuatro endpoints exigen el token JWT:

```
Authorization: Bearer {token}
Accept: application/json
```

Sin token, o con uno expirado, **401**:

```json
{ "statusCode": 401, "message": "El token de sesión no es válido o ha expirado", "data": null }
```

| Acción | `administrator` | `carrier` | `pilot` | `manager` | `export` / `user` | `shipment` |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| `POST .../emergency-expenses` registrar | ✅ cualquier viaje **asignado** | ✅ **solo si su empresa tomó el viaje** | 403 | 403 | 403 | 403 |
| `GET .../emergency-expenses` listar | ✅ todos | ✅ los de su ámbito | ✅ **sus propios viajes** | ✅ todos | ✅ todos | 403 |
| `PATCH /trip-emergency-expenses/{id}` corregir | ✅ | ✅ **solo de su empresa** | 403 | 403 | 403 | 403 |
| `DELETE /trip-emergency-expenses/{id}` borrar | ✅ | ✅ **solo de su empresa** | 403 | 403 | 403 | 403 |

**Ninguna ruta lleva `carrier.required`.** A un `carrier` sin empresa lo rechaza el service con 403 «No perteneces a ninguna empresa transportista».

Los 403 del middleware de rol llegan **antes** que cualquier validación de cuerpo:

```json
{ "statusCode": 403, "message": "No tienes permisos para acceder a este recurso", "data": null }
```

### El ámbito de lectura es el de SPEC 24

- `administrator`, `manager`, `export` y `user`: cualquier viaje.
- `carrier`: los que alcanza su empresa.
- `pilot`: **solo los viajes donde él es el piloto asignado**.
- Fuera de ámbito es **403**, no 404:

```json
{ "statusCode": 403, "message": "No puedes acceder a un viaje que no tienes asignado", "data": null }
```
```json
{ "statusCode": 403, "message": "No puedes acceder a un viaje que no pertenece a tu empresa transportista", "data": null }
```

### Escribir exige que la empresa haya tomado el viaje

El `POST`, el `PATCH` y el `DELETE` comparan la **empresa** del usuario que asignó el viaje, no la persona: cualquier usuario de esa empresa puede escribir. Un viaje **sin asignar** cuenta como ajeno y es 403. El `administrator` se salta la empresa, pero el viaje tiene que estar asignado; si no, recibe 400 «El viaje aún no fue asignado».

⚠️ El mensaje del 403 dice «registrar» **también en el `PATCH` y en el `DELETE`**: es un solo mensaje para las tres escrituras.

---

## 3. El objeto `TripEmergencyExpense`

Es `data` en el `POST`, el `PATCH` y el `DELETE`, y cada elemento de `data` en el `GET`. Tiene **nueve claves**, siempre en este orden:

```json
{
  "id": 3,
  "tripId": 16,
  "amount": "450.00",
  "description": "Reparación de llanta pinchada en el km 85",
  "receiptUrl": "https://bucket.s3.amazonaws.com/trip-emergency-expenses/9f3a1c2e-4b5d-6e7f-8a9b-0c1d2e3f4a5b.pdf",
  "receiptType": "pdf",
  "registeredByName": "Ana López",
  "createdAt": "05-10-2026 02:15:00 PM",
  "updatedAt": "06-10-2026 09:30:00 AM"
}
```

Sin comprobante:

```json
{
  "id": 4,
  "tripId": 16,
  "amount": "120.00",
  "description": "Grúa",
  "receiptUrl": null,
  "receiptType": null,
  "registeredByName": "Ana López",
  "createdAt": "05-10-2026 04:02:11 PM",
  "updatedAt": "05-10-2026 04:02:11 PM"
}
```

| Campo | Tipo | Notas para el front |
|---|---|---|
| `id` | `number` | Id **del gasto**, el parámetro de `PATCH`/`DELETE /api/trip-emergency-expenses/{id}`. **No** es el id del viaje. |
| `tripId` | `number` | Viaja porque `PATCH` y `DELETE` se piden fuera del viaje. |
| `amount` | `string` | ⚠️ **String** de dos decimales. `parseFloat` antes de sumar. GTQ. |
| `description` | `string` | Nunca `null`. Tal como se tecleó, con solo `trim`. |
| `receiptUrl` | `string \| null` | URL **pública y absoluta** del comprobante, sin token y sin caducidad. Viene del dominio del bucket, no de la API. No la guardes como identificador. |
| `receiptType` | `'jpg' \| 'png' \| 'pdf' \| null` | Extensión real del archivo: úsala para decidir si pintas una imagen o un enlace. `jpeg` siempre sale como `jpg`. |
| `registeredByName` | `string` | Quién registró el gasto. El `PATCH` no lo cambia. |
| `createdAt` | `string` | ⚠️ `d-m-Y h:i:s A`. Es la fecha del gasto a efectos de la API: no hay `occurredAt`. |
| `updatedAt` | `string` | ⚠️ `d-m-Y h:i:s A`. Distinta de `createdAt` → el gasto se corrigió. |

### Tipos TypeScript sugeridos

```ts
export interface TripEmergencyExpense {
  /** Id del GASTO: es el parámetro de /api/trip-emergency-expenses/{id}. */
  id: number;
  tripId: number;
  /** ⚠️ String de 2 decimales, no number. GTQ. */
  amount: string;
  description: string;
  receiptUrl: string | null;
  receiptType: 'jpg' | 'png' | 'pdf' | null;
  registeredByName: string;
  /** Formato 'd-m-Y h:i:s A', no ISO 8601. */
  createdAt: string;
  /** Formato 'd-m-Y h:i:s A'. Distinto de createdAt = corregido. */
  updatedAt: string;
}

/** Respuesta del listado SIN limit. */
export interface TripEmergencyExpenseListResponse {
  statusCode: number;
  message: string;
  data: TripEmergencyExpense[];
  /** Suma de TODOS los gastos del viaje. String de 2 decimales. Viaja con y sin limit. */
  totalAmount: string;
}

/** Respuesta del listado CON limit numérico: la metadata va en la raíz. */
export interface PaginatedTripEmergencyExpenseListResponse extends TripEmergencyExpenseListResponse {
  total: number;
  currentPage: number;
  lastPage: number;
}

/** Cuerpo del POST (FormData si lleva receipt). */
export interface StoreTripEmergencyExpensePayload {
  amount: number;
  description: string;
  receipt?: File;
}

/** Cuerpo del PATCH (POST + _method=PATCH en FormData si lleva receipt). Todo opcional. */
export interface UpdateTripEmergencyExpensePayload {
  amount?: number;
  description?: string;
  /** Reemplaza el comprobante. Incompatible con removeReceipt: true. */
  receipt?: File;
  /** true quita el comprobante. En FormData, 'true' o '1'. */
  removeReceipt?: boolean;
}
```

---

## 4. Formato de las respuestas

### Éxito

```json
{ "statusCode": 201, "message": "Gasto emergente registrado correctamente", "data": { /* TripEmergencyExpense */ } }
```

### Listado sin paginar

```json
{ "statusCode": 200, "message": "Gastos emergentes obtenidos correctamente", "data": [ /* TripEmergencyExpense[] */ ], "totalAmount": "350.00" }
```

### Listado paginado (con `limit` numérico)

La metadata va **aplanada en la raíz**, no bajo `meta`:

```json
{ "statusCode": 200, "message": "Gastos emergentes obtenidos correctamente", "data": [], "total": 25, "currentPage": 1, "lastPage": 3, "totalAmount": "250.00" }
```

⚠️ **`totalAmount` NO es `total`.** `total` es el **conteo** que da el paginador y solo aparece con `limit`. `totalAmount` es la **suma en GTQ de todos** los gastos del viaje: se calcula **antes** de paginar y viaja siempre.

### 422 — formato distinto

```json
{ "message": "La descripción es obligatoria", "errors": { "description": ["La descripción es obligatoria"] } }
```

### Errores de negocio (400, 401, 403, 404) — sobre

```json
{ "statusCode": 400, "message": "Solo se pueden registrar gastos emergentes en un viaje en ruta", "data": null }
```

---

## 5. Endpoints

### 5.1 `POST /api/trips/{trip}/emergency-expenses` — registrar un gasto emergente

Lo pueden usar `carrier` (si **su empresa tomó el viaje**) y `administrator` (en cualquier viaje asignado).

**Cuerpo (JSON sin archivo):**

```json
{ "amount": 450, "description": "Reparación de llanta pinchada en el km 85" }
```

**Con comprobante (`multipart/form-data`):**

```ts
const form = new FormData();
form.append('amount', '450');
form.append('description', 'Reparación de llanta pinchada en el km 85');
form.append('receipt', file); // jpg, jpeg, png o pdf, ≤ 3 MB
await api.post(`/api/trips/${tripId}/emergency-expenses`, form);
```

| Campo | Reglas | Notas |
|---|---|---|
| `amount` | `required`, `numeric`, `min:0.01`, `max:99999999.99` | Número o cadena numérica. Cero y negativos son 422. |
| `description` | `required`, `string`, `max:255` | Solo `trim`. Si son solo espacios, es 422 «La descripción es obligatoria». |
| `receipt` | opcional, `file`, `mimes:jpg,jpeg,png,pdf`, `max:3072` (KB) | Se guarda **tal cual**, sin recorte ni recompresión. |

`tripId` y `registeredBy` **no se aceptan**: se ignoran en silencio y la respuesta sigue siendo 201.

**Cuatro guardas del service, en orden fijo.** Solo se evalúan si el cuerpo es válido:

| Orden | Situación | Código | Mensaje |
|:--:|---|:--:|---|
| 1 | El viaje no existe | 404 | `El viaje no existe` |
| 2 | El viaje fue eliminado | 400 | `El viaje ya fue eliminado` |
| 3 | El viaje está **sin asignar** o lo tomó otra empresa (`carrier`) | 403 | `No puedes registrar gastos emergentes en un viaje que no tomó tu empresa transportista` |
| 3 | El viaje está sin asignar (`administrator`) | 400 | `El viaje aún no fue asignado` |
| 4 | El viaje no está `in_route` (`pending` o `finished`) | 400 | `Solo se pueden registrar gastos emergentes en un viaje en ruta` |

- Un viaje **borrado y ajeno** devuelve el 400 del borrado, no el 403.
- Un `carrier` sin empresa recibe **403** «No perteneces a ninguna empresa transportista».
- **Si una guarda rechaza, el archivo no llega a subirse.**

| Código | Situación | `message` |
|:--:|---|---|
| **201** | Registrado | `Gasto emergente registrado correctamente` |
| 400 | Viaje borrado, sin asignar (`administrator`) o fuera de ruta | ver guardas |
| 401 | Sin token | `El token de sesión no es válido o ha expirado` |
| 403 | Rol, empresa ajena, sin asignar o `carrier` sin empresa | ver §2 y guardas |
| 404 | El viaje no existe | `El viaje no existe` |
| 422 | Cuerpo inválido | `{ message, errors }` |

⚠️ **El 422 se adelanta a las cuatro guardas**: un cuerpo vacío sobre un viaje inexistente es 422, no 404.

---

### 5.2 `GET /api/trips/{trip}/emergency-expenses` — listar los gastos emergentes del viaje

Cualquier rol autenticado **salvo `shipment`**, dentro del ámbito de SPEC 24 e **incluido el `pilot` asignado**.

| Param | Efecto |
|---|---|
| `limit` | Activa la paginación. Numérico y **acotado a `[10, 100]`**: `limit=5` da páginas de 10 y `limit=500`, de 100. Si se omite o no es numérico, se devuelve todo sin metadatos. |
| `page` | Página; solo funciona con `limit`. |

**Sin filtros.** Orden fijo por `id` **ascendente**. Un viaje sin gastos → **200, `data: []`, `totalAmount: "0.00"`**.

| Código | Situación | `message` |
|:--:|---|---|
| 200 | Devueltos (posiblemente vacío) | `Gastos emergentes obtenidos correctamente` |
| 401 | Sin token | `El token de sesión no es válido o ha expirado` |
| 403 | `shipment` | `No tienes permisos para acceder a este recurso` |
| 403 | `pilot` sobre viaje ajeno | `No puedes acceder a un viaje que no tienes asignado` |
| 403 | `carrier` fuera de ámbito | `No puedes acceder a un viaje que no pertenece a tu empresa transportista` |
| 404 | Viaje inexistente **o borrado** | `El viaje no existe` |

---

### 5.3 `PATCH /api/trip-emergency-expenses/{tripEmergencyExpense}` — corregir

Lo pueden usar `carrier` (de la empresa que tomó el viaje) y `administrator`. `{tripEmergencyExpense}` es el **id del gasto**.

**Cuatro campos, todos opcionales.** Un cuerpo vacío responde **200 sin escribir nada** (`updatedAt` no cambia).

| Campo | Reglas | Efecto |
|---|---|---|
| `amount` | `sometimes`, `required`, `numeric`, `min:0.01`, `max:99999999.99` | Nuevo monto. `null` o vacío es 422. |
| `description` | `sometimes`, `required`, `string`, `max:255` | Nueva descripción, solo `trim`. En blanco es 422. |
| `receipt` | `file`, `mimes:jpg,jpeg,png,pdf`, `max:3072` | **Reemplaza** el comprobante. El anterior se borra del almacenamiento **después** de guardar. |
| `removeReceipt` | `boolean` (acepta `true`/`false`, `1`/`0`, `"true"`/`"false"`) | `true` **quita** el comprobante y lo borra del almacenamiento. `false` o ausente no hace nada. |

- `receipt` junto con `removeReceipt: true` → **422** «No puedes enviar un comprobante y pedir que se quite al mismo tiempo», y no se toca nada.
- `tripId`, `trip_id` y `registeredBy` se **ignoran en silencio**, con 200: el gasto no cambia de viaje ni de autor.

**JSON (sin archivo):**

```json
{ "amount": 475.5, "description": "Reparación de llanta y cambio de válvula" }
```

```json
{ "removeReceipt": true }
```

**Con archivo nuevo: `POST` + `_method=PATCH` en `multipart/form-data`:**

```ts
const form = new FormData();
form.append('_method', 'PATCH');
form.append('receipt', file);
await api.post(`/api/trip-emergency-expenses/${id}`, form);
```

**Cuatro guardas, en orden fijo:**

| Orden | Situación | Código | Mensaje |
|:--:|---|:--:|---|
| 1 | El gasto no existe | 404 | `El gasto emergente no existe` |
| 2 | Su viaje fue eliminado | 400 | `El viaje ya fue eliminado` |
| 3 | Su viaje lo tomó otra empresa | 403 | `No puedes registrar gastos emergentes en un viaje que no tomó tu empresa transportista` |
| 4 | Su viaje está `pending` | 400 | `No se pueden modificar los gastos emergentes de un viaje pendiente` |

Con el viaje `in_route` **o `finished`** se permite.

| Código | Situación | `message` |
|:--:|---|---|
| **200** | Corregido (o cuerpo vacío) | `Gasto emergente actualizado correctamente` |
| 400 | Viaje borrado o `pending` | ver guardas |
| 401 | Sin token | `El token de sesión no es válido o ha expirado` |
| 403 | Rol, empresa ajena o `carrier` sin empresa | ver §2 y guardas |
| 404 | El gasto no existe | `El gasto emergente no existe` |
| 422 | Campo inválido o `receipt` + `removeReceipt` | `{ message, errors }` |

---

### 5.4 `DELETE /api/trip-emergency-expenses/{tripEmergencyExpense}` — borrar

Lo pueden usar `carrier` (de la empresa que tomó el viaje) y `administrator`. No lleva cuerpo.

**Borrado físico**: la fila desaparece y **su comprobante se borra del almacenamiento**, de forma irreversible. Responde **200 con las nueve claves del gasto borrado**. Un segundo `DELETE` del mismo id es **404**.

Tiene las **mismas cuatro guardas, en el mismo orden**, que el `PATCH` (§5.3). Con el viaje `in_route` o `finished` se permite.

| Código | Situación | `message` |
|:--:|---|---|
| **200** | Borrado | `Gasto emergente eliminado correctamente` |
| 400 | Viaje borrado o `pending` | ver §5.3 |
| 401 | Sin token | `El token de sesión no es válido o ha expirado` |
| 403 | Rol, empresa ajena o `carrier` sin empresa | ver §2 |
| 404 | El gasto no existe (o ya se borró) | `El gasto emergente no existe` |

---

## 6. Tabla de mensajes de error (literales)

### 422

#### `POST /api/trips/{trip}/emergency-expenses`

| Campo | Mensaje |
|---|---|
| `amount` | `El monto es obligatorio` · `El monto debe ser un número` · `El monto debe ser mayor a 0` · `El monto no puede superar 99999999.99` |
| `description` | `La descripción es obligatoria` · `La descripción debe ser texto` · `La descripción no puede superar los 255 caracteres` |
| `receipt` | `El comprobante debe ser un archivo` · `El comprobante debe ser un archivo jpg, jpeg, png o pdf` · `El comprobante no puede pesar más de 3 MB` |

#### `PATCH /api/trip-emergency-expenses/{tripEmergencyExpense}`

| Campo | Mensaje |
|---|---|
| `amount` | `El monto no puede estar vacío` · `El monto debe ser un número` · `El monto debe ser mayor a 0` · `El monto no puede superar 99999999.99` |
| `description` | `La descripción no puede estar vacía` · `La descripción debe ser texto` · `La descripción no puede superar los 255 caracteres` |
| `receipt` | `No puedes enviar un comprobante y pedir que se quite al mismo tiempo` · `El comprobante debe ser un archivo` · `El comprobante debe ser un archivo jpg, jpeg, png o pdf` · `El comprobante no puede pesar más de 3 MB` |
| `removeReceipt` | `removeReceipt debe ser verdadero o falso` |

### Errores de sobre

| Código | Mensaje | Cuándo |
|:--:|---|---|
| 400 | `El viaje ya fue eliminado` | Escritura sobre un viaje borrado |
| 400 | `El viaje aún no fue asignado` | `POST` del `administrator` sobre un viaje sin asignar |
| 400 | `Solo se pueden registrar gastos emergentes en un viaje en ruta` | `POST` con el viaje `pending` o `finished` |
| 400 | `No se pueden modificar los gastos emergentes de un viaje pendiente` | `PATCH`/`DELETE` con el viaje `pending` |
| 401 | `El token de sesión no es válido o ha expirado` | Sin token |
| 403 | `No tienes permisos para acceder a este recurso` | Middleware de rol (incluido `shipment` en el `GET`) |
| 403 | `No perteneces a ninguna empresa transportista` | Escritura de un `carrier` sin empresa |
| 403 | `No puedes registrar gastos emergentes en un viaje que no tomó tu empresa transportista` | `POST`/`PATCH`/`DELETE` sobre un viaje ajeno, o `POST` sobre uno sin asignar |
| 403 | `No puedes acceder a un viaje que no tienes asignado` | `GET` de un `pilot` sobre un viaje ajeno |
| 403 | `No puedes acceder a un viaje que no pertenece a tu empresa transportista` | `GET` de un `carrier` fuera de ámbito |
| 404 | `El viaje no existe` | `POST` sobre un viaje inexistente; `GET` sobre uno inexistente o borrado |
| 404 | `El gasto emergente no existe` | `PATCH`/`DELETE` con un id inexistente |

### Éxito

| Código | Mensaje |
|:--:|---|
| 201 | `Gasto emergente registrado correctamente` |
| 200 | `Gastos emergentes obtenidos correctamente` |
| 200 | `Gasto emergente actualizado correctamente` |
| 200 | `Gasto emergente eliminado correctamente` |

---

## 7. Lo que SPEC 39 cambia en otros dominios

### 7.1 `TripResource`: de 42 a 43 claves (44 en el detalle)

Nueva clave **`totalEmergencyExpensesAmount`** en la posición 40, entre `totalExpensesAmount` y `createdAt`:

- Es la suma de **todos** los gastos emergentes del viaje, como string de dos decimales, y vale `"0.00"` sin gastos.
- Es el **mismo número** que el `totalAmount` del listado.
- Para `shipment` sale **siempre `"0.00"`**; la clave no desaparece.
- `GET /api/trips/{trip}` devuelve **44** claves (las 43 más `positions`); el `pilot` ve 43.
- ⚠️ En la respuesta de `PATCH /api/trips/{trip}/finish` sale `"0.00"` aunque haya gastos, igual que `totalFuelGallons` y `totalExpensesAmount`, porque `/finish` no recarga las sumas. El detalle sí trae el valor bueno.
- **`TripListResource` no cambia**: sigue en 20 claves, sin esta suma.
- **`totalExpensesAmount` no cambia**: siguen siendo solo los viáticos confirmados.

### 7.2 `GET /api/trips/{trip}/cost`: de 8 a 9 claves

Nuevo bloque **`emergencyExpenses`**, entre `expenses` y `pilot`:

```json
"emergencyExpenses": { "count": 2, "subtotal": "850.00" }
```

- `count` es un **entero**; `subtotal` es un string de dos decimales.
- Sin gastos vale `{ "count": 0, "subtotal": "0.00" }`, **nunca `null`**.
- `totalCost` = `fuel` + `expenses` + `emergencyExpenses` + `pilot` + `vehicle`, sumando los subtotales ya redondeados.
- Los viáticos siguen en `expenses`, sin mezclarse.

### 7.3 Asistente (`POST /api/assistant/chat`)

Dos tools nuevas, con lo que el asistente pasa a **dieciséis**:

- `trip_emergency_expenses`: el listado de gastos emergentes de un viaje.
- `export_trip_emergency_expenses`: un `.xlsx` con siete columnas (`Id`, `Monto (Q)`, `Descripción`, `Comprobante`, `Registrado por`, `Creado`, `Actualizado`) que devuelve `{ fileName, url, rows, total, truncated, totalAmount }`. El `fileName` es `gastos-emergentes-viaje-{tripId}-{Y-m-d-His}.xlsx`.

El front no cambia nada: el enlace llega en el texto del modelo y en el `tool-output-available`, igual que con las otras exportaciones.

---

## 8. Checklist de implementación en el frontend

### Pantalla de gastos emergentes del viaje (`carrier` / `administrator`)

- [ ] Botón «Registrar gasto emergente» **solo con el viaje `in_route`**. En `pending` o `finished` el `POST` es 400.
- [ ] Formulario con `amount` (> 0), `description` (obligatoria, ≤ 255) y `receipt` opcional (jpg/png/pdf, ≤ 3 MB). Valida en el cliente para ahorrarte el 422.
- [ ] Con archivo usa `FormData`; sin archivo, JSON.
- [ ] Editar: `PATCH` con JSON, o `POST` + `_method=PATCH` en `FormData` si cambia el archivo.
- [ ] Opción «Quitar comprobante» → `removeReceipt: true`. No la combines con un archivo nuevo en la misma petición.
- [ ] Mostrar editar y borrar también con el viaje `finished`; ocultarlos si el viaje está `pending`.
- [ ] Confirmar antes del `DELETE`: es físico y se lleva el archivo.
- [ ] Marcar como «corregido» un gasto con `updatedAt !== createdAt`.

### Listado (todos los roles que leen)

- [ ] `GET /api/trips/{trip}/emergency-expenses`; `data: []` es «sin gastos emergentes».
- [ ] Leer `totalAmount` de la raíz, sin confundirlo con `total`.
- [ ] Hacer `parseFloat` sobre `amount` y `totalAmount`.
- [ ] Decidir con `receiptType` si se pinta una miniatura (`jpg`/`png`) o un enlace (`pdf`).
- [ ] Mostrar `createdAt`/`updatedAt` como texto plano (`d-m-Y h:i:s A`), sin parsearlas como ISO.
- [ ] No mostrar la sección a `shipment`: el `GET` le da 403.

### Detalle y costo del viaje

- [ ] Pintar `totalEmergencyExpensesAmount` **separado** de `totalExpensesAmount` (viáticos), con etiquetas distintas: «Gastos emergentes» y «Viáticos confirmados».
- [ ] En el costo, pintar el bloque `emergencyExpenses` aparte y ajustar el desglose a cinco componentes.
- [ ] Tras `/finish`, recargar el detalle si hace falta el total real (la respuesta de `/finish` trae `"0.00"`).

### App del piloto

- [ ] Sin cambios obligatorios. Si se muestra el listado, el piloto asignado puede leerlo; no puede registrar, corregir ni borrar.

---

## 9. Lo que este dominio **no** hace

- **No hay aviso del piloto dentro del sistema**: ni ruta del piloto, ni estado «reportado», ni push al transportista.
- **No hay categorías**: `description` es el único texto.
- **No se registra en `pending` ni en `finished`**; solo se corrige o se borra.
- **No hay aprobación, reembolso ni liquidación** al piloto.
- **No se vincula con `vehicle_expenses`**: una llanta pinchada en ruta es costo del viaje, no mantenimiento del vehículo.
- **No hay listado global** `GET /api/trip-emergency-expenses` ni endpoint de detalle por id: el índice va siempre viaje → gastos.
- **No hay reportes fuera del asistente**: ni endpoint descargable ni columnas en `GET /api/reports/trips`.
- **No hay filtros**, ni en el listado ni en `GET /api/trips`.
- **No hay websocket, correo, bitácora de ediciones ni papelera.**
- **El Dashboard (SPEC 29) no agrega gastos emergentes**, y `TripListResource` no cambia.
