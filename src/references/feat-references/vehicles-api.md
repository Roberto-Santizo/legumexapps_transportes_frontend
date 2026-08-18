# Vehículos — referencia de integración para el frontend

Referencia completa del dominio **Vehicles** de la API de Legumex Transportes: cinco endpoints REST bajo `/api/vehicles` para gestionar el inventario de vehículos de una empresa transportista, con su ficha técnica y financiera.

Todo lo que hay aquí está verificado contra la implementación real de la rama `spec-13-vehicle-details` (rutas, FormRequests, Resource, Service y suite de tests). Los mensajes de error son literales: se pueden mostrar tal cual al usuario.

> Documentación OpenAPI viva: `/api/documentation`.

---

## ⚠️ Cambio incompatible en el alta (SPEC 13)

**`POST /api/vehicles` pasa de siete campos obligatorios a trece.** Los seis nuevos son `condition`, `kilometers_per_gallon`, `purchase_price`, `monthly_insurance_cost`, `mileage` y `engine_number`.

**No hay periodo de gracia y no lo hay a propósito.** En cuanto esto se despliegue, cualquier formulario de alta que no haya sido actualizado recibe **422 en todas las altas**. Backend y frontend tienen que desplegarse coordinados.

Lo traicionero es que **la edición y el listado sí siguen siendo compatibles**: siguen aceptando lo mismo que antes y solo ganan campos en la respuesta. Eso da una falsa sensación de que toda la API lo es. No lo es: el alta está rota hasta que se actualice el formulario.

---

## 1. Lo mínimo que hay que saber antes de escribir código

1. **`condition` NO es `status`.** Son dos ejes que no tienen nada que ver y ninguno reemplaza al otro. `status` (`active` / `inactive` / `under_repair`) es el estado **operativo**: gobierna la baja lógica y la unicidad de la placa. `condition` (`new` / `used`) es **cómo se adquirió** el vehículo y no gobierna nada. En español los dos se leen como «estado»: etiquétalos distinto en la UI («Estado» y «Condición») o el usuario los confundirá.
2. **El kilometraje tiene su propia regla de permiso, y es la única del proyecto que vive en un campo y no en una ruta.** Un `carrier` alcanza el `PATCH` igual que antes, pero si envía `mileage` con un valor **distinto** al almacenado recibe **403 y no se guarda absolutamente nada más del cuerpo** — ni la marca, ni la imagen. Enviar el valor que el vehículo ya tiene no es un cambio: pasa con 200 para cualquier rol. Es exactamente el caso de un formulario que reenvía el campo oculto.
3. **Un `administrator` no puede crear vehículos.** `POST /api/vehicles` es `role:carrier` a secas: un administrador recibe **403**. Sí puede listar, ver, editar y desactivar. Es herencia de SPEC 04, no de esta spec.
4. **Los importes viajan como cadena, no como número.** `capacity`, `kilometersPerGallon`, `purchasePrice` y `monthlyInsuranceCost` salen como `"185000.00"` por el casting `decimal:2`. `mileage` y `year` sí son enteros. No hagas aritmética sobre ellos sin convertir.
5. **`engineNumber` puede ser `null`.** Es la única de las seis columnas nuevas que lo admite, y significa «vehículo anterior a esta migración, ficha sin capturar». Por la API nunca se llega a ese estado: es obligatorio en el alta y no se puede vaciar en la edición.
6. **El número de motor NO es único.** A diferencia de la placa, dos vehículos pueden compartirlo sin ningún conflicto. No hay validación, no hay índice y no hay mensaje de error asociado.
7. **Toda respuesta viaja en un sobre** `{ statusCode, message, data }`… **salvo el 422 de validación**, que usa el formato estándar de Laravel `{ message, errors }`. Son dos formas distintas y el cliente debe distinguirlas.
8. **`DELETE` no borra.** Es una baja lógica: pone `status: "inactive"` y la fila **sigue apareciendo en el listado**. Filtrarla es responsabilidad del cliente.
9. **Este dominio no devuelve ninguna fecha.** El recurso no expone `createdAt` ni `updatedAt`. Si tu tabla necesita una columna de fecha, no la tienes aquí.
10. **El cuerpo del alta es `multipart/form-data`**, no JSON: la imagen es obligatoria y va en el mismo envío.

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
| `GET /api/vehicles` — listar | ✅ | ✅ (solo su empresa) | 403 | 403 |
| `GET /api/vehicles/{id}` — detalle | ✅ | ✅ (solo su empresa) | 403 | 403 |
| `POST /api/vehicles` — crear | **403** | ✅ | 403 | 403 |
| `PATCH /api/vehicles/{id}` — editar (los cinco campos nuevos que no son el kilometraje) | ✅ | ✅ (solo su empresa) | 403 | 403 |
| `PATCH /api/vehicles/{id}` — mover `mileage` a un valor distinto | ✅ | **403** | 403 | 403 |
| `DELETE /api/vehicles/{id}` — desactivar | ✅ | ✅ (solo su empresa) | 403 | 403 |

