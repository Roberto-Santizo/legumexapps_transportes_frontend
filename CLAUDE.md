# CLAUDE.md

Guía para Claude Code en este repositorio.

## Proyecto

Frontend de LegumexApps Transportes: React 19 + TypeScript + Vite 8, Tailwind CSS v4, Redux Toolkit, TanStack Query, React Router 7, react-hook-form, zod, MUI/Headless UI, framer-motion, recharts, lucide-react, react-select, react-dropzone, input-otp, `@vis.gl/react-google-maps` (autocompletado de lugares). React Compiler activo (`babel-plugin-react-compiler` vía `@rolldown/plugin-babel` en `vite.config.ts`).

UI y mensajes de error en **español**.

## Comandos

```bash
npm run build    # tsc -b && vite build  → validación principal
npm run lint     # eslint .
npm run preview
```

El servidor de desarrollo ya está corriendo; **no ejecutar `npm run dev`**. Para verificar cambios usar `npm run build` y `npm run lint`.

## Configuración

- Alias `@/*` → `./src/*` (declarado en `vite.config.ts` y `tsconfig.app.json`). Usar siempre imports con `@/`, no rutas relativas largas.
- `VITE_BASE_URL` en `.env` define el baseURL de axios.
- TS estricto de uso: `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax` (los tipos se importan con `import type`).

## Arquitectura

`src/config/` — infraestructura de app, con barrel propio (`import { type RootState } from "@/config/config"`): `http/axios.ts` (instancia axios + interceptor que inyecta `AUTH_TOKEN` de localStorage), `store/store.ts` (Redux, exporta `RootState`/`AppDispatch`), `query/queryClient.ts`, `initializer/AppInitializer.tsx` + `initializer/session.ts` (valida sesión con `authProvider.checkStatus()` antes de renderizar).

`src/features/<feature>/` — cada feature en capas:

```
domain/          datasources/ (clases abstractas), repositories/ (abstractas),
                 schemas/ (zod), types/ (z.infer + tipos *Form)
infrastructure/  datasources/*Impl.ts (axios + zod), repositories/*Impl.ts (delegan),
                 utils/ (payloads, query strings, mapeo de errores del backend, fechas)
presentation/    screens/, components/, providers/
```

Features con pantallas y rutas: `auth`, `dashboard`, `vehicles`, `fuel-prices`, `products`, `zones`, `locations`, `departure-points`, `accessories`, `clients`, `pilots`, `trips`, `carriers` (de esta última solo `/completar-perfil` está registrada).

Features de soporte, sin pantallas propias: `accessory-characteristics`, `freight-rates`, `places`, `vehicle-expenses` — exponen componentes (modales, campos, secciones) que se montan dentro de otras features.

`shared` es transversal (ver más abajo).

### Barrels

Todo se exporta por barrels y se importa desde el barrel raíz de la feature, nunca del archivo directo:

- hoja: `datasources/datasources.ts`, `schemas/schemas.ts`, `utils/utils.ts`, etc.
- capa: `domain/domain.ts`, `infrastructure/infrastructure.ts`, `presentation/presentation.ts`
- raíz: `<feature>/<feature>.ts`

Ejemplo: `import { authProvider, type LoginForm } from "@/features/auth/auth";` y `import { TextFormField, useNotification } from "@/features/shared/shared";`.

Al crear un archivo nuevo, agregar su línea `export * from './X'` en el barrel correspondiente o no será visible.

### Flujo de datos

`Screen → provider (singleton) → repository → datasource → axios`

- El **datasource** es el único que maneja errores: valida la respuesta con zod (`safeParse`) y en `catch` hace `if (isAxiosError(error)) throw new Error(error.response?.data.message); throw new Error("Error no controlado.")`. Si el parse falla: `throw new Error("Información no válida")`. Cuando la pantalla necesita el error original (status, `errors` de Laravel) se relanza con el error de axios en `cause`.
- El **repository** solo delega, sin try/catch.
- El **provider** envuelve el repository y se instancia al final de su propio archivo:
  ```ts
  const datasource = new XDatasourceImpl(api);
  const repository = new XRepositoryImpl(datasource);
  export const xProvider = new XProvider(repository);
  ```
- `infrastructure/utils/` concentra lo que no es I/O: construir el payload y el query string (los filtros vacíos no se mandan), traducir el error del backend a texto y a campo del formulario, y parsear las fechas `d-m-Y h:i:s A` que devuelve la API (no son ISO; `new Date()` no las parsea). Referencia: `src/features/clients/infrastructure/utils/utils.ts`.
- Las **screens** usan `useQuery`/`useMutation` de TanStack Query llamando al provider, y `useNotification()` para feedback.

Respuestas de API: `ApiResponseSchema` (`statusCode`, `message`), `ApiPaginatedResponseSchema` (extiende con `total`, `currentPage`, `perPage`). Las listas paginadas se definen como `ApiPaginatedResponseSchema.extend({ data: z.array(XSchema) })`. El registro individual viene en `data['data']`.

