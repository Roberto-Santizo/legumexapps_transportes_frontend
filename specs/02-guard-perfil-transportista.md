# SPEC 02 — Guard de perfil de transportista

> **Estado:** Aprobado
> **Depende de:** SPEC 01 (panel administrativo: sidebar y header)
> **Fecha:** 2026-08-04
> **Objetivo:** Impedir que un usuario con rol `carrier` y sin transportista asociado use el panel, redirigiéndolo a `/completar-perfil`, una pantalla propia a pantalla completa donde más adelante creará su transportista.

---

## Por qué existe esta spec

`UserSchema` ya expone `carrierId`, `carrierName` y `carrierCode`, los tres `nullable`. Un usuario que se registra con rol `carrier` entra al sistema con los tres en `null`: tiene sesión, pero no tiene transportista. Hoy ese usuario aterriza en `/dashboard` como cualquier otro y todo lo que vea a partir de ahí estará colgando de un `carrierId` que no existe.

Esta spec cierra ese hueco por el lado de la navegación. **No** construye la creación del transportista: eso es otra spec. Aquí se define únicamente el guard, la ruta destino, el contrato de datos del formulario y la carcasa de la pantalla.

---

## Alcance

**Dentro:**

- Guard en `ProtectedLayout`: si el usuario en sesión tiene `role === "carrier"` y `carrierId === null`, redirige a `/completar-perfil` con `replace`.
- Ruta nueva `/completar-perfil`, registrada en `src/router.tsx` **fuera** de `ProtectedLayout` y fuera de `PublicLayout`.
- Feature nueva `src/features/carriers/` en versión parcial: solo `domain/types` y `presentation/screens`, con sus barrels.
- Tipo `CarrierForm` con la forma completa del formulario (`name` e `image`), aunque esta spec solo renderice uno de los dos campos.
- Pantalla `CompleteProfile.tsx` a pantalla completa, con el campo **Nombre** funcionando sobre `react-hook-form` y un botón de envío deshabilitado.
- Guard inverso dentro de `CompleteProfile`: sin sesión → `/login`; con sesión pero rol distinto de `carrier`, o con `carrierId` ya asignado → `/dashboard`.
- Acción **Cerrar sesión** en la pantalla, que despacha `logout()`.

**Fuera de alcance (para specs futuras):**

- Toda la lógica de creación del transportista: schema zod de respuesta, datasource, repository, provider, `useMutation`, notificaciones de éxito/error, y el refresco del usuario en Redux tras crear.
- El campo de imagen y el componente `FileFormField`. **El usuario los construye manualmente por fuera de esta spec.**
- Validación del campo `image` y su regla `required`.
- Pantallas de listado, edición y detalle de transportistas.
- Endurecer `UserSchema.role` de `z.string()` al union `UserRole`.
- Guard por rol para el resto de rutas protegidas (sigue pendiente desde SPEC 01).
- Cualquier cambio a `NAVIGATION` o al sidebar.

---

## Modelo de datos

No hay entidades nuevas ni llamadas a API. Un tipo y una constante de ruta.

**Prerrequisito ya aplicado.** `src/features/auth/domain/schemas/schemas.ts` ya incluye los tres campos en el árbol de trabajo (cambio sin commitear). Esta spec lo da por hecho y no lo vuelve a tocar:

```ts
export const UserSchema = z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
    role: z.string(),
    carrierId: z.number().nullable(),
    carrierName: z.string().nullable(),
    carrierCode: z.string().nullable(),
});
```

**Tipo nuevo** — `src/features/carriers/domain/types/types.ts`:

```ts
export type CarrierForm = {
    name: string;
    image: File;
};
```

Se declara completo aunque el campo `image` no se renderice todavía. La spec de creación no tiene que redefinir el contrato: lo consume tal cual.

**Condición del guard.** La verdad es `carrierId`:

```ts
const needsCarrierProfile = user?.role === "carrier" && user.carrierId === null;
```

`carrierName` y `carrierCode` se tratan como derivados: si hay `carrierId`, hay transportista. No se evalúan en el guard.

