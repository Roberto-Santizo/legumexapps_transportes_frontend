# Gastos de mantenimiento de vehículos — referencia de integración para el frontend

Referencia completa del dominio **VehicleExpenses** de la API de Legumex Transportes: cinco endpoints REST bajo `/api/vehicle-expenses` para registrar los gastos de mantenimiento de un vehículo —categoría, naturaleza preventiva o correctiva, monto, fecha y descripción—.

Todo lo que hay aquí está verificado contra la implementación real (Laravel 13) y contra su suite de tests (153 pruebas). Los mensajes de error son literales: se pueden mostrar tal cual al usuario.

> Documentación OpenAPI viva: `/api/documentation`.

---

## 1. Lo mínimo que hay que saber antes de escribir código

1. **`vehicleId` es obligatorio en el listado.** `GET /api/vehicle-expenses` sin `vehicleId` responde **422**, no un listado vacío ni los gastos de toda la flota. Es el único filtro obligatorio de toda la API: este dominio existe para una sola pantalla, el detalle de un vehículo. **No hay listado global de la flota** y no lo habrá.
2. **`totalAmount` no es `total`.** Los dos viajan en la raíz del mismo sobre y significan cosas distintas: `total` es el **conteo de registros** que aporta el paginador, `totalAmount` es la **suma en GTQ** de los montos. Confundirlos es el error más caro de este dominio.
3. **`totalAmount` suma todos los gastos filtrados, no los de la página.** Con `limit=10` sobre 12 gastos, `data` trae 10 elementos pero `totalAmount` suma los 12. Y aparece **siempre**, con y sin paginación, porque es dato de negocio y no metadata del paginador.
4. **El cuerpo va en `snake_case`, la respuesta sale en `camelCase`.** Se envía `vehicle_id` y `expense_date`; se recibe `vehicleId` y `expenseDate`. No es simétrico y no hay conversión automática.
5. **Las fechas salen formateadas, no en ISO 8601.** `expenseDate` es `12-08-2026` (`d-m-Y`) y `createdAt` es `12-08-2026 04:31:07 PM` (`d-m-Y h:i:s A`). `new Date(...)` sobre esas cadenas devuelve `Invalid Date`: trátalas como texto ya listo para pintar.
6. **Toda respuesta viaja en un sobre** `{ statusCode, message, data }`… **salvo el 422 de validación**, que usa el formato estándar de Laravel `{ message, errors }`. Son dos formas distintas y el cliente debe distinguirlas.
7. **`categoría` y `naturaleza` son ejes independientes.** No hay validación cruzada: cualquiera de las 22 categorías admite `preventive` y `corrective`. Cambiar llantas por desgaste programado es `tires` + `preventive`; por un reventón, `tires` + `corrective`.
8. **`DELETE` borra de verdad.** No es baja lógica: la fila desaparece y un segundo `DELETE` del mismo id responde 404. No hay papelera, no hay `SoftDeletes` y no hay historial de ediciones.
9. **El vehículo del gasto es inmutable.** El `PATCH` no acepta `vehicle_id`; mandarlo no es un error, simplemente se ignora. Mover un gasto de vehículo es borrarlo y volverlo a crear.
10. **Un vehículo `inactive` acepta gastos igual que uno `active`.** El mantenimiento pudo ocurrir antes de la baja, así que el estado del vehículo nunca bloquea nada aquí.

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
| Ver detalle (`GET /{id}`) | ✅ todas las empresas | ✅ solo la suya | 403 | ✅ todas las empresas |
| Registrar (`POST /`) | ✅ todas las empresas | ✅ solo la suya | 403 | **403** |
| Editar (`PATCH /{id}`) | ✅ todas las empresas | ✅ solo la suya | 403 | **403** |
| Borrar (`DELETE /{id}`) | ✅ todas las empresas | ✅ solo la suya | 403 | **403** |

El `manager` **lee cualquier empresa pero no escribe nada**. El `pilot` recibe 403 en los cinco endpoints.

**Este dominio no lleva el middleware `carrier.required`**, a diferencia de `/api/vehicles`. La consecuencia práctica es que un `carrier` que todavía no ha registrado su empresa no es cortado por el middleware: llega al servicio y recibe un 403 con **otro mensaje** (ver la tabla de la sección 7).

El **ámbito lo decide el vehículo**, no un parámetro: como `vehicleId` es obligatorio, el vehículo ya determina a qué empresa pertenece el gasto. **No existe filtro `carrierId` en este dominio.**

Un `carrier` que toca un vehículo o un gasto de otra empresa recibe **403, nunca 404** — la API no le oculta que el recurso existe, le niega el acceso:

```json
{ "statusCode": 403, "message": "No puedes acceder a un gasto que no pertenece a tu empresa transportista", "data": null }
```

> **Ojo con el orden de las guardas:** el 404 gana al 403. Si el `vehicleId` no existe, la respuesta es `404 El vehículo no existe` aunque quien pregunte no tuviera ámbito para verlo.

