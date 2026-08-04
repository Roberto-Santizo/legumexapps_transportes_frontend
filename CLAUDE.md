# CLAUDE.md

Guía para Claude Code en este repositorio.

## Proyecto

Frontend de LegumexApps Transportes: React 19 + TypeScript + Vite 8, Tailwind CSS v4, Redux Toolkit, TanStack Query, React Router 7, react-hook-form, zod, MUI/Headless UI, framer-motion, recharts, lucide-react. React Compiler activo (`babel-plugin-react-compiler` vía `@rolldown/plugin-babel` en `vite.config.ts`).

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

`src/config/` — infraestructura de app: `http/axios.ts` (instancia axios + interceptor que inyecta `AUTH_TOKEN` de localStorage), `store/store.ts` (Redux, exporta `RootState`/`AppDispatch`), `initializer/AppInitializer.tsx` (valida sesión con `authProvider.checkStatus()` antes de renderizar).

`src/features/<feature>/` — cada feature en capas:

```
domain/          datasources/ (clases abstractas), repositories/ (abstractas),
                 schemas/ (zod), types/ (z.infer + tipos *Form)
infrastructure/  datasources/*Impl.ts (axios + zod), repositories/*Impl.ts (delegan)
presentation/    screens/, components/, providers/
```

Features actuales: `auth`, `dashboard`, `shared`. `src/references/[feature-name]/` es el esqueleto de referencia (archivos vacíos) para nuevas features.

### Barrels

Todo se exporta por barrels y se importa desde el barrel raíz de la feature, nunca del archivo directo:

- hoja: `datasources/datasources.ts`, `schemas/schemas.ts`, etc.
- capa: `domain/domain.ts`, `infrastructure/infrastructure.ts`, `presentation/presentation.ts`
- raíz: `<feature>/<feature>.ts`

Ejemplo: `import { authProvider, type LoginForm } from "@/features/auth/auth";` y `import { TextFormField, useNotification } from "@/features/shared/shared";`.

Al crear un archivo nuevo, agregar su línea `export * from './X'` en el barrel correspondiente o no será visible.

### Flujo de datos

`Screen → provider (singleton) → repository → datasource → axios`

- El **datasource** es el único que maneja errores: valida la respuesta con zod (`safeParse`) y en `catch` hace `if (isAxiosError(error)) throw new Error(error.response?.data.message); throw new Error("Error no controlado.")`. Si el parse falla: `throw new Error("Información no válida")`.
- El **repository** solo delega, sin try/catch.
- El **provider** envuelve el repository y se instancia al final de su propio archivo:
  ```ts
  const datasource = new XDatasourceImpl(api);
  const repository = new XRepositoryImpl(datasource);
  export const xProvider = new XProvider(repository);
  ```
- Las **screens** usan `useQuery`/`useMutation` de TanStack Query llamando al provider, y `useNotification()` para feedback.

Respuestas de API: `ApiResponseSchema` (`statusCode`, `message`), `ApiPaginatedResponseSchema` (extiende con `total`, `currentPage`, `perPage`). Las listas paginadas se definen como `ApiPaginatedResponseSchema.extend({ data: z.array(XSchema) })`. El registro individual viene en `data['data']`.

### Shared

`src/features/shared/` concentra lo reutilizable:

- **components/**: campos de formulario (`TextFormField`, `PasswordFormField`, `SelectFormField`, `DateFormField`, `TextAreaFormField`, `OTPFormField`), tabla (`Table`/`Thead`/`Tbody`/`Tr`/`Th`/`Td`), `CustomForm`, `CustomFilledButton`, `Modal`, `Drawer`, `Pagination`, `AdminSidebar`/`AdminHeader`/`AdminNavItem`, cards de charts.
- **animations/**: wrappers de framer-motion (`FadeInUp`, `StaggerContainer`, `StaggerItem`, …).
- **core/notifications/**: `ToastNotificationProvider` implementa `NotificationAdapter` (`success`/`error`/`warning`/`information`/`question`) como store externo leído con `useSyncExternalStore`. Se consume con el hook `useNotification()`; nunca instanciar toasts a mano.
- **layouts/**: `PublicLayout`, `ProtectedLayout` (redirige a `/login` si `state.auth.isSignedIn` es falso; maneja sidebar colapsable persistida en `SIDEBAR_COLLAPSED`).
- **domain/navigation/navigation.tsx**: `NAVIGATION` — fuente única del menú lateral.
- **hooks/**: `usePagination(searchParams)` lee `page` y `limit` de la URL.

### Rutas

`src/router.tsx` centraliza las rutas, agrupadas por layout (`PublicLayout` / `ProtectedLayout`). Los paths son en español (`/confirmar-cuenta`, `/viajes`, `.../crear`, `.../:id/editar`). El scaffolding de features **no** registra rutas; hay que agregarlas aquí a mano.

## Estilos

Tailwind v4 sin archivo de config: los tokens viven en `@theme` dentro de `src/index.css` — colores `canvas`, `surface`, `ink`, `ink-deep`, `ink-muted`, `ink-subtle`, `line`, `line-strong`, `primary`, `danger`, `success`; fuentes `font-sans`, `font-display`, `font-mono`. Usar esos tokens (`bg-canvas`, `text-ink-muted`) en lugar de colores crudos de Tailwind.

Antes de diseñar UI nueva, invocar la skill `frontend-design`.

## Skills del repo (`.claude/skills/`)

- `/spec` — diseña una spec en `specs/NN-nombre.md` antes de una feature grande.
- `/spec-impl <NN-slug>` — implementa una spec aprobada; crea la rama `spec-NN-slug` (configurable en `specs/.spec-config.yml`).
- `new-feature-scaffold` — genera una feature CRUD completa desde `src/references/[feature-name]`. Es la versión vigente; `src/references/skills/NEW-FEATURE.md` es una copia antigua que apunta a una feature `packing-materials` inexistente.