**Persistencia:** ninguna clave nueva. Sigue vigente solo lo de SPEC 01 (`SIDEBAR_COLLAPSED`) y `AUTH_TOKEN`.

---

## Ruta y estructura de archivos

`/completar-perfil` cuelga directo de `<Routes>`, sin layout padre:

```tsx
<Route element={<PublicLayout />}>…</Route>

<Route path="/completar-perfil" element={<CompleteProfile />} />

<Route element={<ProtectedLayout />}>
    <Route path="/dashboard" element={<Dashboard />} />
</Route>
```

Que esté fuera de `ProtectedLayout` es lo que evita el bucle: el guard que redirige a `/completar-perfil` nunca corre dentro de `/completar-perfil`.

Árbol de la feature parcial:

```
src/features/carriers/
├── carriers.ts                              export * from './domain/domain'
│                                            export * from './presentation/presentation'
├── domain/
│   ├── domain.ts
│   └── types/
│       └── types.ts                         CarrierForm
└── presentation/
    ├── presentation.ts
    └── screens/
        ├── screens.ts
        └── CompleteProfile.tsx
```

No se crean `infrastructure/`, `datasources/`, `repositories/`, `providers/` ni `schemas/`. La spec de creación los agrega en su sitio siguiendo el esqueleto de `src/references/[feature-name]`.

---

## Pantalla `/completar-perfil`

Reusa la composición de dos columnas de `Login` y `Register`, con la columna oscura de marca a la izquierda (`bg-ink-deep`) y el formulario a la derecha. Sin sidebar, sin header, sin campana ni menú de usuario: el usuario todavía no tiene panel que navegar. Utiliza la skill /frontend-design para la creación.

```
┌──────────────────────────┬──────────────────────────┐
│  Legumex · Transportes   │                          │
│                          │   Completa tu perfil     │
│  Antes de operar,        │   copy de una línea      │
│  registra tu             │                          │
│  transportista.          │   [ Nombre            ]  │
│                          │                          │
│                          │   [ Guardar (disabled) ] │
│  Control Interno         │        Cerrar sesión     │
└──────────────────────────┴──────────────────────────┘
```

- **Título:** `Title` con `title="Completa tu perfil"` y un subtítulo que explique que hace falta registrar el transportista antes de continuar.
- **Campo Nombre:** `TextFormField<CarrierForm>` con `name="name"`, `register`, `errorMessage={errors.name?.message}` y `validation={{ required: "Ingresa el nombre del transportista" }}`.
- **Campo Imagen:** no se renderiza. Queda un comentario `{/* TODO: campo de imagen — spec de creación */}` en el punto exacto donde va.
- **Botón:** `CustomFilledButton` con `type="submit"`, `fullWitdh` y `disabled`. Está deshabilitado a propósito porque todavía no hay a dónde enviar.
- **`onSubmit`:** recibe `CarrierForm` y no hace nada. Sin `useMutation`, sin provider, sin `useNotification`.
- **Cerrar sesión:** enlace/botón discreto bajo el formulario que despacha `logout()`. La redirección a `/login` la produce el propio guard inverso al quedar `isSignedIn` en `false`.

Sin paleta ni tipografías nuevas: los mismos tokens de SPEC 01 (`canvas`, `surface`, `ink`, `ink-deep`, `ink-muted`, `ink-subtle`, `line`, `font-display`, `font-sans`, `font-mono`).

---

## Plan de implementación

1. **Feature parcial `carriers`.** Crear el árbol de `src/features/carriers/` con `CarrierForm` en `domain/types/types.ts` y los cuatro barrels (`carriers.ts`, `domain/domain.ts`, `presentation/presentation.ts`, `presentation/screens/screens.ts`). `CompleteProfile.tsx` arranca como un componente que devuelve un `<div />` vacío, solo para que el barrel exporte algo compilable. Verificación: `npm run build` compila y `import { type CarrierForm } from "@/features/carriers/carriers"` resuelve.

2. **Registrar la ruta.** Agregar `/completar-perfil` a `src/router.tsx` como `<Route>` suelto entre el bloque de `PublicLayout` y el de `ProtectedLayout`. Verificación: entrar a la URL a mano renderiza el componente vacío, sin sidebar ni header.

