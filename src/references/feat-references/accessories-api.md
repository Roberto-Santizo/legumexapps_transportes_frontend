# Inventario de accesorios — referencia de integración para el frontend

Referencia completa del dominio **Accessories** de la API de Legumex Transportes: cinco endpoints REST bajo `/api/accessories` para llevar el inventario nacional de accesorios —llantas, gatos hidráulicos, cadenas, extintores— con su precio, su fecha de compra y su depreciación anual.

Todo lo que hay aquí está verificado contra la implementación real (Laravel 13) y contra su suite de tests. Los mensajes de error son literales: se pueden mostrar tal cual al usuario.

> Documentación OpenAPI viva: `/api/documentation`.

---

## 1. Lo mínimo que hay que saber antes de escribir código

1. **`currentValue` es un campo derivado y de solo salida.** No existe como columna: la API lo recalcula en **cada lectura** a partir de `price`, `annualDepreciation` y `purchaseDate`. Consecuencias directas: el mismo accesorio devuelve un número **distinto cada día** sin que nadie escriba en la base (no es un bug), **no se puede filtrar ni ordenar por él**, y mandarlo en un `POST`/`PATCH` **se ignora en silencio**. La fórmula exacta está en §4.
2. **Una fila es una unidad física. No hay `quantity`.** Cuatro llantas iguales son cuatro registros con cuatro `code` distintos —y cuatro `name` distintos, porque el nombre también es único—. Contar existencias es contar filas.
3. **`status` es un enum de tres valores** (`"active"`, `"inactive"`, `"under_repair"`), **no un booleano**. No se acepta en el alta (el accesorio nace `"active"`) y solo se cambia por `PATCH`: **no existe `/toggle-status`** en este dominio, a diferencia de Products, Zones y Locations.
4. **`DELETE` no borra.** Es una baja lógica: pone `status: "inactive"` y la fila **sigue apareciendo** en el listado sin filtro.
5. **Un accesorio dado de baja NO libera su `code`.** La unicidad del código es global y ciega al estado. Es la diferencia deliberada con la placa de un vehículo, que un `inactive` sí libera.
6. **`name` y `code` se normalizan con reglas distintas.** Los dos se recortan y pasan a mayúsculas, pero el `name` además **colapsa los espacios internos** y el `code` **no**: `"A 100"` y `"A100"` son dos códigos diferentes y los dos se pueden dar de alta.
7. **Toda respuesta viaja en un sobre** `{ statusCode, message, data }`… **salvo el 422 de validación**, que usa el formato estándar de Laravel `{ message, errors }`. Son dos formas distintas y el cliente debe distinguirlas.
8. **Escribir es solo de `administrator`.** Leer lo puede hacer cualquier usuario autenticado, incluso uno sin empresa.

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
| Crear, editar, dar de baja | ✅ | 403 | 403 | 403 |

Los accesorios son un dato **nacional de Legumex**: no pertenecen a ninguna empresa transportista **ni están asignados a ningún vehículo**. No hay `carrierId` ni `vehicleId`, no hay filtrado por empresa, y **ninguna ruta lleva el middleware `carrier.required`**: un `carrier` que todavía no ha registrado su empresa también puede leer el inventario.

Un rol sin permiso de escritura recibe **403**:

```json
{ "statusCode": 403, "message": "No tienes permisos para acceder a este recurso", "data": null }
```

---

## 3. El objeto `Accessory`

Es lo que devuelve `data` en los cinco endpoints (o cada elemento de `data` en el listado). Once claves, siempre en camelCase y siempre en este orden:

```json
{
  "id": 12,
  "name": "GATO HIDRÁULICO 20 TON",
  "code": "ACC-0012",
  "description": "Gato de botella, comprado en Ferretería El Tornillo",
  "price": "10000.00",
  "purchaseDate": "20-08-2024",
  "annualDepreciation": "20.00",
  "currentValue": "6000.00",
  "status": "active",
  "registeredBy": "Roberto Santizo",
  "createdAt": "20-08-2026 07:15:06 PM"
}
```

