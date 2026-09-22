# Documentos del piloto — referencia de integración para el frontend

Referencia completa de los **documentos del piloto** en la API de Legumex Transportes: la foto del anverso del **DPI** y la del anverso de la **licencia de conducir**, que el piloto sube durante su registro.

Este no es un dominio con endpoints propios. **No añade ni una ruta**: son dos campos de archivo en `POST /api/auth/register` y dos claves de lectura que aparecen en tres recursos que ya existían. No hay `GET /api/pilots/{pilot}/documents` ni nada parecido, y no hay forma de reemplazar una foto después del alta.

Todo lo que hay aquí está verificado contra la implementación real (Laravel 13 + PHP 8.5) y contra su suite de tests. Los mensajes de error son literales: se pueden mostrar tal cual al usuario.

> Documentación OpenAPI viva: `/api/documentation`.

---

## 1. Lo mínimo que hay que saber antes de escribir código

1. **`POST /api/auth/register` deja de ser JSON: ahora va en `multipart/form-data`.** Es un **cambio incompatible sin periodo de gracia**. El formulario de registro de pilotos que hoy manda `application/json` empezará a recibir **422** en el primer despliegue. Hay que desplegar el frontend y el backend coordinados.
2. **Las dos fotos son obligatorias solo cuando `role` es `pilot`.** Es la primera validación condicional por rol del proyecto (`required_if:role,pilot`).
3. **Los dos archivos o ninguno.** Registrarse como piloto mandando solo `dpi` o solo `license` es **422**. No existe el alta a medias porque tampoco existe un endpoint para completarla después.
4. **Un `carrier` que mande las fotos las ve descartadas en silencio.** La respuesta es **201**, no 422: no se sube nada, no se crea ninguna fila y `dpiImage`/`licenseImage` vuelven en `null`. Si tu formulario es único para los dos roles, no pasa nada por mandarlas — pero no esperes verlas después.
5. **Se suben una sola vez y NO se pueden reemplazar.** No hay `PATCH`, no hay endpoint nuevo y ninguna ruta existente acepta estos archivos. **No construyas una pantalla de "cambiar mi DPI": no hay API detrás.** Una foto mal subida se corrige fuera de la aplicación.
6. **Las URLs son públicas, absolutas y permanentes.** Se usan directamente como `src` y se abren **sin token**. No son URL firmadas y no caducan. Trátalas como un enlace que cualquiera con la dirección puede abrir.
7. **`null` no es un error.** Un `carrier`, un `administrator`, un `manager` y **cualquier piloto registrado antes de esta versión** traen las dos claves en `null`. No hubo backfill. Las claves están **siempre presentes**: `null`, nunca ausentes.
8. **Que un piloto no tenga documentos no bloquea nada.** Hace login, se une a una empresa, cobra salario y arranca y cierra viajes con normalidad. No hay validación que lo impida en ningún punto.
9. **La API no sabe nada más del documento.** No guarda número de DPI, número de licencia, tipo de licencia (A, B, C), fecha de emisión ni **fecha de vencimiento**. No preguntes por una licencia caducada: esa información no existe.
10. **Toda respuesta viaja en un sobre** `{ statusCode, message, data }`… **salvo el 422 de validación**, que usa el formato estándar de Laravel `{ message, errors }`. Son dos formas distintas y el cliente debe distinguirlas.

---

## 2. Autenticación y permisos

**La subida ocurre en una ruta pública.** `POST /api/auth/register` **no lleva token**: es la primera vez en el proyecto que un archivo entra al bucket sin autenticación detrás. Solo se manda:

```
Content-Type: multipart/form-data
Accept: application/json
```

La **lectura** de las dos claves ocurre dentro de recursos que sí exigen el token JWT del login:

```
Authorization: Bearer {token}
Accept: application/json
```

Sin token, o con uno expirado, la respuesta es **401**:

```json
{ "statusCode": 401, "message": "El token de sesión no es válido o ha expirado", "data": null }
```

| Acción | `administrator` | `carrier` | `pilot` | `manager` | Sin autenticar |
|---|:--:|:--:|:--:|:--:|:--:|
| **Subir** los documentos (`POST /api/auth/register`) | — | — | ✅ | — | ✅ (es el alta) |
| Ver **los propios** (`login`, `check-status`) | ✅ | ✅ | ✅ | ✅ | 401 |
| Ver los de **cualquier piloto** (`GET /api/pilots`) | ✅ | ✅ (solo su empresa) | 403 | ✅ | 401 |
| Ver los del piloto de un **viaje** (`GET /api/trips/{trip}`) | ✅ | ✅ | ✅ (solo sus viajes) | ✅ | 401 |
| **Reemplazar** un documento | ❌ no existe | ❌ | ❌ | ❌ | ❌ |