Los cinco endpoints llevan **`carrier.required`**: hay que estar vinculado a una empresa transportista. `administrator` y `manager` están exentos de ese middleware, pero el `manager` no pasa el filtro de rol, así que **no alcanza el dominio en absoluto**. El `pilot`, tampoco.

**Ámbito por empresa:** un `carrier` solo ve y toca los vehículos de su propia empresa; tocar uno ajeno es 403. Un `administrator` ve los de todas y puede acotar con `?carrierId=`. A un `carrier` el `carrierId` **se le ignora en silencio**: su ámbito manda.

Un rol sin permiso recibe **403**:

```json
{ "statusCode": 403, "message": "No tienes permisos para acceder a este recurso", "data": null }
```

Y un usuario sin empresa vinculada:

```json
{ "statusCode": 403, "message": "Debes estar vinculado a un transportista para acceder a este recurso", "data": null }
```

---

## 3. El objeto `Vehicle`

Es lo que devuelve `data` en los cinco endpoints (o cada elemento de `data` en el listado). **Dieciséis claves**, siempre en camelCase y siempre en este orden:

```json
{
  "id": 12,
  "plate": "P123ABC",
  "brand": "Kenworth",
  "model": "T680",
  "year": 2021,
  "capacity": "15000.50",
  "type": "truck",
  "condition": "used",
  "kilometersPerGallon": "17.20",
  "purchasePrice": "458897.46",
  "monthlyInsuranceCost": "603.37",
  "mileage": 475046,
  "engineNumber": "PE013704",
  "image": "https://mi-bucket.s3.us-east-1.amazonaws.com/vehicles/9f1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d.png",
  "status": "active",
  "carrierName": "Transportes del Norte"
}
```

| Campo | Tipo JSON | Notas |
|---|---|---|
| `id` | `number` | Identificador del vehículo. |
| `plate` | `string` | Placa, **siempre en mayúsculas**. Unicidad condicional: solo puede repetirse si todos los vehículos que ya la usan están `inactive`. |
| `brand` | `string` | Marca. |
| `model` | `string` | Modelo. |
| `year` | `number` | Entero entre 1900 y el año siguiente al actual. |
| `capacity` | `string` | Capacidad de carga **en libras**. Cadena de dos decimales. Convención del dominio: nada valida que no sean kilos. |
| `type` | `string` | `truck` · `van` · `trailer` · `pickup`. En inglés; traducir es del cliente. |
| `condition` | `string` | `new` · `used`. **Cómo se adquirió el vehículo.** No es `status`. |
| `kilometersPerGallon` | `string` | Rendimiento en **km por galón**. Cadena de dos decimales. |
| `purchasePrice` | `string` | Lo que costó el vehículo, en **GTQ**. Cadena de dos decimales. |
| `monthlyInsuranceCost` | `string` | Prima del seguro **por mes**, en **GTQ**. Cadena de dos decimales. |
| `mileage` | `number` | Odómetro en **kilómetros enteros**. Entero, no cadena. |
| `engineNumber` | `string \| null` | Número de motor, **siempre en mayúsculas**. `null` = ficha heredada sin capturar. **No es único.** |
| `image` | `string \| null` | URL pública y permanente, lista para `src`. Siempre un cuadrado de 800×800 px recortado desde el centro. No es la key interna: no la compongas a mano. |
| `status` | `string` | `active` · `inactive` · `under_repair`. **Estado operativo.** Nace siempre en `active`. |
| `carrierName` | `string \| null` | Nombre de la empresa dueña. El recurso no expone el `carrierId`. |