| Campo | Tipo | Notas para el front |
|---|---|---|
| `id` | `number` | Es el `{accessory}` de las rutas de detalle, edición y baja. No es el código: el que ve el usuario en la etiqueta es `code`. |
| `name` | `string` | **Siempre en MAYÚSCULAS**, con los espacios internos colapsados. Único a nivel nacional. Pinta lo que devuelve la respuesta, no lo que tecleó el usuario. |
| `code` | `string` | **Siempre en MAYÚSCULAS**, pero **sin colapsar espacios internos**. Único global y **ciego al estado**. Es editable. |
| `description` | `string \| null` | Único campo que puede ser `null`. Máx. 1000 caracteres. No se normaliza y no participa en el filtro `search`. |
| `price` | `string` | ⚠️ **Cadena, no número.** Dos decimales, GTQ por convención (ningún campo nombra la moneda). Es lo que costó la unidad. |
| `purchaseDate` | `string` | ⚠️ Formato `d-m-Y` (`20-08-2024`), **no ISO 8601** — y **distinto del formato de entrada**, que es `Y-m-d`. Es el día de la compra, sin hora. |
| `annualDepreciation` | `string` | ⚠️ **Cadena, no número.** Porcentaje anual con dos decimales, en `[0.00, 100.00]`. `"0.00"` = no se deprecia nunca. |
| `currentValue` | `string` | ⚠️ **Cadena y DERIVADO.** Valor depreciado a día de hoy, dos decimales, con **piso en `"0.00"`**: nunca negativo. Ver §4. |
| `status` | `string` | Uno de `"active"`, `"inactive"`, `"under_repair"`. **No es booleano.** La etiqueta en español la pone el front. |
| `registeredBy` | `string \| null` | **Nombre** del administrador que lo dio de alta, no su id. No se envía nunca en el body: sale del token. Editar el accesorio **no** lo reescribe. |
| `createdAt` | `string \| null` | ⚠️ **No es ISO 8601.** Formato propio `d-m-Y h:i:s A` (`20-08-2026 07:15:06 PM`). Está pensado para mostrarse tal cual; `new Date(...)` sobre él no funciona. Es cuándo se **capturó**, no cuándo se compró. |

> **No hay `updatedAt`.** Este recurso no lo expone, a diferencia de `Zone` y `Location`.

### Tipos TypeScript sugeridos