Sobre la columna de subir: solo se registran con rol `pilot` o `carrier` (los otros dos roles no pueden autoregistrarse), y **solo el `pilot` sube documentos**. Un `carrier` que los adjunte los ve descartados.

`GET /api/pilots` lleva además el middleware `carrier.required`, así que un `carrier` que todavía no ha registrado su empresa recibe **403**:

```json
{ "statusCode": 403, "message": "Debes estar vinculado a un transportista para acceder a este recurso", "data": null }
```

Un rol sin permiso recibe **403**:

```json
{ "statusCode": 403, "message": "No tienes permisos para acceder a este recurso", "data": null }
```

---

## 3. Las dos claves de lectura

No hay un objeto `PilotDocument` en la API: **la tabla no se expone**. Las dos fotos viajan como claves planas dentro de tres recursos que ya existían, siempre en camelCase.

| Recurso | Dónde sale | Nombres de las claves | Claves totales |
|---|---|---|---|
| `User` | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/check-status` | `dpiImage`, `licenseImage` | 8 → **10** |
| `Pilot` | `GET /api/pilots` | `dpiImage`, `licenseImage` | 7 → **9** |
| `Trip` | `GET /api/trips/{trip}` y los otros seis endpoints que pintan el detalle | **`pilotDpiImage`**, **`pilotLicenseImage`** | 32 → **34** |

**En `Trip` van prefijadas** porque ahí conviven cuatro entidades (cliente, naviera, piloto y vehículo) y un `dpiImage` suelto no diría de quién es. Están junto a `pilotId` y `pilotName`, y conviven con el `vehicleImage` que ya existía.

### `User` — las 10 claves, en este orden

```json
{
  "id": 12,
  "name": "Carlos Ramírez",
  "email": "piloto@legumex.com",
  "role": "pilot",
  "carrierId": 4,
  "carrierName": "Transportes del Norte",
  "carrierCode": "A1B2C3",
  "emailVerifiedAt": null,
  "dpiImage": "https://bucket.s3.amazonaws.com/pilot-documents/9f3a2c1d-8b4e-4a70-9c21-5d6e7f801a2b.jpg",
  "licenseImage": "https://bucket.s3.amazonaws.com/pilot-documents/1c07f4d9-2e35-4b18-8a6f-3b9c0d1e2f34.png"
}
```

### `Pilot` — las 9 claves, en este orden

```json
{
  "id": 12,
  "name": "Carlos Ramírez",
  "email": "piloto@legumex.com",
  "carrierId": 4,
  "carrierName": "Transportes del Norte",
  "salary": "4500.00",
  "joinedAt": "04-08-2026 10:15:00 AM",
  "dpiImage": "https://bucket.s3.amazonaws.com/pilot-documents/9f3a2c1d-8b4e-4a70-9c21-5d6e7f801a2b.jpg",
  "licenseImage": "https://bucket.s3.amazonaws.com/pilot-documents/1c07f4d9-2e35-4b18-8a6f-3b9c0d1e2f34.png"
}
```

### `Trip` — el fragmento del piloto

```json
{
  "pilotId": 12,
  "pilotName": "Carlos Ramírez",
  "pilotDpiImage": "https://bucket.s3.amazonaws.com/pilot-documents/9f3a2c1d-8b4e-4a70-9c21-5d6e7f801a2b.jpg",
  "pilotLicenseImage": "https://bucket.s3.amazonaws.com/pilot-documents/1c07f4d9-2e35-4b18-8a6f-3b9c0d1e2f34.png",
  "vehicleId": 8,
  "vehiclePlate": "P-1234ABC",
  "vehicleImage": "https://bucket.s3.amazonaws.com/vehicles/9f1c2b7a-3d4e-4f10-9a2b-7c8d5e6f0a1b.png"
}
```

### Campo por campo

| Campo | Tipo | Notas |
|---|---|---|
| `dpiImage` / `pilotDpiImage` | `string \| null` | URL **absoluta y pública** de la foto del anverso del DPI. Lista para usar como `src`. Nunca es la key interna del objeto: no la compongas ni la derives a mano. |
| `licenseImage` / `pilotLicenseImage` | `string \| null` | Ídem, para el anverso de la licencia. |

**Las dos van siempre juntas.** No existe una fila con una sola foto: si una trae URL, la otra también; si una es `null`, la otra también. Puedes tratarlas como un par.

**Los motivos de `null`, que el frontend no puede distinguir desde la respuesta:**

- En `User` y en `Pilot`: el usuario no es piloto, o es un piloto registrado antes de esta versión.
- En `Trip` hay **tres** motivos y conviene mirar `pilotId` para separarlos:
  - `pilotId` es `null` → el viaje sigue en la bolsa, nadie lo ha tomado.
  - `pilotId` trae valor y las dos fotos son `null` → el piloto asignado es anterior a esta versión.

El viaje **no guarda copia** del documento: la URL se resuelve desde el piloto, así que es exactamente la misma que devuelve `GET /api/pilots`.

### Dónde **no** aparecen

- **`GET /api/carriers/me/pilots`** — sigue con sus **cuatro claves** de siempre (`id`, `name`, `email`, `joinedAt`), sin `salary` y con `joinedAt` en **ISO 8601**. Es un recurso distinto a propósito. Cruzable con `GET /api/pilots` por `id`.
- **`GET /api/trips`** (el listado) — sigue con sus **15 claves**. Del piloto solo pinta `pilotName`. Para las fotos hay que pedir el detalle.
- **El token JWT** — sigue llevando los mismos **siete claims** (`id`, `name`, `email`, `role`, `carrierId`, `carrierName`, `carrierCode`). Ninguna URL de documento entra en el payload: no las busques ahí.

### Formato de fechas

Ojo con la convención mixta, que no cambia con esta versión:

- `joinedAt` de `Pilot` y todas las fechas de `Trip` usan el formato propio **`d-m-Y h:i:s A`** (`04-08-2026 10:15:00 AM`), **no ISO 8601**. Parsearlas como ISO falla.
- `emailVerifiedAt` de `User` **sí** es ISO 8601 (`2026-07-31T10:15:00.000000Z`).

### Tipos TypeScript sugeridos

```ts
/** Las dos fotos del piloto. Van siempre juntas: o las dos con URL, o las dos en null. */
export interface PilotDocumentUrls {
  dpiImage: string | null;
  licenseImage: string | null;
}