---

## 3. El objeto `VehicleExpense`

Es lo que devuelve `data` en los cinco endpoints (o cada elemento de `data` en el listado). Nueve claves, siempre en camelCase:

```json
{
  "id": 41,
  "vehicleId": 7,
  "category": "tires",
  "nature": "preventive",
  "amount": "1250.00",
  "expenseDate": "12-08-2026",
  "description": "Cuatro llantas nuevas, taller El Rodaje, factura A-9912",
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
| `description` | `string` | Texto libre obligatorio. Es donde hoy caben el taller, el número de factura y el detalle de la pieza. |
| `registeredBy` | `string` | **Nombre** del usuario que lo registró, no su id. El id no sale nunca por la API. |
| `createdAt` | `string` | Cuándo se **capturó** el gasto, en `d-m-Y h:i:s A`. No es lo mismo que `expenseDate`. |

No hay `updatedAt`, ni `mileage`, ni `supplier`, ni `invoiceNumber`, ni adjuntos.

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
}

/** Cuerpo de la edición: todo opcional y SIN vehicle_id. */
export type UpdateVehicleExpensePayload = Partial<
  Omit<StoreVehicleExpensePayload, 'vehicle_id'>
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

### Error de negocio (401, 403, 404)

```json
{ "statusCode": 404, "message": "El gasto no existe", "data": null }
```

### Error de validación (422) — **formato distinto**

No lleva `statusCode` ni `data`. Es el formato estándar de Laravel:

```json
{
  "message": "El vehículo es obligatorio (and 2 more errors)",
  "errors": {
    "vehicle_id": ["El vehículo es obligatorio"],
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
| `limit` | entero | No | Activa la paginación. Se acota a **`[10, 100]`**: `limit=5` pagina de 10 en 10 y `limit=500`, de 100 en 100. No numérico → sin paginar. |
| `page` | entero | No | Página a devolver, solo tiene efecto con `limit`. |

**Los filtros son tolerantes**: un valor inválido **se ignora en silencio** y devuelve el listado completo con 200, nunca 422 ni una lista vacía. Se pueden mandar vacíos sin romper la pantalla.

**Orden fijo**: `expenseDate` descendente, y a igualdad de fecha, `id` descendente (el gasto capturado más tarde va primero). **No es configurable**: no hay `sortBy` ni `sortDir`.

Éxito: **200** · `Gastos obtenidos correctamente`.

```
GET /api/vehicle-expenses?vehicleId=7&category=tires&dateFrom=2026-01-01&limit=10
```

### 6.2 `POST /api/vehicle-expenses` — registrar un gasto

Roles: `carrier` (solo su empresa), `administrator` (cualquiera). El `manager` recibe 403.

Cuerpo en **snake_case**, los seis campos **obligatorios**:

```json
{
  "vehicle_id": 7,
  "category": "tires",
  "nature": "preventive",
  "amount": 1250.00,
  "expense_date": "2026-08-12",
  "description": "Cuatro llantas nuevas, taller El Rodaje, factura A-9912"
}
```

| Campo | Reglas |
|---|---|
| `vehicle_id` | Obligatorio, entero. Inexistente → **404** (no 422). De otra empresa siendo `carrier` → **403**. Un vehículo `inactive` **sí** acepta gastos. |
| `category` | Obligatorio, uno de los 22 valores del enum. |
| `nature` | Obligatorio, `preventive` o `corrective`. Sin validación cruzada con `category`. |
| `amount` | Obligatorio, numérico, **mínimo `0.01`** (un `0` es 422) y máximo `99999999.99`. En GTQ. |
| `expense_date` | Obligatorio, fecha, **no puede ser futura**: hoy se acepta, mañana es 422. Manda `Y-m-d`. |
| `description` | Obligatoria, texto, máximo 1000 caracteres. |

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
- **`registered_by` no se reescribe.** Aunque edite un `administrator`, `registeredBy` sigue mostrando al usuario que creó el gasto.
- **Un cuerpo vacío `{}` responde 200 y no cambia nada.** No es un error.
- **`PUT` también funciona** y hace exactamente lo mismo que `PATCH`: es una actualización **parcial**, no un reemplazo. Un `PUT` con un solo campo deja los demás intactos. Usa `PATCH` por claridad.

Éxito: **200** · `Gasto actualizado correctamente`.

### 6.5 `DELETE /api/vehicle-expenses/{id}` — borrar

Roles: `carrier` (solo su empresa), `administrator`. El `manager` recibe 403.

**Borrado real.** La fila desaparece de la base de datos y del listado, y el `totalAmount` deja de incluirla. **No se puede deshacer**: recuperar el gasto es volver a capturar los seis campos.

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

**Sobre `{ statusCode, message, data }`**

| Código | Mensaje | Cuándo |
|---|---|---|
| 401 | `El token de sesión no es válido o ha expirado` | Sin token, o con uno expirado. |
| 403 | `No tienes permisos para acceder a este recurso` | Rol sin permiso para la acción: `pilot` en los cinco endpoints, `manager` en los tres de escritura. Lo emite el middleware. |
| 403 | `No puedes acceder a un vehículo que no pertenece a tu empresa transportista` | Un `carrier` lista o registra sobre un vehículo de otra empresa. |
| 403 | `No puedes acceder a un gasto que no pertenece a tu empresa transportista` | Un `carrier` consulta, edita o borra un gasto de otra empresa. |
| 403 | `No perteneces a ninguna empresa transportista` | Un `carrier` que todavía no ha registrado su empresa. |
| 404 | `El vehículo no existe` | `vehicleId` inexistente, en el listado y en el alta. |
| 404 | `El gasto no existe` | Id inexistente en detalle, edición o borrado — incluido el segundo `DELETE`. |

Los **cuatro 403 distintos** importan: el primero significa «tu rol no puede hacer esto» (esconde el botón), los otros tres significan «este recurso no es tuyo» o «no tienes empresa» (mensajes muy distintos de cara al usuario).

---

## 8. Checklist de implementación en el frontend

- [ ] Cliente HTTP que adjunta `Authorization: Bearer` y `Accept: application/json` en las cinco llamadas.
- [ ] Manejo **de dos formatos de error**: sobre `{statusCode, message, data}` para 401/403/404 y `{message, errors}` para 422.
- [ ] **Nunca llamar al listado sin `vehicleId`**: la pantalla de gastos solo existe dentro del detalle de un vehículo.
- [ ] Distinguir `totalAmount` (dinero, string) de `total` (conteo, number) al pintar el resumen y el paginador.
- [ ] Parsear `amount` y `totalAmount` con `parseFloat` **solo para formatear**; no operar aritmética de dinero en float.
- [ ] Formatear el importe como GTQ en la UI (`Q 1,250.00`); la API no manda símbolo de moneda.
- [ ] Enviar el cuerpo en **snake_case** y leer la respuesta en **camelCase**; no reutilizar el mismo tipo para ambos.
- [ ] Mostrar `expenseDate` y `createdAt` como **texto plano**; no pasarlos por `new Date()` ni por un parser ISO.
- [ ] Selector de categoría con las 22 opciones y su etiqueta en español mantenida en el front (la API solo habla `snake_case`).
- [ ] Selector de naturaleza independiente del de categoría: **no** condicionar uno al otro.
- [ ] Date picker del alta con **máximo = hoy** (el 422 del servidor es la red, no la UX).
- [ ] Validar `amount > 0` en el formulario antes de enviar.
- [ ] Formulario de edición **sin campo de vehículo**: es inmutable; si el usuario se equivocó de vehículo, guiarlo a borrar y volver a crear.
- [ ] Confirmación explícita en el `DELETE`: **es irreversible**, no hay papelera.
- [ ] Paginación leyendo `total`/`currentPage`/`lastPage` **de la raíz**, y modo sin `limit` para vehículos con pocos gastos.
- [ ] Mandar los filtros vacíos sin miedo: se ignoran; no hace falta limpiarlos del query string.
- [ ] Ocultar o deshabilitar las acciones de escritura para `manager` y todo `pilot`.
- [ ] Permitir registrar gastos también sobre vehículos `inactive`: el mantenimiento pudo ser anterior a la baja.

---

## 9. Lo que este dominio **no** hace (para no diseñarlo en el front)

- **No hay listado global de gastos de la flota** ni comparativas entre vehículos. `vehicleId` es obligatorio, siempre.
- **No hay reportes ni agregados** por categoría, por mes, por empresa o por naturaleza. Solo existe un `totalAmount`, sin desglose.
- **No hay costo por kilómetro**, costo total de propiedad ni proyección de mantenimiento.
- **No hay mantenimiento programado**: ni próximo servicio, ni avisos por kilometraje o fecha, ni órdenes de trabajo. Por eso `expense_date` no admite futuro.
- **No se adjunta la factura** (ni imagen ni PDF). El número de factura va hoy dentro de `description`.
- **No hay `supplier`, taller ni `invoiceNumber`** como campos propios; hoy caben en `description`.
- **No hay kilometraje del gasto** (`mileageAtExpense`). Está previsto para otra spec y no tocará `vehicles.mileage`.
- **No hay catálogo administrable de categorías**: son un enum cerrado y añadir una es un despliegue.
- **No hay bitácora de ediciones**: el `PATCH` no deja rastro y el `DELETE` borra de verdad.
- **No hay exportación** a CSV ni a Excel.
- **No hay moneda configurable**: GTQ es convención del dominio y no viaja en la respuesta.
- **No cambia nada en `GET /api/vehicles/{vehicle}`**: el detalle del vehículo **no** trae sus gastos ni ningún campo nuevo. Los gastos se piden aparte, siempre.
