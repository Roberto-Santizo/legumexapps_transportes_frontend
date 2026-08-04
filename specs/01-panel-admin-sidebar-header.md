# SPEC 01 — Sidebar y header del panel administrativo

> **Estado:** Aprobado
> **Depende de:** ninguna spec previa
> **Fecha:** 2026-08-04
> **Objetivo:** Dar al `ProtectedLayout` un chrome administrativo compuesto por un sidebar de navegación anclado a la izquierda (colapsable a rail de iconos, drawer en móvil) y un header con título de página, notificaciones, menú de usuario y toggle del sidebar.

---

## Por qué existe esta spec

Hoy `ProtectedLayout` solo renderiza `<Outlet />`. Cualquier pantalla protegida que se agregue queda flotando sin navegación ni identidad. Antes de sumar más features hace falta el marco.

El sidebar va a la izquierda, como en el resto de la suite. La decisión que sí conviene dejar escrita es la de la firma visual del nav, descrita abajo: es lo único que se aparta de un panel administrativo genérico.

---

## Dirección de diseño

El tema visual ya existe en `src/index.css` (paleta cadena de frío + señal de carretera, y las utilidades `route_line` / `route_node_active`). Esta spec **no introduce paleta ni tipografías nuevas**: extiende las que hay.

**Firma visual: la espina de ruta.** El nav no es una lista de links, es una ruta vertical. Una línea punteada baja por la columna de iconos, al borde izquierdo del sidebar, y cada ítem del menú es una **estación** sobre esa línea, con su etiqueta a la derecha. Los módulos ya construidos son estaciones sólidas; los módulos planificados son estaciones huecas de borde punteado sobre un tramo de línea más tenue. La distinción habilitado/deshabilitado deja de ser "texto gris" y pasa a ser información estructural: paradas construidas contra paradas proyectadas.

Al colapsar a rail (`w-16`) desaparecen las etiquetas pero se quedan la línea y las estaciones. El colapso destila la metáfora en vez de destruirla.

**Tokens usados** (todos ya existen en `@theme`):

| Rol | Token |
| --- | --- |
| Fondo de la app | `--color-canvas` `#edf1ec` |
| Panel de sidebar y header | `--color-surface` `#ffffff` |
| Texto principal, estación activa | `--color-ink` `#12241c` |
| Etiqueta de estación inactiva | `--color-ink-muted` `#56685e` |
| Estación planificada, rol del usuario | `--color-ink-subtle` `#8a9990` |
| Hairlines y bordes de estación | `--color-line` `#dde4dc` |
| Anillo de la estación activa | `--color-primary` `#e8a33d` |

**Tipografía:** `--font-display` (Archivo) para el wordmark del sidebar y el título del header, con `tracking-tight`. `--font-sans` (Public Sans) para etiquetas de nav y nombre de usuario. `--font-mono` (IBM Plex Mono) solo para el rol bajo el nombre del usuario, en mayúsculas a 10px con `tracking-wider`: el rol se lee como dato operativo de despacho, no como decoración.

**Disciplina del acento:** el ámbar aparece **una sola vez por pantalla**, en el anillo de la estación activa. Ni en el header, ni en hovers, ni en el badge de notificaciones.

**Estructura:**

```
┌──────────────┬───────────────────────────────────────┐
│  ◆ Transp.   │ header  h-16  surface  border-b line  │  sidebar full-height
│              │ ⇥  Título              🔔  ▸ usuario  │
│    │         ├───────────────────────────────────────┤
│   (●) Dashb. │                                       │  estación activa
│    ┊         │  contenido  bg-canvas                 │
│   ( ) Viajes │  <Outlet />                           │  estación planificada
│    ┊         │                                       │
│   ( ) Pilotos│                                       │
│    ┊         │                                       │
│   ( ) Vehíc. │                                       │
└──────────────┴───────────────────────────────────────┘
```

El header ocupa solo el ancho del área de contenido; el sidebar es de altura completa, lleva `border-r border-line` y contiene su propio bloque de marca. El toggle abre el header por la izquierda, pegado al sidebar que gobierna, seguido del título; las notificaciones y el menú de usuario se alinean a la derecha.

**Estados de estación:**

- **Activa:** chip circular `bg-surface` con anillo `border-primary`, icono `text-ink`, etiqueta `text-ink font-medium`.
- **Inactiva:** chip `bg-surface` con `border-line`, icono y etiqueta `text-ink-muted`. Hover: fondo `black/4`, texto `text-ink`.
- **Planificada:** chip `border-dashed border-line`, icono y etiqueta `text-ink-subtle`, `cursor-not-allowed`, `aria-disabled="true"`. No navega.