**No hay `createdAt` ni `updatedAt`.** Este dominio no devuelve fechas en ningún endpoint, así que el formato `d-m-Y h:i:s A` que usan otros dominios de la API aquí no aplica: no hay ningún campo de fecha que formatear.

### Valores de relleno de la migración

Los vehículos registrados **antes** de SPEC 13 quedaron con valores de relleno, no con datos de negocio:

```json
{
  "condition": "used",
  "kilometersPerGallon": "1.00",
  "purchasePrice": "1.00",
  "monthlyInsuranceCost": "1.00",
  "mileage": 1,
  "engineNumber": null
}
```

Un `purchasePrice` de `"1.00"` significa «no capturado», y **nada en la base lo distingue** de un vehículo que de verdad costó un quetzal. La única marca fiable de ficha heredada es **`engineNumber: null`**, porque la API nunca produce ese estado. Cualquier informe que necesite distinguir debe apoyarse en esa clave, no en los importes.

### Tipos TypeScript sugeridos

```ts
type VehicleType = 'truck' | 'van' | 'trailer' | 'pickup';
type VehicleStatus = 'active' | 'inactive' | 'under_repair';
type VehicleCondition = 'new' | 'used';

/** Importe decimal serializado como cadena de dos decimales por el backend. */
type DecimalString = string;

interface Vehicle {
  id: number;
  plate: string;
  brand: string;
  model: string;
  year: number;
  capacity: DecimalString;             // libras
  type: VehicleType;
  condition: VehicleCondition;         // NO es status
  kilometersPerGallon: DecimalString;  // km/galón
  purchasePrice: DecimalString;        // GTQ
  monthlyInsuranceCost: DecimalString; // GTQ al mes
  mileage: number;                     // kilómetros enteros
  engineNumber: string | null;         // null = ficha heredada
  image: string | null;
  status: VehicleStatus;
  carrierName: string | null;
}

interface VehicleFilters {
  status?: VehicleStatus;
  carrierId?: number;           // solo lo honra un administrator
  condition?: VehicleCondition; // coincidencia exacta
  engineNumber?: string;        // coincidencia parcial
  limit?: number;               // 10–100; sin él, no pagina
  page?: number;
}

const toNumber = (value: DecimalString): number => Number.parseFloat(value);
const isLegacyRecord = (vehicle: Vehicle): boolean => vehicle.engineNumber === null;
```

---

## 4. Formato de las respuestas

### Éxito

```json
{ "statusCode": 200, "message": "Vehículo obtenido correctamente", "data": { "...": "Vehicle" } }
```

### Listado sin paginar (sin `limit`)

`data` es el array completo y **no hay** metadatos de paginación:

```json
{ "statusCode": 200, "message": "Vehículos obtenidos correctamente", "data": [] }
```

### Listado paginado (con `limit` numérico)

Los metadatos se aplanan **en la raíz** del sobre, **no** bajo `meta`:

```json
{
  "statusCode": 200,
  "message": "Vehículos obtenidos correctamente",
  "data": [],
  "total": 42,
  "currentPage": 1,
  "lastPage": 5
}
```

### Error de negocio (400, 401, 403, 404)

```json
{ "statusCode": 404, "message": "El vehículo no existe", "data": null }
```

### Error de validación (422) — **formato distinto**

No lleva `statusCode` ni `data`. Las claves de `errors` son los nombres de campo **en snake_case**, no en camelCase como la respuesta:

```json
{
  "message": "La condición del vehículo es obligatoria (and 5 more errors)",
  "errors": {
    "condition": ["La condición del vehículo es obligatoria"],
    "kilometers_per_gallon": ["El rendimiento en kilómetros por galón es obligatorio"],
    "purchase_price": ["El valor de compra es obligatorio"],
    "monthly_insurance_cost": ["El costo mensual del seguro es obligatorio"],
    "mileage": ["El kilometraje es obligatorio"],
    "engine_number": ["El número de motor es obligatorio"]
  }
}
```

**Ojo con la asimetría:** el cuerpo que envías y las claves de error usan `snake_case` (`purchase_price`), mientras que la respuesta usa `camelCase` (`purchasePrice`). El mapa de errores a campos del formulario tiene que traducir entre ambos.