### Roles

`UserRole = "administrator" | "carrier" | "pilot" | "manager"` (`shared/domain/types`). Cada `NavItem` declara `roles?: UserRole[]` y `disabled?`. `ProtectedLayout` redirige a `/login` sin sesión y a `/completar-perfil` cuando el usuario es `carrier` y su `carrierId` es `null`. Los permisos de escritura por feature se resuelven con helpers en su `infrastructure/utils` (p. ej. `canWriteClients(role)`).

### Shared

`src/features/shared/` concentra lo reutilizable:

- **components/**: campos de formulario (`TextFormField`, `PasswordFormField`, `SelectFormField`, `DateFormField`, `TextAreaFormField`, `OTPFormField`, `FileFormField`), tabla (`Table`/`Thead`/`Tbody`/`Tr`/`Th`/`Td`), `CustomForm`, `CustomFilledButton`, `CustomNavLink`, `CustomNavTable`, `ActionsMenu`, `Modal`, `Drawer`, `Pagination`, `Title`, `InfoCard`, `DateCard`, `SpinnerComponent`, `ErrorComponent`, `AdminSidebar`/`AdminHeader`/`AdminNavItem`, `UserMenu`, `NotificationsMenu`, `ToastViewport`, `ConfirmNotificationDialog`, cards de charts (`BarChartCard`, `DonutSummaryCard`).
- **animations/**: wrappers de framer-motion (`FadeInUp`, `StaggerContainer`, `StaggerItem`, …).
- **core/notifications/**: `ToastNotificationProvider` implementa `NotificationAdapter` (`success`/`error`/`warning`/`information`/`question`) como store externo leído con `useSyncExternalStore`. Se consume con el hook `useNotification()`; nunca instanciar toasts a mano.
- **layouts/**: `PublicLayout`, `ProtectedLayout` (sidebar colapsable persistida en `SIDEBAR_COLLAPSED`).
- **domain/**: `navigation/navigation.tsx` (`NAVIGATION`, fuente única del menú lateral), `schemas/` (`ApiResponseSchema`, `ApiPaginatedResponseSchema`, …), `types/`, `errors/` (`DomainError`), `interfaces/` (`NotificationAdapter`).
- **hooks/**: `usePagination(searchParams)` lee `page` y `limit` de la URL; `useNotification()`.
- **presentation/**: `Profile`.
- **utils/**: helpers sueltos (`initials`).

### Rutas

`src/router.tsx` centraliza las rutas, agrupadas por layout (`PublicLayout` / `ProtectedLayout`), un bloque `<Route element={<ProtectedLayout />}>` por feature. Los paths son en español (`/confirmar-cuenta`, `/vehiculos`, `/clientes`, `/viajes`, `.../crear`, `/:id`, `/:id/editar`). El scaffolding de features **no** registra rutas ni entradas de `NAVIGATION`; hay que agregarlas a mano.

## Estilos

Tailwind v4 sin archivo de config: los tokens viven en `@theme` dentro de `src/index.css` — colores `canvas`, `surface`, `ink`, `ink-deep`, `ink-muted`, `ink-subtle`, `line`, `line-strong`, `primary`, `danger`, `success`; fuentes `font-sans`, `font-display`, `font-mono`. Usar esos tokens (`bg-canvas`, `text-ink-muted`) en lugar de colores crudos de Tailwind.

Antes de diseñar UI nueva, invocar la skill `frontend-design`.

## Referencias de API

`src/references/feat-references/*.md` documenta el contrato del backend por dominio (endpoints, validaciones, mensajes de error literales, particularidades). **Leer el archivo correspondiente antes de implementar o tocar una feature**: cada dominio tiene trampas propias (p. ej. `clients-api.md` — el `DELETE` es soft delete real y los duplicados llegan como 400 en `message`, no como 422 en `errors`).

`src/references/[feature-name]/` es el esqueleto de referencia (archivos en su mayoría vacíos) que consume el scaffolding.

## Specs

`specs/NN-nombre.md` guarda las specs aprobadas (`01-panel-admin-sidebar-header`, `02-guard-perfil-transportista`, `03-trips-partida-destino-ruta`). `specs/.spec-config.yml` controla `AutoCreateBranch`.

## Skills del repo (`.claude/skills/`)

- `/spec` — diseña una spec en `specs/NN-nombre.md` antes de una feature grande.
- `/spec-impl <NN-slug>` — implementa una spec aprobada; crea la rama `spec-NN-slug` (configurable en `specs/.spec-config.yml`).
- `new-feature-scaffold` — genera una feature CRUD completa desde `src/references/[feature-name]`. Es la versión vigente; `src/references/skills/NEW-FEATURE.md` es una copia antigua que apunta a una feature `packing-materials` inexistente.