**Restricción de movimiento:** el sidebar usa el gradiente punteado de `route_line` pero **sin la animación** `route_travel`, y **no** usa `route_node_active`. Una línea que viaja y un nodo que late permanentemente en el chrome son ruido. Las únicas transiciones son: ancho del sidebar al colapsar (200ms), opacidad/desplazamiento de las etiquetas, y los dropdowns de Headless UI.

---

## Alcance

**Dentro:**

- `ProtectedLayout` pasa a componer sidebar izquierdo + header + contenido, conservando el guard de `isSignedIn`.
- Componentes nuevos `AdminSidebar`, `AdminHeader`, `AdminNavItem`, `UserMenu`, `NotificationsMenu` en `src/features/shared/components/`.
- El componente outlet debe de tener un scroll propio, es decir, si es más alto que la pantall debería de tener su scroll sin que el AdminSidebar se mueva.
- Array de navegación tipado con filtrado por rol en `src/features/shared/domain/`.
- Sidebar colapsable a rail de iconos en `≥lg`, con tooltip por estación cuando está colapsado.
- Sidebar como drawer overlay que entra desde la izquierda en `<lg`.
- Persistencia del estado colapsado en `localStorage` bajo la clave `SIDEBAR_COLLAPSED`.
- Título del header derivado del array de navegación por `pathname`.
- Menú de usuario con nombre, rol y acción de cerrar sesión que despacha `logout`.
- Menú de notificaciones con estado vacío.
- Módulos `Viajes`, `Pilotos` y `Vehículos` visibles y deshabilitados.

**Fuera de alcance (para specs futuras):**

- Las pantallas y rutas reales de Viajes, Pilotos y Vehículos.
- Backend y conexión real de notificaciones (badge, contador, marcar como leída).
- Módulos `Clientes` y `Usuarios`: no entran ni siquiera como deshabilitados.
- Guard de rutas por rol. Esta spec solo oculta ítems del menú; no bloquea el acceso por URL directa.
- Breadcrumbs y rutas anidadas.
- Buscador global, selector de tema y selector de idioma en el header.
- Eliminar o migrar `CustomSideBar.tsx` y `CustomNavLink.tsx`, que quedan intactos.

---

## Modelo de datos

Un tipo nuevo y un array de configuración. No hay entidades de dominio ni llamadas a API.

**Tipo** — se agrega a `src/features/shared/domain/types/types.ts`:

```ts
export type NavItem = {
    to: string;
    text: string;
    icon: ReactNode;
    roles?: UserRole[];   // ausente = visible para todos los roles
    disabled?: boolean;   // módulo planificado, se muestra sin navegar
};

export type UserRole = "administrator" | "carrier" | "pilot";
```

**Array** — archivo nuevo `src/features/shared/domain/navigation/navigation.ts`, exportado desde `src/features/shared/domain/domain.ts`:

```ts
export const NAVIGATION: NavItem[] = [
    { to: "/dashboard", text: "Dashboard", icon: <LayoutDashboard /> },
    { to: "/viajes",    text: "Viajes",    icon: <Route />,  disabled: true },
    { to: "/pilotos",   text: "Pilotos",   icon: <IdCard />, disabled: true },
    { to: "/vehiculos", text: "Vehículos", icon: <Truck />,  disabled: true },
];
```

Como el array contiene JSX, el archivo es `navigation.tsx`, no `.ts`.

Ningún ítem declara `roles` todavía: los tres roles del sistema (`administrator`, `carrier`, `pilot`) ven los mismos cuatro ítems. El campo existe y el filtro se implementa, listo para el primer ítem que lo necesite.

**Persistencia:**

| Clave | Valor | Dónde |
| --- | --- | --- |
| `SIDEBAR_COLLAPSED` | `"true"` \| `"false"` | `localStorage` |

Convive con la clave `AUTH_TOKEN` que ya usa `authSlice`. Si la clave no existe o el valor no es parseable, el sidebar arranca expandido.

---

## Plan de implementación

1. **Tipos y array de navegación.** Agregar `NavItem` y `UserRole` a `src/features/shared/domain/types/types.ts`. Crear `src/features/shared/domain/navigation/navigation.tsx` con la constante `NAVIGATION` y los iconos de `lucide-react`. Exportarlo desde `domain.ts`. Verificación: `npm run build` compila.