export type UserRole = 'administrator' | 'carrier' | 'pilot' | 'manager';

export interface User extends PilotDocumentUrls {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  carrierId: number | null;
  carrierName: string | null;
  carrierCode: string | null;
  /** ISO 8601. null mientras la cuenta no esté confirmada. */
  emailVerifiedAt: string | null;
}

export interface Pilot extends PilotDocumentUrls {
  /** Es el user_id del piloto, NO el id de la fila pivote. */
  id: number;
  name: string | null;
  email: string | null;
  carrierId: number;
  carrierName: string | null;
  /** Mensual, en GTQ, como cadena con dos decimales. null = sin asignar, no "gana cero". */
  salary: string | null;
  /** Formato d-m-Y h:i:s A, NO ISO 8601. */
  joinedAt: string | null;
}

/** El fragmento del piloto dentro de Trip: prefijado, porque el recurso mezcla cuatro entidades. */
export interface TripPilotFields {
  pilotId: number | null;
  pilotName: string | null;
  pilotDpiImage: string | null;
  pilotLicenseImage: string | null;
}

/** El cuerpo del registro. Va en FormData, nunca en JSON, cuando role es 'pilot'. */
export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role: 'pilot' | 'carrier';
  /** Obligatorios si role === 'pilot'. Los dos o ninguno. Ignorados para 'carrier'. */
  dpi?: File;
  license?: File;
}
```

---

## 4. Subir los documentos: `POST /api/auth/register`

**Ruta pública, sin token.** El endpoint es el mismo de siempre; lo que cambia es el formato del cuerpo y los dos campos nuevos.

### El cuerpo va en `multipart/form-data`

```ts
const body = new FormData();
body.append('name', 'Carlos Ramírez');
body.append('email', 'piloto@legumex.com');
body.append('password', 'secret123');
body.append('password_confirmation', 'secret123');
body.append('role', 'pilot');
body.append('dpi', dpiFile);        // File, obligatorio para pilot
body.append('license', licenseFile); // File, obligatorio para pilot