```ts
export type AccessoryStatus = 'active' | 'inactive' | 'under_repair';

export interface Accessory {
  id: number;
  name: string;
  code: string;
  description: string | null;
  /** Cadena con dos decimales, no número. GTQ. */
  price: string;
  /** Formato 'd-m-Y'. El POST/PATCH lo espera en 'Y-m-d'. */
  purchaseDate: string;
  /** Cadena con dos decimales: porcentaje anual en [0, 100]. */
  annualDepreciation: string;
  /** DERIVADO en cada lectura. Cadena con dos decimales, nunca negativa. Solo salida. */
  currentValue: string;
  status: AccessoryStatus;
  /** Nombre del usuario, no su id. */
  registeredBy: string | null;
  /** Formato 'd-m-Y h:i:s A', no ISO 8601. */
  createdAt: string | null;
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

## 4. `currentValue`: el campo derivado

Es la única parte del dominio que necesita cuidado real.

### La fórmula, exacta

```
años         = díasEntre(purchaseDate, hoy) / 365
depreciado   = price × (annualDepreciation / 100) × años
currentValue = round(max(0, price − depreciado), 2)
```

- **Depreciación lineal**, no saldo decreciente. Es el método estándar de activos fijos y el usuario puede verificarlo mentalmente.
- **La antigüedad se cuenta en fracción de años por días**, no en años cumplidos: el valor se mueve **cada día**, no da un salto de escalón en cada aniversario.
- **365 días fijos**, sin corrección por año bisiesto.
- **Piso en `0.00`.** Un accesorio totalmente depreciado vale cero, nunca un negativo.

### Casos frontera, con números concretos

| `price` | `annualDepreciation` | Antigüedad | `currentValue` |
|---|---|---|---|
| `10000.00` | `20.00` | 0 días (hoy) | `"10000.00"` — el día de la compra vale su precio |
| `10000.00` | `20.00` | 182 días | `"9002.74"` — media anualidad, no `"10000.00"` |
| `10000.00` | `20.00` | 730 días (2 años) | `"6000.00"` |
| `10000.00` | `20.00` | 6 años | `"0.00"` — piso, nunca `-2000.00` |
| `10000.00` | `0.00` | 10 años | `"10000.00"` — sin depreciación, vale su precio para siempre |

> Si necesitas el valor en el cliente (por ejemplo para un total en pantalla), **reimplementa esta fórmula tal cual**, con los mismos 365 días y el mismo `max(0, …)`. Cualquier variante dará números que no cuadran con los de la API.

### Lo que implica para la UI

- **No lo mandes nunca en un body.** No está en ninguno de los dos FormRequests; enviarlo no da error, simplemente se descarta.
- **No lo caches junto al resto de la fila.** Una lista guardada ayer muestra valores de ayer.
- **No pidas ordenar ni filtrar por él.** La base no conoce el campo. Si necesitas la página ordenada por valor, ordénala en el cliente sobre las filas que ya recibiste — sabiendo que es un orden **local a la página**, no global.
- Un `PATCH` de `price`, `purchaseDate` o `annualDepreciation` devuelve el `currentValue` **ya recalculado en esa misma respuesta**.

---

## 5. Formato de las respuestas

### Éxito

```json
{ "statusCode": 200, "message": "Accesorios obtenidos correctamente", "data": { ... } }
```

### Listado sin paginar (sin `limit`)

`data` es el array completo y **no hay** metadatos de paginación:

```json
{ "statusCode": 200, "message": "Accesorios obtenidos correctamente", "data": [ /* Accessory[] */ ] }
```

### Listado paginado (con `limit` numérico)

Los metadatos se aplanan **en la raíz** del sobre, **no** bajo `meta`:

```json
{
  "statusCode": 200,
  "message": "Accesorios obtenidos correctamente",
  "data": [ /* Accessory[] */ ],
  "total": 42,
  "currentPage": 1,
  "lastPage": 5
}
```

### Error de negocio (401, 403, 404, 400)

```json
{ "statusCode": 404, "message": "El accesorio no existe", "data": null }
```

### Error de validación (422) — **formato distinto**

No lleva `statusCode` ni `data`:

```json
{
  "message": "El nombre del accesorio es obligatorio (and 2 more errors)",
  "errors": {
    "name": ["El nombre del accesorio es obligatorio"],
    "price": ["El precio debe ser mayor a 0"],
    "purchaseDate": ["La fecha de compra no puede ser futura"]
  }
}
```

Las claves de `errors` son las del body, en camelCase (`purchaseDate`, `annualDepreciation`), así que mapean directamente a los campos del formulario.

---

## 6. Endpoints

### 6.1 `GET /api/accessories` — listar

Cualquier autenticado. Devuelve **los tres estados mezclados** salvo que se filtre: un accesorio dado de baja sigue saliendo aquí. Orden fijo `id ASC`, no configurable (no hay `sortBy` ni `sortDir`).

| Query param | Tipo | Comportamiento |
|---|---|---|
| `status` | `active\|inactive\|under_repair` | Filtra por estado, en minúsculas y tal cual. Cualquier otro valor —`1`, `true`, `ACTIVE`, `perdido`— **se ignora en silencio** y devuelve los tres estados (200, nunca 422). Solo admite un valor. |
| `search` | `string` | `LIKE %término%` sobre **`name` y `code` a la vez**, unidos por OR. **Insensible a mayúsculas** (`gato` y `GATO` encuentran `GATO HIDRÁULICO`; `acc-00` encuentra `ACC-0042` por su código). En blanco se ignora. **No** cubre la descripción. |
| `limit` | `number` | Activa la paginación. Se acota a `[10, 100]`: `limit=5` → páginas de 10; `limit=500` → páginas de 100. Ausente o no numérico → colección completa sin metadatos. |
| `page` | `number` | Solo tiene efecto con un `limit` numérico. |

Los filtros se combinan entre sí y **son tolerantes**: nada de lo que llegue mal produce un 422 aquí. Un filtro sin coincidencias devuelve **200 con `data: []`**, nunca 404.

> ⚠️ **Punto ciego conocido de `search`:** el término se normaliza como un nombre, colapsando sus espacios internos, mientras que el `code` se guarda **sin** colapsarlos. Un código guardado como `A␣␣100` (dos espacios) no se encuentra buscando `A␣␣100`, porque el término llega a la consulta ya colapsado a `A␣100`. Afecta solo a la búsqueda: el alta y la unicidad respetan los espacios.

```
GET /api/accessories?status=active&search=gato&limit=10&page=1
```

Respuestas: **200** (`"Accesorios obtenidos correctamente"`) · **401**.

---

### 6.2 `POST /api/accessories` — crear

Solo `administrator`.

```json
{
  "name": "gato hidráulico 20 ton",
  "code": "acc-0012",
  "description": "Gato de botella, comprado en Ferretería El Tornillo",
  "price": 10000,
  "purchaseDate": "2024-08-20",
  "annualDepreciation": 20
}
```

| Campo | Obligatorio | Reglas |
|---|:--:|---|
| `name` | ✅ | Texto, máx. 255. Se normaliza (recorte + colapso de espacios + mayúsculas) **antes** de comprobar unicidad, que es global. |
| `code` | ✅ | Texto, máx. 255. Se normaliza (recorte + mayúsculas, **sin** colapsar espacios) antes de comprobar unicidad, que es global **y ciega al estado**. No se autogenera. |
| `description` | — | Texto, máx. 1000, admite `null`. |
| `price` | ✅ | Numérico en `[0.01, 99999999.99]`. ⚠️ El mínimo es **0.01, no 0**: un precio de cero se rechaza. |
| `purchaseDate` | ✅ | Fecha válida, **no futura**. Se envía en `Y-m-d` y vuelve en `d-m-Y`. Hoy sí se acepta. |
| `annualDepreciation` | ✅ | Numérico en `[0, 100]`. **Los dos extremos se aceptan.** Es un porcentaje: `20` = 20 % anual. |

`status`, `registeredBy` y `currentValue` **no se aceptan**: el accesorio nace `"active"`, la autoría sale del token y el valor se deriva. Mandar cualquiera de los tres no tiene efecto y no da error.

Respuesta **201**: `{ statusCode: 201, message: "Accesorio registrado correctamente", data: Accessory }`.

Otras: **401** · **403** · **422** (campos faltantes, `name` o `code` repetidos —incluido mandar `gato hidráulico` existiendo `GATO HIDRÁULICO`, o el código de un accesorio dado de baja—, precio o depreciación fuera de rango, fecha futura).

---

### 6.3 `GET /api/accessories/{accessory}` — detalle

Cualquier autenticado. Un accesorio dado de baja o en reparación se obtiene con normalidad (200): la baja es lógica y no oculta nada.

Respuestas: **200** (`"Accesorio obtenido correctamente"`) · **401** · **404** (`"El accesorio no existe"`).

---

### 6.4 `PATCH /api/accessories/{accessory}` — editar

Solo `administrator`. La ruta acepta `PATCH` y `PUT` indistintamente; el comportamiento es el mismo (edición parcial en ambos casos).

Los **siete** campos son opcionales por separado: `name`, `code`, `description`, `price`, `purchaseDate`, `annualDepreciation` y `status`. Solo se toca lo que venga.

```json
{ "annualDepreciation": 15, "status": "under_repair" }
```

Reglas y trampas:

- **Body vacío `{}` → 200 sin cambios.** Es un no-op deliberado, no un error.
- `name` y `code` se revalidan **ignorando la propia fila**: reenviar su mismo valor da 200; el de otro accesorio da 422.
- **`code` es editable**: corregir un typo de la etiqueta conserva el `id` del accesorio y su historia. El código anterior queda libre.
- `description: null` **borra** la descripción. Omitir la clave la deja como está.
- `status` se mueve **libremente entre los tres valores**, en cualquier dirección, incluido `"inactive"` → `"active"`: **no hay reglas de transición** y este es el único camino para reactivar un accesorio dado de baja.
- Un `status` fuera del enum es **422**, no se ignora (a diferencia del filtro del listado, que sí lo ignora).
- `registeredBy` no cambia nunca, aunque edite otro administrador.
- Tocar `price`, `purchaseDate` o `annualDepreciation` **cambia el `currentValue` de esa misma respuesta**.

Respuestas: **200** (`"Accesorio actualizado correctamente"`) · **401** · **403** · **404** · **422**.

---

### 6.5 `DELETE /api/accessories/{accessory}` — dar de baja

Solo `administrator`. ⚠️ **No borra nada**: pone `status: "inactive"`.

- La fila **sigue apareciendo** en `GET /api/accessories` sin filtros. Para excluirla hay que filtrar por estado.
- Sigue siendo consultable por id (200) y sigue devolviendo su `currentValue`, que **se sigue depreciando**.
- **Sigue ocupando su `code` para siempre**: no se puede reutilizar en un accesorio nuevo.
- Es **idempotente**: repetir el `DELETE` sobre uno ya inactivo responde 200 otra vez, sin error. También funciona sobre uno en `"under_repair"`.
- Es reversible con `PATCH` y `status: "active"`. **No hay borrado real por ninguna vía.**

Respuestas: **200** (`"Accesorio dado de baja correctamente"`) · **401** · **403** · **404**.

---

## 7. Tabla de mensajes de error (literales)

Se pueden mostrar tal cual al usuario; ya están en español.

| Campo | Mensaje |
|---|---|
| `name` | `El nombre del accesorio es obligatorio` · `El nombre del accesorio debe ser texto` · `El nombre del accesorio no puede superar los 255 caracteres` · `Ya existe un accesorio con ese nombre` |
| `code` | `El código del accesorio es obligatorio` · `El código del accesorio debe ser texto` · `El código del accesorio no puede superar los 255 caracteres` · `Ya existe un accesorio con ese código` |
| `description` | `La descripción debe ser texto` · `La descripción no puede superar los 1000 caracteres` |
| `price` | `El precio es obligatorio` · `El precio debe ser numérico` · `El precio debe ser mayor a 0` · `El precio no puede superar 99999999.99` |
| `purchaseDate` | `La fecha de compra es obligatoria` · `La fecha de compra debe ser una fecha válida` · `La fecha de compra no puede ser futura` |
| `annualDepreciation` | `El porcentaje de depreciación anual es obligatorio` · `El porcentaje de depreciación anual debe ser numérico` · `El porcentaje de depreciación anual no puede ser negativo` · `El porcentaje de depreciación anual no puede superar 100` |
| `status` | `El estado debe ser active, inactive o under_repair` |

Errores de sobre: `El token de sesión no es válido o ha expirado` (401) · `No tienes permisos para acceder a este recurso` (403) · `El accesorio no existe` (404).

> **Sobre los duplicados:** por HTTP siempre salen como **422**, desde el FormRequest. La capa de servicio repite esas dos mismas comprobaciones y esos mismos textos como **400** en el sobre `{ statusCode, message, data }`, pero es la red de seguridad para llamadas internas —evita un 500 contra el índice único— y **el cliente nunca la alcanza**. Aun así, si tu manejador de errores es genérico, contempla ambos códigos con el mismo mensaje.

---

## 8. Checklist de implementación en el frontend

- [ ] Cliente HTTP que adjunta `Authorization: Bearer` y `Accept: application/json` en las cinco llamadas.
- [ ] Manejo **de dos formatos de error**: sobre `{statusCode, message, data}` para 401/403/404/400 y `{message, errors}` para 422.
- [ ] Mapeo de `errors` de validación a los campos del formulario por su clave camelCase (`purchaseDate`, `annualDepreciation`).
- [ ] Formulario de alta con los **cinco obligatorios** (`name`, `code`, `price`, `purchaseDate`, `annualDepreciation`) y `description` opcional; **no** pintar selector de estado en el alta.
- [ ] Fecha de compra: enviar en `Y-m-d`, mostrar lo que vuelve en `d-m-Y`, y bloquear fechas futuras en el date-picker (el 422 del servidor es la red, no la UX).
- [ ] Precio y depreciación: `parseFloat` al leerlos (llegan como cadena) y formatear al pintarlos; permitir `0` en la depreciación y **no** permitir `0` en el precio.
- [ ] `currentValue`: mostrarlo como valor de solo lectura, **nunca** enviarlo de vuelta, **nunca** cachearlo entre sesiones, y no ofrecer ordenar ni filtrar por él en la tabla del servidor.
- [ ] Si se calcula el valor en el cliente, usar la fórmula de §4 exacta (365 días, piso en 0).
- [ ] Estado con **tres** opciones en la edición, con etiquetas en español propias del front (`active` → «Activo», `inactive` → «Dado de baja», `under_repair` → «En reparación»); no hay endpoint de toggle.
- [ ] Listado: paginación leyendo `total`/`currentPage`/`lastPage` **de la raíz**, y modo sin `limit` para selectores.
- [ ] Buscador único que cubre nombre y código a la vez; no hacer dos campos separados.
- [ ] Mostrar `name` y `code` tal como los devuelve la respuesta (normalizados), no los tecleados.
- [ ] Fechas: mostrar `createdAt` como texto plano; no parsearla como ISO. No esperar `updatedAt`.
- [ ] Baja lógica: la fila no desaparece de la tabla tras el `DELETE`; refleja `status` con un estado visual y ofrece reactivar por `PATCH`.
- [ ] Avisar en el formulario de alta que el código de un accesorio dado de baja **no** se puede reutilizar.
- [ ] Ocultar o deshabilitar las acciones de escritura para los roles que no son `administrator`.

---

## 9. Lo que este dominio **no** hace (para no diseñarlo en el front)

- **No guarda imagen del accesorio.** No hay subida de archivos en este dominio.
- **No asigna el accesorio a un vehículo ni a un transportista.** No hay `vehicleId` ni `carrierId`, ni endpoint de asignación, ni historial de a qué unidad estuvo montado.
- **No lleva cantidades ni control de existencias:** sin `quantity`, sin entradas, sin salidas, sin mínimos de stock.
- **No filtra ni ordena por `currentValue`**, ni lo suma en la raíz del sobre (nada equivalente al `totalAmount` de Vehicle Expenses).
- **No hay reportes:** ni valor total del inventario, ni depreciación acumulada del período, ni proyección a N años, ni desglose por estado.
- **No hay valor residual, saldo decreciente ni método de depreciación seleccionable.** El método es lineal para todos y está fijado en el código.
- **No hay bitácora de cambios:** el `PATCH` no deja rastro, y no hay historial de precios, de estado ni de depreciación.
- **No hay categorías ni tipos de accesorio.** Hoy la distinción cabe en `name` y `description`.
- **No hay gastos de mantenimiento del accesorio.** `vehicle_expenses` es de vehículos y no acepta accesorios.
- **No hay borrado real**, ni endpoint de toggle de estado.
- **No hay exportación a CSV o Excel**, ni alta en lote.
- **No hay orden configurable** (`sortBy`, `sortDir`) ni filtros por rango de precio o de fechas.
- **No hay moneda configurable.** GTQ es convención del dominio; ningún campo la nombra.