3. **Guard en `ProtectedLayout`.** Leer `state.auth.user` junto al `isSignedIn` que ya se lee. Después del `if (!isSignedIn) return <Navigate to={'/login'} />`, agregar el segundo guard: si `user?.role === "carrier" && user.carrierId === null`, devolver `<Navigate to={'/completar-perfil'} replace />`. Verificación: con un usuario `carrier` sin `carrierId`, entrar a `/dashboard` aterriza en `/completar-perfil`; con un usuario `administrator`, `/dashboard` se ve normal.

4. **Guard inverso en `CompleteProfile`.** Al inicio del componente, leer `isSignedIn` y `user` del store. Si no hay sesión → `<Navigate to={'/login'} replace />`. Si hay sesión y (`role !== "carrier"` o `carrierId !== null`) → `<Navigate to={'/dashboard'} replace />`. Verificación: un administrador que escribe `/completar-perfil` termina en `/dashboard`, y un usuario sin sesión termina en `/login`.

5. **Carcasa visual de la pantalla.** Reemplazar el `<div />` por el layout de dos columnas descrito arriba: columna de marca con `StaggerContainer`/`StaggerItem`, columna de formulario con `FadeInUp`, `CustomForm` y `Title`. Todavía sin campos. Verificación: la pantalla se ve completa en desktop y colapsa a una sola columna en móvil.

6. **Campo Nombre y botón.** Montar `useForm<CarrierForm>()`, el `TextFormField` de `name` con su validación de requerido, el `CustomFilledButton` deshabilitado, y el comentario `TODO` donde irá el campo de imagen. `onSubmit` tipado como `(data: CarrierForm) => void` sin cuerpo. Verificación: el campo acepta texto, el botón no se puede pulsar, y `npm run lint` no reporta variables sin usar.

7. **Acción de cerrar sesión.** Botón bajo el formulario que despacha `logout()` con `useDispatch`. Verificación: pulsarlo deja `localStorage` sin `AUTH_TOKEN` y lleva a `/login`.

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores ni warnings nuevos.
- [ ] Un usuario con `role === "carrier"` y `carrierId === null` que entra a `/dashboard` termina en `/completar-perfil`.
- [ ] Ese mismo usuario, al pulsar Atrás en el navegador, no vuelve a `/dashboard` (la redirección usa `replace`).
- [ ] Un usuario con `role === "carrier"` y `carrierId` no nulo entra a `/dashboard` con normalidad, aunque `carrierName` o `carrierCode` sean `null`.
- [ ] Un usuario con rol `administrator` o `pilot` entra a `/dashboard` con normalidad aunque tenga `carrierId` en `null`.
- [ ] Un usuario con rol `administrator` que escribe `/completar-perfil` termina en `/dashboard`.
- [ ] Un usuario `carrier` que ya tiene `carrierId` y escribe `/completar-perfil` termina en `/dashboard`.
- [ ] Sin sesión iniciada, `/completar-perfil` redirige a `/login`.
- [ ] `/completar-perfil` no muestra sidebar ni header administrativo.
- [ ] La pantalla muestra un único campo de formulario, **Nombre**.
- [ ] Dejar Nombre vacío y enviar muestra el mensaje "Ingresa el nombre del transportista".
- [ ] El botón de envío está deshabilitado y no dispara ninguna petición HTTP.
- [ ] "Cerrar sesión" deja `localStorage` sin `AUTH_TOKEN` y lleva a `/login`.
- [ ] `src/features/carriers/` no contiene carpetas `infrastructure/`, `datasources/`, `repositories/`, `providers/` ni `schemas/`.
- [ ] `CarrierForm` declara `name: string` e `image: File`, e importarlo desde `@/features/carriers/carriers` compila.
- [ ] No existe un componente `FileFormField` creado por esta spec.
- [ ] En un viewport de 375px la pantalla se ve en una sola columna sin scroll horizontal.

---

## Decisiones