await fetch('/api/auth/register', {
  method: 'POST',
  headers: { Accept: 'application/json' }, // NO pongas Content-Type: lo pone el navegador con su boundary
  body,
});
```

> **No fijes `Content-Type` a mano.** El navegador tiene que añadir el `boundary` del multipart; ponerlo tú rompe la petición.

### Reglas campo por campo

| Campo | Obligatorio | Reglas |
|---|---|---|
| `name` | Sí | Texto, máx. 255 |
| `email` | Sí | Formato email, máx. 255, **único** |
| `password` | Sí | Mín. 8 caracteres, debe coincidir con `password_confirmation` |
| `password_confirmation` | Sí | Repetición exacta de `password` |
| `role` | Sí | `pilot` o `carrier` — los otros dos roles no pueden autoregistrarse |
| `dpi` | **Solo si `role` es `pilot`** | Debe ser una **imagen**, `jpg`/`jpeg`/`png`, **máx. 3 MB** (3072 KB) |
| `license` | **Solo si `role` es `pilot`** | Idénticas a `dpi` |

Notas sobre los dos archivos:

- **La regla `image` va además de `mimes`**, así que un PDF renombrado a `.jpg` se rechaza con 422: se mira el contenido, no la extensión del nombre.
- **No se procesa la imagen.** Sin recorte, sin redimensionado, sin recompresión y sin marca de agua: el archivo queda en el bucket **byte por byte** tal como se sube. Un DPI recortado a un cuadrado sería ilegible, y por eso no se toca. Si quieres bajar el peso antes de subir, hazlo tú en el cliente.
- **No se aceptan PDF**, a diferencia de la factura de un gasto de vehículo. Solo fotos.

### Respuestas

**201 — creado.** Mensaje literal: `Hemos enviado instrucciones a tu correo electronico` *(así, sin tilde en «electronico»: es el literal que devuelve la API).*

```json
{
  "statusCode": 201,
  "message": "Hemos enviado instrucciones a tu correo electronico",
  "data": {
    "id": 12,
    "name": "Carlos Ramírez",
    "email": "piloto@legumex.com",
    "role": "pilot",
    "carrierId": null,
    "carrierName": null,
    "carrierCode": null,
    "emailVerifiedAt": null,
    "dpiImage": "https://bucket.s3.amazonaws.com/pilot-documents/9f3a....jpg",
    "licenseImage": "https://bucket.s3.amazonaws.com/pilot-documents/1c07....png"
  }
}
```

La respuesta **ya trae las dos URLs listas**: no hace falta un segundo GET para pintarlas.

El resto del alta no cambia: la cuenta nace **sin confirmar** (`emailVerifiedAt: null`), **no se devuelve token**, y se envía el código de confirmación de 6 dígitos con una hora de vigencia. Subir los documentos **no confirma nada**: la cuenta se activa igual que siempre, con `POST /api/auth/confirm-account`.

**422 — validación.** Formato de Laravel, **distinto del sobre**:

```json
{
  "message": "La foto del DPI es obligatoria para los pilotos (and 1 more error)",
  "errors": {
    "dpi": ["La foto del DPI es obligatoria para los pilotos"],
    "license": ["La foto de la licencia es obligatoria para los pilotos"]
  }
}
```

Cuando hay 422, **no se crea el usuario y no se sube ningún archivo**.

**Si el registro falla después de subir** (un fallo de base de datos, por ejemplo), los dos objetos se borran del bucket y se devuelve el error. No quedan archivos huérfanos y el usuario no se crea.

---

## 5. Formato de las respuestas

### Éxito

```json
{ "statusCode": 200, "message": "…", "data": { } }
```

### Listado sin paginar (`GET /api/pilots` sin `limit`)

```json
{
  "statusCode": 200,
  "message": "Pilotos obtenidos correctamente",
  "data": [ { "id": 12, "…": "…", "dpiImage": "https://…", "licenseImage": "https://…" } ]
}
```

### Listado paginado (`GET /api/pilots?limit=10`)

Los metadatos salen **aplanados en la raíz** del sobre, no bajo `meta`:

```json
{
  "statusCode": 200,
  "message": "Pilotos obtenidos correctamente",
  "data": [ ],
  "total": 42,
  "currentPage": 1,
  "lastPage": 5
}
```

`limit` se acota a la horquilla `[10, 100]`; un `limit` no numérico se ignora y devuelve la lista entera.

### Error de negocio (401, 403, 404, 400)

```json
{ "statusCode": 403, "message": "No tienes permisos para acceder a este recurso", "data": null }
```

### Error de validación (422) — **formato distinto**

```json
{ "message": "…", "errors": { "campo": ["…"] } }
```

---

## 6. Dónde se leen los documentos

Ningún endpoint es nuevo. Estos son los tres sitios donde aparecen las claves.

### 6.1 `POST /api/auth/login` y `GET /api/auth/check-status`

El piloto ve **sus propios** documentos en cada inicio de sesión. `data` trae `{ user, token, refreshToken }`, y `user` es el objeto `User` de 10 claves.

- `login` → **200**, mensaje `Sesión iniciada correctamente`
- `check-status` → **200**, mensaje `Sesión válida` (exige token)

Las URLs son **las mismas** que devolvió el registro.

### 6.2 `GET /api/pilots` — listado de administración

Devuelve el objeto `Pilot` de 9 claves por elemento. Mensaje: `Pilotos obtenidos correctamente`.

- **Roles:** `carrier`, `administrator`, `manager`. Un `pilot` recibe **403**.
- Lleva `carrier.required`: un `carrier` sin empresa recibe 403.
- **Ámbito:** `administrator` y `manager` ven todas las empresas y pueden filtrar con `?carrierId=`; a un `carrier` ese filtro **se le ignora** y solo ve los suyos.
- **Query params:** `carrierId` (solo surte efecto para `administrator` y `manager`), `limit` (opcional, `[10, 100]`).
- **No se puede filtrar ni buscar por documentos.** No existe `?hasDocuments=` ni nada equivalente.
- El listado carga los documentos con **una sola consulta** independientemente del número de pilotos: no hay penalización por pedir la lista entera.

Los otros dos endpoints del dominio de pilotos (`PATCH /api/pilots/{pilot}/salary` y `GET /api/pilots/{pilot}/salary-history`) **no cambian** y no tienen nada que ver con los documentos.

### 6.3 `GET /api/trips/{trip}` — detalle del viaje

Devuelve el objeto `Trip` de 34 claves, con `pilotDpiImage` y `pilotLicenseImage`. Mensaje: `Viaje obtenido correctamente`.

Las dos claves salen en **todos los endpoints que pintan el detalle del viaje** (crear, editar, asignar, arrancar, cerrar, eliminar), no solo en el GET. **No salen en `GET /api/trips`**, el listado.

---

## 7. Mensajes de error (literales)

Copiados del `RegisterRequest` y de los middlewares y servicios implicados. Se pueden mostrar tal cual.

### Validación del registro (422, bajo `errors.<campo>`)

| Campo | Situación | Mensaje |
|---|---|---|
| `dpi` | Falta y `role` es `pilot` | `La foto del DPI es obligatoria para los pilotos` |
| `dpi` | No es una imagen (PDF renombrado, etc.) | `La foto del DPI debe ser una imagen` |
| `dpi` | Tipo no permitido | `La foto del DPI debe ser un archivo jpg, jpeg o png` |
| `dpi` | Más de 3 MB | `La foto del DPI no puede superar los 3 MB` |
| `license` | Falta y `role` es `pilot` | `La foto de la licencia es obligatoria para los pilotos` |
| `license` | No es una imagen | `La licencia debe ser una imagen` |
| `license` | Tipo no permitido | `La licencia debe ser un archivo jpg, jpeg o png` |
| `license` | Más de 3 MB | `La foto de la licencia no puede superar los 3 MB` |
| `role` | Falta | `El rol es obligatorio` |
| `role` | No es `pilot` ni `carrier` | `El rol debe ser piloto o transportista` |
| `email` | Ya existe | `El correo ya está registrado` |
| `email` | Formato inválido | `El correo no tiene un formato válido` |
| `password` | Menos de 8 caracteres | `La contraseña debe tener al menos 8 caracteres` |
| `password` | No coincide la confirmación | `La confirmación de la contraseña no coincide` |
| `name` | Falta | `El nombre es obligatorio` |

### Errores de negocio (en el sobre, con su `statusCode`)

| Código | Cuándo | Mensaje |
|---|---|---|
| 401 | Sin token o con token expirado, en cualquier ruta de lectura | `El token de sesión no es válido o ha expirado` |
| 403 | Rol sin permiso (por ejemplo un `pilot` en `GET /api/pilots`) | `No tienes permisos para acceder a este recurso` |
| 403 | `carrier` sin empresa registrada en `GET /api/pilots` | `Debes estar vinculado a un transportista para acceder a este recurso` |

---

## 8. Checklist de implementación en el frontend

- [ ] **Cambiar el registro a `FormData`.** Sin esto, todo alta de piloto devuelve 422 desde el primer despliegue. Coordinar el despliegue con backend.
- [ ] **No fijar `Content-Type` a mano** en la petición de registro: dejar que el navegador ponga el `boundary`.
- [ ] Añadir al formulario de registro **dos campos de archivo** visibles solo cuando el rol elegido es `pilot`, con `accept="image/jpeg,image/png"`.
- [ ] **Validar en cliente antes de subir**: tipo (`jpg`/`jpeg`/`png`) y tamaño (≤ 3 MB), para no gastar una subida de 6 MB en un 422 evitable.
- [ ] **Exigir los dos archivos juntos** en la validación del formulario: mandar uno solo es 422.
- [ ] Mostrar los mensajes de `errors.dpi` y `errors.license` **en su campo**, no en un banner genérico.
- [ ] Recordar que el 422 tiene forma `{ message, errors }` y el resto `{ statusCode, message, data }`.
- [ ] Pintar `dpiImage` y `licenseImage` **directamente como `src`**: son URLs absolutas y públicas.
- [ ] **Manejar el `null` como estado normal**, no como error: «Sin documentos registrados». Afecta a todos los pilotos anteriores a esta versión.
- [ ] En el detalle del viaje, usar **`pilotDpiImage`/`pilotLicenseImage`** (prefijadas), y distinguir con `pilotId` si el `null` es «viaje en la bolsa» o «piloto sin documentos».
- [ ] **No construir ninguna pantalla de reemplazo o corrección de documentos**: no hay API. Si el usuario lo pide, es una solicitud a soporte.
- [ ] **No construir pantalla de verificación/aprobación** de documentos: no existe ese estado.
- [ ] **No esperar las fotos en `GET /api/carriers/me/pilots` ni en `GET /api/trips`**: hay que ir a `GET /api/pilots` o al detalle del viaje.
- [ ] **No leer las URLs del token JWT**: no están ahí.
- [ ] Si generas cliente por codegen desde el OpenAPI: **`dpi` y `license` figuran como opcionales** porque OpenAPI 3.0 no sabe expresar `required_if`. La regla «obligatorios para `pilot`, los dos o ninguno» **la tienes que imponer tú** en el formulario; el servidor la impone de todas formas con 422.
- [ ] Verificar con backend que `upload_max_filesize` y `post_max_size` son ≥ 4M en cada entorno. Si PHP corta antes, el usuario ve un error de «campo obligatorio» confuso en vez de uno de tamaño.

---

## 9. Lo que este dominio **no** hace (para no diseñarlo en el front)

- **No permite reemplazar ni corregir un documento.** Ni endpoint, ni ruta, ni campo en ningún `PATCH` existente. Se arregla fuera de la aplicación.
- **No añade ninguna ruta.** No existe `GET /api/pilots/{pilot}/documents` ni ningún otro acceso: las URLs solo viajan dentro de los tres recursos.
- **No guarda el reverso** del DPI ni de la licencia. Solo el anverso de cada uno.
- **No guarda ningún dato que no sea la foto:** ni número de DPI, ni número de licencia, ni tipo de licencia, ni fecha de emisión, ni **fecha de vencimiento**. No hay forma de saber si una licencia está caducada.
- **No verifica ni aprueba nada.** No hay `verifiedAt`, no hay estado «pendiente de revisión» y el administrador no revisa las fotos. El único requisito para activar la cuenta sigue siendo el código de 6 dígitos.
- **No bloquea nada por falta de documentos.** Login, unirse a una empresa, cobrar salario y arrancar y cerrar viajes funcionan igual sin ellos.
- **No hubo backfill.** Los pilotos anteriores a esta versión siguen con las dos claves en `null` para siempre, salvo que se les cree la fila a mano.
- **No procesa la imagen:** sin recorte, sin redimensionado, sin recompresión y sin marca de agua.
- **No acepta PDF.** Solo `jpg`, `jpeg` y `png`.
- **No borra los archivos.** No existe baja de usuario en el proyecto, así que nada retira estos objetos del bucket.
- **No usa URLs firmadas ni con caducidad.** Son públicas y permanentes: quien tenga el enlace abre el documento sin autenticarse. Es una decisión consciente, el mismo modelo que la imagen del vehículo y la factura del gasto. Las keys son UUID, así que no son adivinables, pero **no son secretas**.
- **No permite filtrar ni buscar por documentos** en ningún listado.
- **No lleva bitácora.** No se registra quién subió qué ni cuándo; los `timestamps` de la fila son todo el rastro.
- **No toca `GET /api/carriers/me/pilots` ni el listado `GET /api/trips`.** Los dos siguen exactamente con las claves que tenían.