2. **`AdminNavItem.tsx`.** Componente de una estación: recibe `item: NavItem` y `collapsed: boolean`. Renderiza `NavLink` cuando el ítem está habilitado y un `div` con `aria-disabled` cuando está planificado. Aplica los tres estados de estación descritos arriba. Exportar desde `components.ts`. Verificación: compila y no se usa todavía.

3. **`AdminSidebar.tsx` — versión desktop.** `<aside>` de altura completa, `w-64` expandido y `w-16` colapsado, con `border-r border-line` y fondo `surface`. Bloque de marca arriba: logo S3 (`LOGO_LX_V2.png`) más el wordmark "Transportes" en Archivo, que se oculta en modo rail. Debajo, la lista de `AdminNavItem` sobre la línea de ruta punteada. Props: `collapsed`. Filtra `NAVIGATION` por el rol de `auth.user`. Verificación: montarlo temporalmente y ver los cuatro ítems.

4. **Conectar sidebar al `ProtectedLayout`.** Reescribir el layout como `flex` de altura `h-screen`: `AdminSidebar` a la izquierda y columna de contenido a la derecha con `overflow-y-auto` y `<Outlet />` sobre `bg-canvas`. Estado `collapsed` con `useState`, inicializado desde `localStorage` y sincronizado con un `useEffect`. Conservar el `Navigate` a `/login`. Verificación: `/dashboard` muestra el sidebar a la izquierda y el contenido a la derecha.

5. **Tooltips del rail.** Cuando `collapsed` es `true`, cada estación muestra el `text` del ítem como tooltip al hover y al foco de teclado, posicionado a la derecha del chip. Verificación: colapsar y recorrer con Tab.

6. **`NotificationsMenu.tsx`.** `Menu` de Headless UI siguiendo el patrón de `ActionsMenu.tsx`: botón con icono `Bell`, panel `anchor="bottom end"` con el estado vacío "No tienes notificaciones". Sin badge. Verificación: abre, cierra con Esc y con clic afuera.

7. **`UserMenu.tsx`.** `Menu` de Headless UI con botón que muestra las iniciales del usuario en un chip circular, el `name` y el `role` en mono. El panel contiene una sola acción, "Cerrar sesión", en variante peligro, que despacha `logout()`. Verificación: cerrar sesión redirige a `/login` y limpia `AUTH_TOKEN`.

8. **`AdminHeader.tsx`.** Barra `h-16` con fondo `surface` y `border-b border-line`. Izquierda: el botón toggle (`PanelLeft`) seguido del título en Archivo, resuelto buscando en `NAVIGATION` el ítem cuyo `to` coincide con `location.pathname`; cadena vacía si no hay coincidencia. Derecha: `NotificationsMenu` y `UserMenu`, en ese orden. Props: `collapsed`, `onToggle`. Verificación: en `/dashboard` el título dice "Dashboard".

9. **Montar el header y cablear el toggle.** Insertar `AdminHeader` arriba de la columna de contenido en `ProtectedLayout` y pasarle el `collapsed` y el setter. Verificación: el toggle colapsa y expande, y la preferencia sobrevive a un refresh.

10. **Sidebar móvil.** En `<lg` el `<aside>` se oculta y el sidebar se renderiza dentro de un `Dialog` de Headless UI que entra desde la izquierda con backdrop. En ese breakpoint el toggle del header abre el drawer en vez de colapsar. Al navegar a una ruta, el drawer se cierra. Verificación: en viewport de 375px el toggle abre el overlay y elegir Dashboard lo cierra.

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores ni warnings nuevos.
- [ ] Entrar a `/dashboard` autenticado muestra el sidebar sobre el borde izquierdo de la ventana y el contenido a su derecha.
- [ ] Entrar a `/dashboard` sin autenticar sigue redirigiendo a `/login`.
- [ ] El sidebar lista exactamente cuatro ítems: Dashboard, Viajes, Pilotos y Vehículos.
- [ ] Hacer clic en Viajes, Pilotos o Vehículos no cambia la URL.
- [ ] La estación de Dashboard en `/dashboard` es la única con el anillo ámbar.
- [ ] Pulsar el toggle del header en desktop lleva el sidebar de `w-64` a `w-16` y mantiene visibles los cuatro iconos.
- [ ] Con el sidebar colapsado, hacer hover sobre una estación muestra el nombre del módulo.
- [ ] Colapsar el sidebar y recargar la página deja el sidebar colapsado.
- [ ] Borrar la clave `SIDEBAR_COLLAPSED` de `localStorage` y recargar deja el sidebar expandido.
- [ ] El título del header en `/dashboard` dice "Dashboard".
- [ ] El menú de usuario muestra el `name` y el `role` del usuario en sesión.
- [ ] "Cerrar sesión" redirige a `/login` y deja `localStorage` sin `AUTH_TOKEN`.
- [ ] El icono de campana abre un panel que dice que no hay notificaciones.
- [ ] En un viewport de 375px de ancho el sidebar no ocupa espacio y el toggle abre un overlay desde la izquierda.
- [ ] Con el overlay abierto, elegir Dashboard cierra el overlay.
- [ ] Se puede recorrer marca, estaciones habilitadas y los tres controles del header con Tab, y cada elemento enfocado tiene un anillo de foco visible.
- [ ] `CustomSideBar.tsx` y `CustomNavLink.tsx` siguen en el repositorio sin cambios.