- **Sí:** la condición es `role === "carrier" && carrierId === null`. Una sola fuente de verdad.
- **No:** evaluar los tres campos. Si el backend devuelve un transportista sin código, el usuario quedaría atrapado en el formulario para siempre.
- **Sí:** guard dentro de `ProtectedLayout`. Un solo dueño, y cubre automáticamente toda ruta protegida que se agregue después.
- **No:** hook `useCarrierGuard` invocado por cada pantalla. Se olvida en la siguiente pantalla nueva.
- **No:** componente `CarrierGuard` envolviendo a `ProtectedLayout`. Un nivel más de anidamiento en el router para dos líneas de lógica.
- **Sí:** `/completar-perfil` fuera de `ProtectedLayout`, a pantalla completa. El usuario no tiene módulos que usar; enseñarle un sidebar inerte es ruido, y sacar la ruta del layout elimina el riesgo de bucle de redirección por construcción.
- **No:** modal bloqueante sobre el dashboard. No se puede enlazar ni recargar en ese estado.
- **Sí:** path `/completar-perfil`. Es un estado de onboarding, no un CRUD.
- **No:** `/transportistas/crear`. Implicaría un listado `/transportistas` que todavía no existe.
- **Sí:** feature `carriers` parcial, solo con `domain/types` y `presentation/screens`. La spec de creación rellena el esqueleto en su sitio.
- **No:** correr `new-feature-scaffold` completo ahora. Generaría datasource, repository y provider muertos que la otra spec tendría que reescribir.
- **No:** meter la pantalla en la feature `auth`. Un transportista es entidad de negocio, no de sesión.
- **Sí:** declarar `CarrierForm` completo con `image: File` aunque el campo no se renderice. Fija el contrato ahora y evita renegociarlo después.
- **Sí:** solo el campo Nombre en esta spec. El campo de imagen y su componente los construye el usuario manualmente.
- **No:** crear `FileFormField` aquí. Decisión explícita del usuario.
- **Sí:** botón de envío deshabilitado. Comunica que la pantalla está incompleta sin fingir que funciona.
- **No:** botón habilitado con `onSubmit` vacío. Un clic sin efecto se lee como bug.
- **Sí:** acción de cerrar sesión en la pantalla. Sin ella, un `carrier` sin transportista queda encerrado sin más salida que borrar `localStorage` a mano.
- **Sí:** guard inverso en la propia pantalla. La ruta solo es alcanzable en el estado que la justifica.

---

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| El guard depende de que `state.auth.user` esté hidratado. Si `AppInitializer` falla o el backend no devuelve `carrierId`, `user` queda `undefined` y el guard no dispara. | El operador opcional (`user?.role`) hace que ausencia de usuario signifique "no redirigir". Falla hacia el comportamiento actual, no hacia un bucle. |
| `UserSchema.role` es `z.string()`, no el union `UserRole`. Un typo en el literal `"carrier"` no lo detecta TypeScript. | Se compara contra el literal en un solo lugar del código. Endurecer el schema al union queda fuera de alcance y merece su propia spec. |
| El `useEffect` de `AppInitializer` no tiene arreglo de dependencias y se re-ejecuta en cada render, disparando `checkStatus()` repetidamente. Es un bug preexistente, pero el guard ahora depende de ese usuario. | Fuera de alcance en esta spec. Se documenta para corregirlo aparte; el guard funciona igual porque solo lee el estado ya hidratado. |
| La pantalla no ofrece forma de crear el transportista hasta que llegue la spec de creación: un `carrier` real queda bloqueado. | El botón deshabilitado y el copy lo hacen evidente, y "Cerrar sesión" le da salida. La spec de creación es la continuación inmediata. |
| Si mañana `/completar-perfil` se moviera dentro de `ProtectedLayout`, el guard entraría en bucle infinito. | Está escrito en las decisiones: la ruta vive fuera del layout protegido y esa es la condición que evita el bucle. |

---

## Lo que **no** entra en esta spec

- La creación real del transportista (datasource, repository, provider, mutation, refresco del usuario).
- El campo de imagen y el componente `FileFormField`.
- Listado, edición y detalle de transportistas.
- Endurecer `UserSchema.role` al union `UserRole`.
- El guard por rol de las demás rutas protegidas.
- Arreglar el `useEffect` sin dependencias de `AppInitializer`.

Cada uno de esos, si entra, va en su propia spec.