---

## 5. Endpoints

### 5.1 `GET /api/vehicles` — listar

Query params, **todos opcionales y todos tolerantes**:

| Param | Valores | Comportamiento |
|---|---|---|
| `status` | `active` · `inactive` · `under_repair` | Coincidencia exacta. |
| `carrierId` | entero | **Solo lo honra un `administrator`.** A un `carrier` se le ignora. |
| `condition` | `new` · `used` | **Coincidencia exacta.** |
| `engineNumber` | texto | **Coincidencia parcial** `LIKE %término%`. |
| `limit` | 10–100 | Sin él (o no numérico) devuelve la colección completa sin paginar. Fuera de rango se acota a `[10, 100]`. |
| `page` | entero | Solo tiene sentido junto a `limit`. |

**Tolerancia — importante:** un valor inválido **se ignora** y devuelve el listado completo. `?condition=antiguo` **no** es 422 ni una lista vacía: es el listado entero. No uses la respuesta para validar la entrada del usuario; valida en el cliente.

Sobre `engineNumber`:

- Es **case-insensitive** de regalo, porque la columna se guarda en mayúsculas: `?engineNumber=abc` casa con `XABC123`.
- Los vehículos con `engineNumber: null` **nunca** aparecen en un resultado filtrado por este parámetro. No tienen número que buscar.
- `?engineNumber=` vacío equivale a no mandarlo: listado completo.

Los cinco filtros se combinan entre sí sin interferir.

- **200** → `Vehículos obtenidos correctamente`
- El listado trae **todos los estados** por defecto, incluidos `inactive` y `under_repair`.

### 5.2 `POST /api/vehicles` — crear

**Solo `carrier`.** Un `administrator` recibe 403. Cuerpo `multipart/form-data` con **trece campos, todos obligatorios**:

| Campo | Reglas |
|---|---|
| `plate` | texto, máx. 15. Se normaliza a mayúsculas. |
| `brand` | texto, máx. 100. |
| `model` | texto, máx. 100. |
| `year` | entero, 1900 … año siguiente. |
| `capacity` | numérico, `min:0`. En libras. |
| `type` | `truck` · `van` · `trailer` · `pickup`. |
| `condition` | `new` · `used`. |
| `kilometers_per_gallon` | numérico, **`min:0.01`**. |
| `purchase_price` | numérico, **`min:0.01`**. GTQ. |
| `monthly_insurance_cost` | numérico, **`min:0.01`**. GTQ al mes. |
| `mileage` | **entero**, `min:0`. Kilómetros. |
| `engine_number` | texto, máx. 50. Se normaliza a mayúsculas. |
| `image` | archivo `jpg` / `jpeg` / `png`, máx. 3 MB (3072 KB, inclusivo). |

Detalles que importan:

- Los tres decimales nuevos van `min:0.01`, **no** `min:0`: un rendimiento de cero, un vehículo que costó cero o un seguro de cero al mes son captura errónea, no datos. `0` es 422; `0.01` se acepta.
- `mileage` **sí admite `0`** (vehículo nuevo sin rodar). Es entero: `120000.5` es 422, y `-1` también.
- `engine_number = "abc123"` persiste como `"ABC123"`.
- **No hay validación cruzada:** un vehículo `condition: "new"` con `mileage: 90000` es perfectamente válido y responde 201.
- **Dos vehículos activos de la misma empresa pueden compartir `engine_number`.** Los dos reciben 201.
- El `status` **no se acepta**: el vehículo nace siempre `active` y enviarlo se descarta sin error. `condition` no influye en ello.
- El `carrier_id` **tampoco se envía**: sale de la empresa del usuario autenticado.
- La imagen se recorta a un cuadrado centrado de 800×800 px conservando el formato. El original no se guarda en ningún sitio.

Respuestas:

- **201** → `Vehículo registrado correctamente`
- **400** → placa ya tomada, o fallo de procesado / almacenamiento de la imagen (el vehículo **no** se crea).
- **422** → validación.

### 5.3 `GET /api/vehicles/{vehicle}` — detalle

Sin query params. Un `carrier` que pide un vehículo de otra empresa recibe **403**, no 404.

- **200** → `Vehículo obtenido correctamente`
- **403** → `No puedes acceder a un vehículo que no pertenece a tu empresa transportista`
- **404** → `El vehículo no existe`