---

## Decisiones

- **Sí:** sidebar anclado a la izquierda. Es la convención del resto de la suite y de los paneles administrativos que ya usa el equipo.
- **No:** sidebar a la derecha. Se evaluó y se descartó: obligaba a invertir el drawer, el toggle y el borde divisor a cambio de nada.
- **Sí:** componentes nuevos `Admin*` y los `Custom*` existentes intactos. Evita romper cualquier uso futuro de esos componentes y deja la limpieza como decisión aparte.
- **No:** reescribir `CustomSideBar.tsx`. Su `<nav>` está vacío, su marca dice "Producción" y su colapso es a `w-0`; de él solo se conserva la idea, no el código.
- **Sí:** array `NAVIGATION` con `roles?` opcional. El filtrado se implementa aunque ningún ítem lo use todavía; agregar un ítem restringido después es una línea de datos, no un cambio de componente.
- **No:** ítems hardcodeados en el JSX. Cada feature nueva implicaría editar el sidebar.
- **Sí:** módulos futuros visibles y deshabilitados. Comunican el alcance del sistema sin producir links rotos.
- **No:** rutas placeholder navegables. Un clic que lleva a una pantalla en blanco se lee como bug.
- **Sí:** colapso a rail de iconos. Conserva la navegación de un clic y preserva la firma visual de la ruta.
- **No:** colapso a `w-0`. Obliga a expandir para navegar.
- **Sí:** `useState` en `ProtectedLayout` más `localStorage`. Un solo dueño del booleano y la preferencia sobrevive entre sesiones.
- **No:** slice de Redux para el estado de UI. Demasiada ceremonia para un booleano que solo consumen dos hermanos.
- **Sí:** `Dialog` propio de Headless UI para el drawer móvil. `Drawer.tsx` está tipado para formularios (`title` obligatorio, `p-6`, paleta gris propia) y además entra fijo desde la derecha.
- **No:** reusar `Drawer.tsx`.
- **Sí:** título derivado de `NAVIGATION` por `pathname`. Cero configuración por pantalla.
- **No:** breadcrumbs. Hoy no hay rutas anidadas que justifiquen la metadata por segmento.
- **Sí:** campana con dropdown vacío. Deja el hueco listo sin inventar datos.
- **No:** notificaciones mock. En una demo se leen como reales.
- **Sí:** ámbar reservado al anillo de la estación activa. Un solo acento por pantalla hace que ese acento signifique algo.
- **No:** animación permanente de la línea de ruta ni pulso del nodo activo. Movimiento constante en el chrome distrae del contenido.

---

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| El menú oculta ítems por rol pero no protege la URL: un usuario puede entrar escribiendo la ruta. | Se documenta como fuera de alcance. El guard por rol va en su propia spec antes de que exista el primer ítem restringido. |
| `localStorage` deshabilitado (modo privado, políticas de navegador) hace fallar la lectura inicial. | Envolver lectura y escritura en `try/catch`. Sin persistencia el sidebar arranca expandido y sigue funcionando. |
| Los tres módulos deshabilitados envejecen mal si las features tardan. | Cada spec de módulo debe quitar su `disabled: true` como parte de su propio plan. |

---

## Lo que **no** entra en esta spec

- Las pantallas de Viajes, Pilotos y Vehículos.
- El backend de notificaciones.
- Los módulos Clientes y Usuarios.
- El guard de rutas por rol.
- Breadcrumbs, buscador global, selector de tema.
- Borrar `CustomSideBar.tsx` y `CustomNavLink.tsx`.

Cada uno de esos, si entra, va en su propia spec.