### 5.4 `PATCH /api/vehicles/{vehicle}` — editar

También acepta `PUT`. Cuerpo `multipart/form-data` **parcial**: omitir un campo no lo toca, enviarlo vacío es 422. Los catorce campos aceptados son los trece del alta más `status`.

Reglas idénticas a las del alta, con `sometimes` delante. Particularidades:

- **`engine_number` no se puede vaciar:** enviar `null` es **422**, no un borrado. Por la API no se llega nunca a `engineNumber: null`.
- Cambiar `condition` **no altera** `status`, y cambiar `status` **no altera** `condition`.
- **Reactivar** un vehículo `inactive` revalida **solo la placa**. Un número de motor duplicado no bloquea la reactivación.

#### La regla del kilometraje

Es la única autorización por campo del proyecto y **no aparece en ninguna ruta ni en ningún middleware**: vive dentro del service.

| Situación | `administrator` | `carrier` |
|---|:--:|:--:|
| No se envía `mileage` | 200 | 200 |
| Se envía `mileage` **igual** al almacenado | 200 | **200** — no es un cambio |
| Se envía `mileage` **distinto** | 200, se aplica | **403** |
| Se **baja** el `mileage` | 200, permitido | 403 |

- La comparación es **sobre enteros**: `"120000"` (cadena) y `120000` sobre un vehículo que ya tiene `120000` son el mismo valor y **no** disparan el 403. Se puede reenviar el formulario completo con el campo oculto sin miedo.
- El 403 **aborta el `PATCH` entero**: no se guarda ningún otro campo del cuerpo y la imagen **ni siquiera se sube**. Es deliberado — recibir 200 y creer que se guardó un kilometraje que el servidor descartó sería peor.
- Un `administrator` puede subirlo y bajarlo sin restricción. **No hay bitácora**: el valor anterior se pierde. Si el formulario manda `mileage: 0` porque el input oculto llegó vacío, un administrador **borra el kilometraje real sin ningún aviso y sin forma de recuperarlo**. Hay que proteger ese input en el cliente.

Respuestas:

- **200** → `Vehículo actualizado correctamente`
- **400** → placa tomada, o no se puede reactivar porque la placa está ocupada.
- **403** → vehículo ajeno, o kilometraje sin ser administrador.
- **404** → `El vehículo no existe`
- **422** → validación.

### 5.5 `DELETE /api/vehicles/{vehicle}` — desactivar

**Baja lógica.** Pasa el `status` a `inactive`; la fila sigue viva y **sigue apareciendo en los listados**. Devuelve el vehículo ya desactivado. El archivo de la imagen **no se borra** del almacenamiento.

Desactivar **libera la placa** para otro vehículo. No libera nada respecto al número de motor, que nunca estuvo reservado.

- **200** → `Vehículo desactivado correctamente`
- **403** → vehículo ajeno.
- **404** → `El vehículo no existe`

---

## 6. Tabla de mensajes de error (literales)

Se pueden mostrar tal cual al usuario; ya están en español.

### Validación (422)

El mensaje de «campo obligatorio» cambia entre el alta y la edición; el resto de mensajes de cada campo son idénticos en los dos.

| Campo | Alta | Edición | Resto de mensajes (comunes) |
|---|---|---|---|
| `plate` | `La placa es obligatoria` | `La placa no puede estar vacía` | `La placa debe ser texto` · `La placa no puede superar los 15 caracteres` |
| `brand` | `La marca es obligatoria` | `La marca no puede estar vacía` | `La marca debe ser texto` · `La marca no puede superar los 100 caracteres` |
| `model` | `El modelo es obligatorio` | `El modelo no puede estar vacío` | `El modelo debe ser texto` · `El modelo no puede superar los 100 caracteres` |
| `year` | `El año es obligatorio` | `El año no puede estar vacío` | `El año debe ser un número entero` · `El año no puede ser anterior a 1900` · `El año no puede ser posterior a {año actual + 1}` |
| `capacity` | `La capacidad en libras es obligatoria` | `La capacidad en libras no puede estar vacía` | `La capacidad debe ser un número en libras` · `La capacidad no puede ser negativa` |
| `type` | `El tipo de vehículo es obligatorio` | `El tipo de vehículo no puede estar vacío` | `El tipo de vehículo no es válido` |
| `condition` | `La condición del vehículo es obligatoria` | `La condición del vehículo no puede estar vacía` | `La condición del vehículo no es válida` |
| `kilometers_per_gallon` | `El rendimiento en kilómetros por galón es obligatorio` | `El rendimiento en kilómetros por galón no puede estar vacío` | `El rendimiento debe ser un número en kilómetros por galón` · `El rendimiento debe ser mayor que cero` |
| `purchase_price` | `El valor de compra es obligatorio` | `El valor de compra no puede estar vacío` | `El valor de compra debe ser un número` · `El valor de compra debe ser mayor que cero` |
| `monthly_insurance_cost` | `El costo mensual del seguro es obligatorio` | `El costo mensual del seguro no puede estar vacío` | `El costo mensual del seguro debe ser un número` · `El costo mensual del seguro debe ser mayor que cero` |
| `mileage` | `El kilometraje es obligatorio` | `El kilometraje no puede estar vacío` | `El kilometraje debe ser un número entero de kilómetros` · `El kilometraje no puede ser negativo` |
| `engine_number` | `El número de motor es obligatorio` | `El número de motor no puede estar vacío` | `El número de motor debe ser texto` · `El número de motor no puede superar los 50 caracteres` |
| `image` | `La imagen es obligatoria` | `La imagen no puede estar vacía` | `La imagen debe ser un archivo` · `La imagen debe ser un archivo jpg, jpeg o png` · `La imagen no puede pesar más de 3 MB` |
| `status` | — (no se acepta en el alta) | `El estado no puede estar vacío` | `El estado del vehículo no es válido` |

### Errores de negocio (sobre `{ statusCode, message, data }`)

| Código | Mensaje | Cuándo |
|---|---|---|
| 400 | `La placa ya está registrada en un vehículo que no está desactivado` | Alta o edición con una placa que ya usa un vehículo `active` o `under_repair`. |
| 400 | `No puedes reactivar este vehículo: su placa ya está registrada en otro vehículo que no está desactivado` | Sacar de `inactive` un vehículo cuya placa se ocupó mientras tanto. |
| 400 | `No se pudo procesar la imagen` | El archivo no se pudo decodificar. Nada se escribió en el almacenamiento. |
| 400 | `No se pudo almacenar la imagen` | Fallo del almacenamiento. El vehículo no se crea. |
| 401 | `El token de sesión no es válido o ha expirado` | Token ausente, manipulado o caducado. |
| 403 | `No tienes permisos para acceder a este recurso` | Rol sin acceso (`pilot`, `manager`; también `administrator` en el `POST`). |
| 403 | `Debes estar vinculado a un transportista para acceder a este recurso` | Usuario sin empresa vinculada. |
| 403 | `No perteneces a ninguna empresa transportista` | El usuario perdió el vínculo al resolver el ámbito. |
| 403 | `No puedes acceder a un vehículo que no pertenece a tu empresa transportista` | Vehículo de otra empresa. |
| 403 | **`Solo un administrador puede modificar el kilometraje del vehículo`** | Un `carrier` envía `mileage` con un valor distinto al almacenado. |
| 403 | `Necesitas pertenecer a una empresa transportista para registrar un vehículo` | Alta sin empresa vinculada. |
| 404 | `El vehículo no existe` | Id inexistente. |

---

## 7. Checklist de implementación en el frontend

- [ ] **Antes que nada:** actualizar el formulario de alta a los trece campos. Sin eso, todas las altas devuelven 422 en cuanto se despliegue el backend.
- [ ] Cliente HTTP que adjunta `Authorization: Bearer` y `Accept: application/json` en las cinco llamadas.
- [ ] Manejo **de dos formatos de error**: sobre `{statusCode, message, data}` para 400/401/403/404 y `{message, errors}` para 422.
- [ ] Traducción `snake_case` ↔ `camelCase` al mapear `errors` a los campos del formulario (`purchase_price` → `purchasePrice`).
- [ ] Alta y edición como `multipart/form-data`, no JSON.
- [ ] Dos etiquetas distintas para `status` («Estado») y `condition` («Condición»); no reutilizar el mismo componente ni el mismo código de color.
- [ ] Los cuatro decimales (`capacity`, `kilometersPerGallon`, `purchasePrice`, `monthlyInsuranceCost`) llegan como **cadena**: convertir antes de sumar, ordenar o graficar.
- [ ] Formatear `purchasePrice` y `monthlyInsuranceCost` como **GTQ**, y etiquetar el seguro como **mensual**. El backend no manda símbolo de moneda ni periodicidad.
- [ ] `mileage` como entero, en kilómetros. Sin decimales en el input.
- [ ] **Proteger el input de `mileage`:** deshabilitarlo u ocultarlo para un `carrier`, y no permitir que llegue vacío o a `0` por accidente — un `administrator` lo aplicaría sin aviso y no hay forma de recuperar el valor anterior.
- [ ] Manejar el 403 del kilometraje como un fallo **de toda la operación**: revertir el formulario al estado del servidor, no dar por guardado el resto de campos.
- [ ] Reenviar el formulario completo con `mileage` sin cambiar es seguro para cualquier rol: no hace falta partir la petición en dos.
- [ ] Tolerar `engineNumber: null` en toda la UI (tabla, detalle, exportaciones) y usarlo como marca de «ficha pendiente de capturar».
- [ ] No mostrar error de «número de motor duplicado»: no existe esa validación.
- [ ] Listado: paginación leyendo `total` / `currentPage` / `lastPage` **de la raíz**, no de `meta`.
- [ ] Filtros `condition` y `engineNumber` **validados en el cliente**: un valor inválido devuelve el listado completo, no un error, así que el usuario no se enteraría.
- [ ] Buscador de número de motor: coincidencia parcial, sin necesidad de respetar mayúsculas.
- [ ] Ocultar `?carrierId=` para un `carrier`: se ignora en silencio.
- [ ] Ocultar el botón de alta para un `administrator` (recibiría 403), y todo el módulo para `pilot` y `manager`.
- [ ] Baja lógica: la fila **no desaparece** de la tabla tras el `DELETE`; reflejar `status` con un estado visual y ofrecer reactivar.
- [ ] Mostrar `plate` y `engineNumber` tal como los devuelve la respuesta (ya normalizados en mayúsculas), no los tecleados.
- [ ] No esperar `createdAt` / `updatedAt`: este dominio no devuelve fechas.

---

## 8. Lo que este dominio **no** hace (para no diseñarlo en el front)

- **No hay endpoint dedicado de kilometraje** (`PATCH /api/vehicles/{id}/mileage`). El kilometraje se captura en el alta y solo un `administrator` lo corrige por el `PATCH` general.
- **No hay bitácora ni historial** de ningún campo. Un cambio de kilometraje, de precio o de seguro no deja rastro: no hay «quién lo cambió» ni «valor anterior».
- **No impide que el kilometraje baje.** Un odómetro se reemplaza y un dato se captura mal; corregirlo hacia abajo está permitido a propósito.
- **No valida la unicidad del número de motor** en ninguna forma.
- **No permite borrar el número de motor.** No hay forma de volver a `null` por la API.
- **No hace validación cruzada entre campos:** un vehículo `new` con 90 000 km es válido, y un `purchase_price` de `1.00` también.
- **No guarda el resto de la póliza de seguro:** aseguradora, número de póliza, vigencia, deducible, cobertura, fecha de renovación ni suma asegurada. Solo cuánto se paga al mes.
- **No usa el rendimiento para calcular nada.** `kilometersPerGallon` es un dato de ficha: no alimenta la cotización de fletes ni ningún costo de viaje.
- **No calcula depreciación ni valor actual.** `purchasePrice` es lo que costó y no se recalcula nunca.
- **No dispara alertas ni mantenimientos** por kilometraje.
- **No convierte unidades.** Guarda km/galón, kilómetros y quetzales; no hay millas, litros ni dólares.
- **No oculta los campos financieros por rol.** Quien alcanza el listado ve `purchasePrice` y `monthlyInsuranceCost` de todos los vehículos de su ámbito.
- **No hay borrado real**, ni restauración desde una papelera.
- **No exporta el inventario** a CSV ni a Excel.
- **No hay orden configurable** (`sortBy`, `sortDir`) ni filtros por rango de fechas, año, capacidad o precio.
- **No hay alta en lote** ni importación de un inventario existente.
