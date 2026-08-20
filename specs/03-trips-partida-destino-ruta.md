# SPEC 03 — Creación de viajes: punto de partida, destino y ruta

> **Estado:** Aprobado
> **Depende de:** ninguna spec previa. Se apoya en las features `locations` y `places`, ya implementadas fuera del flujo de specs.
> **Fecha:** 2026-08-19
> **Objetivo:** Levantar la feature `trips` con su esqueleto CRUD sin implementar y construir la pantalla `CreateTrip`, donde el usuario elige un punto de partida con el buscador de Google, un destino ya registrado en `locations`, y ve la ruta por carretera que devuelve `GET /api/places/directions`.

---

## Por qué existe esta spec

El backend todavía no tiene `/trips`. Lo que sí acaba de llegar es `GET /api/places/directions` (novedad de SPEC 16 del backend, documentada en `src/references/feat-references/places-api.md`): la ruta por carretera entre un par de coordenadas sueltas y un destino registrado, con distancia, duración y polilínea.

Esa ruta es lo que hace interesante un viaje, y es lo único de esta spec que se puede probar contra un servidor real hoy. Por eso el reparto es asimétrico a propósito:

- La feature `trips` se levanta **completa en estructura y vacía en comportamiento**: los cinco métodos del CRUD existen, están tipados y lanzan `No implementado`.
- La feature `places` se **extiende de verdad** con el tercer endpoint, sus tipos, sus utilidades de formato y sus ramas de error.
- La pantalla `CreateTrip` es donde las dos se encuentran.

Cuando el backend publique `/trips`, la spec siguiente rellena cinco cuerpos de método y agrega el listado. Nada de lo que se escribe aquí se tira.

---

## Alcance

**Dentro:**

- Feature nueva `src/features/trips/`, generada con la skill `new-feature-scaffold` sobre el esqueleto `src/references/[feature-name]`.
- `TripForm` con **un solo campo**: `polyline`. Es lo único que viaja en el `POST /trips`.
- `TripFormValues`: el estado del formulario, superconjunto de `TripForm`, con origen y destino. No viaja al servidor.
- Datasource, repository y provider de `trips` con los **cinco** métodos del CRUD, todos lanzando `No implementado`.
- Pantalla `CreateTrip` y su ruta `/viajes/crear` en `src/router.tsx`.
- Campo **punto de partida**: buscador de direcciones de Google más pin arrastrable sobre el mapa, replicando el comportamiento de `LocationPinField` con copy propio.
- Campo **destino**: `SelectFormField` alimentado por `locationProvider.getLocations()`.
- Extensión de la feature `places` con `GET /api/places/directions`: `DirectionsSchema`, tipos `Directions` y `DirectionsQuery`, método en datasource, repository y provider.
- `DirectionsError` con el `status` HTTP, para que la pantalla pueda separar el 400 del 404, del 422 y del 503.
- Utilidades de formato en `places`: horas decimales a `h + min`, kilómetros, y conversión de `points` a la forma que espera Google Maps.
- Dibujo de la ruta sobre el mismo mapa del origen, más marcador del destino.
- Panel con distancia y duración, **etiquetada como estimación sin tráfico**.

**Fuera de alcance (para specs futuras):**

- Las pantallas `IndexTrips`, `ShowTrip` y `UpdateTrip`. No se crean sus archivos.
- Los cuerpos reales de los cinco métodos del datasource de `trips`.
- `TripSchema` y `PaginatedTripsSchema`. El recurso de lectura no está definido por el backend.
- Todos los demás campos de un viaje: vehículo, piloto, producto, libras, fecha programada, notas, estado. **Decisión explícita del usuario: no se diseñan todavía.**
- La entrada de **Viajes** en `NAVIGATION` y en el sidebar.
- Cotización del viaje con `GET /api/freight-rates/quote`.
- Persistir `distanceKilometers` y `durationHours` en el viaje.
- Cambiar el manejo de errores de `searchPlaces` y `getPlaceById`, que se quedan como están.
- Mover `LocationMapCanvas`, `toMapsPosition` o `roundCoordinate` fuera de `locations`.

---

## Modelo de datos

### Lo que se agrega a `places`

`src/features/places/domain/schemas/schemas.ts` suma un schema. Los seis campos vienen de la sección 3.3 del documento de referencia:

```ts
/**
 * La ruta por carretera hacia un destino registrado. `polyline` y `points` son
 * la misma línea en dos formatos: se consume una, no las dos.
 */
export const DirectionsSchema = z.object({
    locationId: z.number(),
    locationName: z.string(),
    distanceKilometers: z.number(),
    durationHours: z.number(),
    polyline: z.string(),
    points: z.array(z.tuple([z.number(), z.number()])),
});
```

`src/features/places/domain/types/types.ts` suma dos tipos:

```ts
export type Directions = z.infer<typeof DirectionsSchema>;

/** Los tres parámetros de `/directions`. Los tres obligatorios, sin defaults. */
export type DirectionsQuery = {
    /** Id entero de la tabla `locations`. NO es un `placeId`. */
    locationId: number;
    /** Latitud del origen, entre -90 y 90. */
    latitude: number;
    /** Longitud del origen, entre -180 y 180. */
    longitude: number;
};
```

`src/features/places/infrastructure/utils/utils.ts` suma el error tipado y tres utilidades:

```ts
/** Único punto del front que conoce el código HTTP de un fallo de la ruta. */
export class DirectionsError extends Error {
    constructor(message: string, readonly status: number) {
        super(message);
        this.name = 'DirectionsError';
    }
}

/** `1.75` → `"1 h 45 min"`. Nunca se muestra "1,75 horas". */
export const formatDurationHours = (hours: number): string => { /* … */ };

/** `104.32` → `"104.32 km"`. */
export const formatDistanceKilometers = (kilometers: number): string => { /* … */ };

/** `[[lat, lng], …]` → `[{ lat, lng }, …]`. El orden de origen es [latitud, longitud]. */
export const toRoutePath = (points: Directions['points']): google.maps.LatLngLiteral[] => { /* … */ };
```

### Lo que se crea en `trips`

`src/features/trips/domain/types/types.ts`:

```ts
/** El payload del `POST /trips`. Un solo campo, a propósito. */
export type TripForm = {
    /** La polilínea codificada que devolvió `/api/places/directions`. */
    polyline: string;
}

/**
 * El estado del formulario. Origen y destino se validan con react-hook-form
 * pero NO viajan al servidor: `buildTripPayload` los descarta.
 */
export type TripFormValues = TripForm & {
    /** Id opaco de Google del punto de partida. Ancla el origen a un lugar real. */
    originGooglePlaceId: string;
    originLatitude: number;
    originLongitude: number;
    /** Id de la tabla `locations`. `null` mientras no se elige destino. */
    locationId: number | null;
}
```

`src/features/trips/domain/schemas/schemas.ts` se crea **vacío**, con un comentario y un `export {};` para que siga siendo un módulo y `domain.ts` pueda reexportarlo. El recurso de lectura lo define el backend.

`src/features/trips/infrastructure/utils/utils.ts`:

```ts
export const TRIP_NOT_IMPLEMENTED = "No implementado";

/** Cuántos destinos se piden para llenar el select. */
export const TRIP_DESTINATIONS_LIMIT = '100';

/** Deja fuera todo lo que el formulario usa pero el servidor no recibe. */
export const buildTripPayload = (values: TripFormValues): TripForm => ({
    polyline: values.polyline,
});
```

**Persistencia:** ninguna clave nueva en `localStorage`. Siguen vigentes solo `AUTH_TOKEN` y `SIDEBAR_COLLAPSED`.

---

## Estructura de archivos

```
src/features/trips/
├── trips.ts                                 domain + infrastructure + presentation
├── domain/
│   ├── domain.ts
│   ├── datasources/
│   │   ├── datasources.ts
│   │   └── TripDatasource.ts                abstracta, 5 métodos
│   ├── repositories/
│   │   ├── repositories.ts
│   │   └── TripRepository.ts                abstracta, mismas firmas
│   ├── schemas/
│   │   └── schemas.ts                       vacío (export {};)
│   └── types/
│       └── types.ts                         TripForm, TripFormValues
├── infrastructure/
│   ├── infrastructure.ts
│   ├── datasources/
│   │   ├── datasources.ts
│   │   └── TripDatasourceImpl.ts            los 5 lanzan TRIP_NOT_IMPLEMENTED
│   ├── repositories/
│   │   ├── repositories.ts
│   │   └── TripRepositoryImpl.ts            delega, sin try/catch
│   └── utils/
│       └── utils.ts                         buildTripPayload y constantes
└── presentation/
    ├── presentation.ts
    ├── components/
    │   ├── components.ts
    │   ├── TripFormComponent.tsx            orquesta los bloques y la consulta de ruta
    │   ├── TripOriginField.tsx              buscador + mapa (pin de origen, destino y línea)
    │   └── TripRouteSummary.tsx             distancia, duración y ramas de error
    ├── providers/
    │   ├── providers.ts
    │   └── TripProvider.ts                  instancia `tripProvider` al final del archivo
    └── screens/
        ├── screens.ts
        └── CreateTrip.tsx
```

No se crean `IndexTrips.tsx`, `ShowTrip.tsx` ni `UpdateTrip.tsx`, y `screens.ts` exporta solo `CreateTrip`. Es la única desviación deliberada respecto al esqueleto de `src/references/[feature-name]`.

### Firmas del datasource de `trips`

```ts
export abstract class TripDatasource {
    abstract createTrip(payload: TripForm): Promise<string>;
    /** Sin `TripSchema` todavía: el tipo de lectura lo fija la spec del listado. */
    abstract getTrips(limit: string, page: string): Promise<unknown>;
    abstract getTripById(id: string): Promise<unknown>;
    abstract updateTripById(id: string, payload: TripForm): Promise<string>;
    abstract deleteTripById(id: string): Promise<string>;
}
```

En `TripDatasourceImpl` los cinco cuerpos son `throw new Error(TRIP_NOT_IMPLEMENTED);` y los parámetros sin usar llevan prefijo `_` para no chocar con `noUnusedParameters`.

Las dependencias del constructor se declaran `readonly` públicas, **no** `private`. `noUnusedLocals` marca como error una propiedad privada que nadie lee, y mientras los cinco métodos lancen, nadie lee `api` ni `url`:

```ts
constructor(readonly api: AxiosInstance, readonly url = '/trips') {
    super();
}
```

Cuando los métodos se implementen, pueden volver a `private`.

---

## Contrato de `/api/places/directions`

`PlaceDatasourceImpl` suma un método. La URL se arma con los tres parámetros obligatorios y la respuesta se valida contra `DirectionsSchema` sobre `data['data']`:

```
GET /places/directions?locationId=7&lat=14.6248&lng=-90.5152
```

El `catch` es distinto al de `searchPlaces` y `getPlaceById` por dos motivos: este endpoint es el único que puede responder **400**, y su **422** llega en el formato de Laravel `{ message, errors }`, sin el sobre `{ statusCode, message, data }`. El método lanza `DirectionsError` con el `status` de la respuesta y el mensaje ya redactado en español por el backend, prefiriendo los textos de `errors` cuando existen.

Los cinco desenlaces que la pantalla tiene que distinguir:

| Código | Qué pasó | Qué hace la UI |
| :--: | --- | --- |
| **200** | Ruta encontrada | Dibuja la línea, muestra km y duración, escribe `polyline` en el formulario |
| **400** | El destino existe pero está dado de baja | Mensaje del backend y sugerencia de elegir otro destino. **No** ofrece reintentar |
| **404** | No hay carretera entre los dos puntos | Mensaje del backend y sugerencia de cambiar el **punto de partida**. **No** ofrece reintentar |
| **422** | Falta un parámetro o el destino no existe | Mensaje del backend, tomado de `errors`. **No** ofrece reintentar |
| **503** | El proveedor no respondió | Mensaje del backend y **botón Reintentar** que llama a `refetch()` |

El 404 y el 400 no se reintentan porque reintentarlos falla igual: lo que hay que cambiar es un campo del formulario. El 503 sí, porque es transitorio y no hay plan B.

---

## Pantalla `/viajes/crear`

Una sola columna de contenido dentro de `ProtectedLayout`, con `Title` de shared y el formulario en una tarjeta ancha. Antes de escribir el JSX definitivo, invocar la skill `frontend-design`. Sin paleta ni tipografías nuevas: los tokens de SPEC 01 (`canvas`, `surface`, `ink`, `ink-muted`, `ink-subtle`, `line`, `line-strong`, `primary`, `danger`, `font-display`, `font-sans`, `font-mono`).

```
┌───────────────────────────────────────────────────────┐
│  Registrar viaje                                      │
│  Elige de dónde sale y a qué destino registrado va.   │
├───────────────────────────────────────────────────────┤
│  Punto de partida                                     │
│  [ Buscar dirección …                              ]  │
│  ┌─────────────────────────────────────────────────┐  │
│  │                    ●───────────────╮            │  │
│  │        mapa        (pin origen)    ╰──▣ destino │  │
│  └─────────────────────────────────────────────────┘  │
│  Arrastra el pin para afinar el punto de salida.      │
│                                                       │
│  Destino                                              │
│  [ Seleccione una opción                          ▾]  │
│                                                       │
│  ┌── Ruta ─────────────────────────────────────────┐  │
│  │  104.32 km  ·  ~1 h 45 min                      │  │
│  │  Estimación por carretera, sin tráfico.         │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  [            Guardar viaje                        ]  │
└───────────────────────────────────────────────────────┘
```

### `TripOriginField`

Replica el comportamiento de `LocationPinField` con copy propio de origen, y reusa desde `@/features/locations/locations` el lienzo `LocationMapCanvas`, `LOCATION_MAP_PIN_ZOOM`, `toMapsPosition` y `roundCoordinate`.

- `PlaceSearchField` de `places`, con `label="Buscar el punto de partida"`. Elegir una coincidencia escribe `originGooglePlaceId`, `originLatitude` y `originLongitude` de una sola vez.
- Un `Marker` arrastrable en el origen. Arrastrarlo o hacer clic en el mapa corrige **solo** las coordenadas; el lugar de Google no cambia.
- El mapa se reencuadra al elegir una dirección nueva, nunca al arrastrar el pin.
- Cuando hay ruta calculada, la capa `TripRouteLayer` dibuja la línea con `new google.maps.Polyline({ path: toRoutePath(directions.points) })` sobre el mapa obtenido con `useMap()`, y limpia con `setMap(null)` al desmontar o al cambiar la ruta. `@vis.gl/react-google-maps` no exporta un componente `Polyline`.
- Con ruta calculada se pinta además un `Marker` no arrastrable en el último par de `points`, que es el destino.
- Se consume `points`, **no** `polyline`. La cadena codificada se guarda en el formulario y no se dibuja: son la misma línea.

### Destino

`SelectFormField<TripFormValues>` con `name="locationId"`, `control`, y `validation={{ required: "Elige el destino del viaje" }}`. Las opciones salen de un `useQuery` con `queryKey: ['getLocations', TRIP_DESTINATIONS_LIMIT, '1']` que llama a `locationProvider.getLocations(TRIP_DESTINATIONS_LIMIT, '1')` y mapea cada destino a `{ value: location.id, label: location.name }`.

**Los destinos dados de baja se listan igual que los activos**, sin marca ni bloqueo. Si el usuario elige uno, `/directions` responde **400** con `El destino seleccionado no está activo` y ese mensaje se muestra en `TripRouteSummary`.

### Consulta de la ruta

Vive en `TripFormComponent`, que es quien ve los cuatro valores. Se dispara **sola** en cuanto hay origen y destino:

```ts
const { data: directions, isFetching, error, refetch } = useQuery({
    queryKey: ['directions', locationId, originLatitude, originLongitude],
    queryFn: () => placeProvider.getDirections({ locationId, latitude, longitude }),
    enabled: locationId !== null && originGooglePlaceId.trim().length > 0,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
});
```

`staleTime: Infinity` y `refetchOnWindowFocus: false` son la defensa de costo: volver a un par origen–destino ya consultado sale de caché y no factura. `retry: false` evita que un 503 se convierta en tres llamadas.

Un `useEffect` sobre `directions` escribe `setValue('polyline', directions.polyline, { shouldDirty: true, shouldValidate: true })` al llegar la ruta, y `setValue('polyline', '')` cuando la consulta falla. `useQuery` de TanStack v5 no tiene `onSuccess`.

### `TripRouteSummary`

Cuatro estados, excluyentes:

1. **Sin origen o sin destino** — texto guía: completa los dos campos para calcular la ruta.
2. **Cargando** — spinner y "Calculando la ruta…".
3. **Con ruta** — `formatDistanceKilometers(distanceKilometers)` y `formatDurationHours(durationHours)`, con la leyenda **"Estimación por carretera, sin tráfico"** visible en la propia tarjeta, no en un tooltip.
4. **Con error** — el mensaje del backend, más la sugerencia y el botón de reintentar según la tabla de la sección anterior.

### Guardar

`CreateTrip` monta `useForm<TripFormValues>` con `defaultValues: { polyline: '', originGooglePlaceId: '', originLatitude: 0, originLongitude: 0, locationId: null }`, un `useMutation` sobre `tripProvider.createTrip(buildTripPayload(values))` y `useNotification()` para el resultado.

`polyline` se valida como requerido con el mensaje `Calcula la ruta antes de guardar el viaje`. El botón **no** se deshabilita: enviar dispara la mutación, el datasource lanza `No implementado` y el toast de error lo muestra. Es el comportamiento correcto mientras el endpoint no exista.

---

## Plan de implementación

1. **`/directions` en el dominio de `places`.** Agregar `DirectionsSchema` a `schemas.ts`, los tipos `Directions` y `DirectionsQuery` a `types.ts`, y el método abstracto `getDirections(query: DirectionsQuery): Promise<Directions>` a `PlaceDatasource` y `PlaceRepository`. Verificación: `npm run build` falla señalando que `PlaceDatasourceImpl` y `PlaceRepositoryImpl` no implementan el método nuevo — es la señal de que las abstracciones quedaron bien.

2. **`/directions` en la infraestructura de `places`.** Agregar `DirectionsError`, `formatDurationHours`, `formatDistanceKilometers` y `toRoutePath` a `places/infrastructure/utils/utils.ts`; implementar `getDirections` en `PlaceDatasourceImpl` con la URL de tres parámetros, el `safeParse` sobre `data['data']` y el `catch` que lanza `DirectionsError` con el `status`; delegar en `PlaceRepositoryImpl`; exponer `getDirections` en `PlaceProvider`. Verificación: `npm run build` y `npm run lint` limpios, e `import { placeProvider, type Directions } from "@/features/places/places"` resuelve.

3. **Esqueleto de `trips`.** Correr `new-feature-scaffold` con base URL `/trips`, ruta `/viajes`, `Trip` / `Trips`, entidad `Trip`, lookup `id`, y podar lo que esta spec no usa: `schemas.ts` vacío, sin `TripSchema`, y solo `CreateTrip` en `screens.ts`. `TripDatasourceImpl` con los cinco cuerpos lanzando `TRIP_NOT_IMPLEMENTED` y el constructor `readonly`. `CreateTrip.tsx` arranca devolviendo un `<div />`. Verificación: `npm run build` compila y `import { tripProvider, type TripForm } from "@/features/trips/trips"` resuelve.

4. **Registrar la ruta.** Agregar `/viajes/crear` a `src/router.tsx` en su propio bloque de `ProtectedLayout`. Verificación: escribir la URL a mano renderiza el componente vacío con sidebar y header.

5. **`TripOriginField` sin ruta.** Buscador `PlaceSearchField` más mapa con pin arrastrable y clic en el mapa, reusando `LocationMapCanvas`. Todavía sin capa de línea ni marcador de destino. Verificación: elegir una dirección centra el mapa y coloca el pin; arrastrarlo cambia las coordenadas y no reencuadra.

6. **`TripFormComponent` con origen y destino.** `Controller` sobre `originGooglePlaceId` que escribe los tres campos del origen, y `SelectFormField` de `locationId` alimentado por `getLocations`. Sin consulta de ruta. Verificación: el select lista los destinos registrados y enviar sin destino muestra "Elige el destino del viaje".

7. **Consulta de la ruta y `TripRouteSummary`.** El `useQuery` con su `queryKey`, `staleTime: Infinity`, `refetchOnWindowFocus: false` y `retry: false`; el `useEffect` que escribe `polyline`; y el panel con sus cuatro estados y las cuatro ramas de error. Verificación: con origen y destino válidos aparecen kilómetros y duración formateada; elegir un destino dado de baja muestra el 400 sin botón de reintentar.

8. **Dibujo de la ruta en el mapa.** `TripRouteLayer` con `useMap()` y `google.maps.Polyline` sobre `toRoutePath(points)`, más el marcador del destino en el último par. Limpieza con `setMap(null)`. Verificación: la línea aparece sobre carreteras y no en el océano Índico — si sale ahí, el orden de los pares está invertido.

9. **Envío y pantalla completa.** `CreateTrip` con `useForm`, `CustomForm`, `useMutation` sobre `tripProvider.createTrip(buildTripPayload(values))`, `useNotification` y `CustomFilledButton`. Verificación: guardar con ruta calculada muestra el toast `No implementado`; guardar sin ruta muestra "Calcula la ruta antes de guardar el viaje" y no dispara ninguna petición.

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores ni warnings nuevos.
- [ ] `import { tripProvider, buildTripPayload, type TripForm, type TripFormValues } from "@/features/trips/trips"` compila.
- [ ] `import { placeProvider, DirectionsError, formatDurationHours, type Directions } from "@/features/places/places"` compila.
- [ ] `src/features/trips/` **no** contiene `IndexTrips.tsx`, `ShowTrip.tsx` ni `UpdateTrip.tsx`.
- [ ] `TripForm` declara exactamente un campo: `polyline: string`.
- [ ] `buildTripPayload` devuelve un objeto con una sola clave, `polyline`, aunque reciba los cinco valores del formulario.
- [ ] Los cinco métodos de `tripProvider` existen y llamar a cualquiera lanza un error con el mensaje `No implementado`.
- [ ] `/viajes/crear` renderiza dentro de `ProtectedLayout`, con sidebar y header.
- [ ] Escribir menos de 3 caracteres en el buscador de origen no dispara ninguna petición a `/places`.
- [ ] Elegir una coincidencia del buscador coloca el pin, centra el mapa y muestra la dirección devuelta por el detalle, no el texto tecleado.
- [ ] Arrastrar el pin cambia las coordenadas del origen y **no** reencuadra el mapa.
- [ ] El select de destino lista los destinos registrados, incluidos los que tienen `status: false`.
- [ ] Con origen y destino elegidos, la ruta se calcula sin pulsar ningún botón.
- [ ] La tarjeta de ruta muestra la duración como `h + min` (`1.75` se ve como `1 h 45 min`), nunca como `1.75 horas`.
- [ ] La leyenda "Estimación por carretera, sin tráfico" está visible en la tarjeta, no escondida en un tooltip.
- [ ] Volver a un par origen–destino ya consultado no genera una segunda petición a `/directions` (verificable en la pestaña Red).
- [ ] Cambiar el destino a otro sí genera una petición nueva.
- [ ] Un 400 muestra `El destino seleccionado no está activo` y **no** ofrece botón de reintentar.
- [ ] Un 404 muestra `No se encontró una ruta hacia el destino`, sugiere cambiar el punto de partida y **no** ofrece botón de reintentar.
- [ ] Un 503 muestra el mensaje del backend **y** un botón Reintentar que vuelve a lanzar la consulta.
- [ ] Un 422 muestra el mensaje del campo que falla, tomado de `errors`.
- [ ] Ningún fallo de `/directions` se reintenta automáticamente.
- [ ] La línea dibujada sigue carreteras entre origen y destino, y hay un marcador en el extremo del destino.
- [ ] Se dibuja `points`; el valor `polyline` no se pasa a ninguna API de mapa.
- [ ] Enviar el formulario sin ruta calculada muestra `Calcula la ruta antes de guardar el viaje` y no dispara ninguna petición.
- [ ] Enviar el formulario con ruta calculada muestra un toast de error con el mensaje `No implementado`.
- [ ] En un viewport de 375px la pantalla no produce scroll horizontal.

---

## Decisiones

- **Sí:** `TripForm` con un único campo `polyline`. Decisión explícita del usuario: el resto del viaje se diseña cuando el backend publique el recurso.
- **No:** inventar `vehicleId`, `pilotId`, `productId` o `scheduledAt`. Sin contrato de backend serían campos que hay que renegociar.
- **Sí:** `TripFormValues` como superconjunto de `TripForm`, con origen y destino gobernados por `react-hook-form`. Un solo sitio de estado y la validación de "falta el destino" sale gratis.
- **No:** `useState` para origen y destino. Obligaría a escribir a mano las validaciones que `react-hook-form` ya da.
- **Sí:** `buildTripPayload` en `infrastructure/utils`, igual que `buildLocationPayload`. Es el único punto que sabe qué se descarta antes de enviar.
- **Sí:** los cinco métodos del CRUD escritos y lanzando `No implementado`. La spec del backend rellena cuerpos, no firmas.
- **No:** escribir solo `createTrip`. La spec del listado tendría que volver a tocar los tres archivos de la cadena.
- **No:** implementar `createTrip` de verdad contra `POST /trips`. Sin endpoint el error sería del servidor y no diría nada útil; `No implementado` sí.
- **No:** deshabilitar el botón de guardar al estilo de SPEC 02. Aquí sí hay una cadena completa que ejercitar hasta el datasource, y el error explica exactamente en qué punto se corta.
- **Sí:** dependencias del constructor `readonly` públicas en `TripDatasourceImpl`. `noUnusedLocals` marca como error una propiedad privada que nadie lee, y ningún método las lee todavía.
- **No:** `TripSchema` ni `PaginatedTripsSchema`. Los getters devuelven `unknown` hasta que el backend defina el recurso.
- **Sí:** solo `CreateTrip` en `screens.ts`. Es la única desviación consciente del esqueleto de referencia.
- **Sí:** ruta `/viajes/crear` registrada sin `/viajes`. Sin listado no hay a dónde volver, y registrar una ruta vacía sería peor.
- **No:** agregar **Viajes** a `NAVIGATION`. El ítem apuntaría a `/viajes`, que no existe. Entra con la spec del listado.
- **Sí:** `TripOriginField` propio en `trips`, con copy de origen. `LocationPinField` habla de "el punto del destino" y de anclar un destino a un lugar: reusarlo tal cual mentiría en pantalla.
- **No:** generalizar `LocationPinField` a un `PlacePinField` en `places`. Tocaría `LocationFormComponent`, que ya funciona, para ahorrar un componente.
- **Sí:** reusar `LocationMapCanvas`, `toMapsPosition` y `roundCoordinate` importándolos de `locations`. Ya es la convención del repo: `locations` importa de `places`.
- **Sí:** un solo mapa para el origen y la ruta. Dos mapas duplicarían la carga de la API de Google y obligarían al usuario a mirar en dos sitios.
- **Sí:** `SelectFormField` para el destino. Ya es buscable (`react-select`) y ya existe.
- **No:** modal con la tabla paginada de `locations`. Mucho estado para elegir un id.
- **Sí:** los destinos dados de baja se listan sin marca. Decisión explícita del usuario: el 400 del backend es el que informa.
- **Sí:** la ruta se dispara sola al tener origen y destino. Decisión explícita del usuario, **en contra de la recomendación del documento de referencia**, que pide que la dispare el usuario porque cada llamada se factura y no hay tope.
- **Sí:** `staleTime: Infinity`, `refetchOnWindowFocus: false` y `retry: false` como contrapeso. Con la `queryKey` compuesta por destino y coordenadas, un par ya consultado no vuelve a facturar y un 503 no se convierte en tres llamadas.
- **Sí:** `DirectionsError` con el `status` HTTP. Es lo único que permite separar en pantalla el 400 del 404 sin comparar cadenas de texto.
- **No:** leer el `status` desde `error.cause` con `isAxiosError` en la pantalla. Metería axios en la capa de presentación.
- **No:** tocar el `catch` de `searchPlaces` ni de `getPlaceById`. Funcionan y ninguno puede devolver 400.
- **Sí:** consumir `points` para dibujar y guardar `polyline` en el formulario. Son la misma línea: se dibuja la ya decodificada y se persiste la compacta.
- **Sí:** distancia y duración solo informativas. El backend no las pidió y `durationHours` no es un ETA.
- **No:** bloquear el guardado hasta calcular la ruta como regla aparte. `polyline` es requerido y sale de la ruta: el bloqueo ya está implícito.

---

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| La ruta se dispara desde un `useQuery` reactivo y cada llamada se factura contra la cuenta de Google, sin tope ni throttle del backend. Arrastrar el pin varias veces son varias rutas. | `queryKey` compuesta por destino y coordenadas con `staleTime: Infinity` y `retry: false`: nada se repite ni se reintenta solo. Queda escrito en las decisiones que se eligió el disparo automático a sabiendas; si el gasto se dispara, la vuelta atrás es un botón "Calcular ruta" y es un cambio de una línea en `enabled`. |
| El select carga los destinos con `limit=100`. Si hay más, los que sobran no aparecen y el usuario no se entera. | La constante `TRIP_DESTINATIONS_LIMIT` está en un solo sitio. La spec del listado la sustituye por un buscador contra el servidor cuando el volumen lo pida. |
| `points` viene en `[latitud, longitud]` y varias librerías de mapa esperan `[lng, lat]`. Invertirlo dibuja la ruta en el océano Índico. | `toRoutePath` es el único punto del front que convierte los pares, y el criterio de aceptación lo verifica de forma visible. |
| `@vis.gl/react-google-maps` no exporta `Polyline`: la línea se crea con `google.maps.Polyline` imperativo y puede quedar huérfana en el mapa al cambiar de ruta o desmontar. | La capa `TripRouteLayer` llama a `setMap(null)` en el `cleanup` de su `useEffect`. |
| El 503 tapa las dos cosas a la vez: búsqueda de direcciones y ruta comparten credencial del proveedor. El usuario se queda sin poder elegir origen y sin poder calcular ruta en el mismo momento. | El documento lo advierte y no hay plan B: no hay caché ni proveedor alternativo. La pantalla lo comunica con el mensaje del backend y ofrece reintentar. |
| `durationHours` se calcula sin tráfico y sobre límites de velocidad: en carretera guatemalteca real se queda corta de forma sistemática, y un operador puede planificar con ella. | La leyenda "Estimación por carretera, sin tráfico" es un criterio de aceptación y va en la tarjeta, no en un tooltip. |
| El formulario guarda `polyline` pero no las coordenadas del origen ni el `locationId`. Si el backend publica `/trips` esperando esos campos, el payload actual no le sirve. | `TripFormValues` ya los tiene y `buildTripPayload` es el único sitio que decide qué se envía: ampliarlo es cambiar una función. |
| `VITE_GOOGLE_API_KEY` ausente deja el mapa como un placeholder, pero el buscador y `/directions` siguen funcionando: la ruta se calcula y no se puede ver. | `LocationMapCanvas` ya muestra el aviso de clave faltante, y la tarjeta de distancia y duración sigue dando el dato sin mapa. |

---

## Lo que **no** entra en esta spec

- Las pantallas `IndexTrips`, `ShowTrip` y `UpdateTrip`, ni sus rutas.
- Los cuerpos reales de los cinco métodos del datasource de `trips`.
- `TripSchema`, `PaginatedTripsSchema` y cualquier tipo de lectura de un viaje.
- Vehículo, piloto, producto, libras, fecha programada, notas y estado del viaje.
- La entrada de **Viajes** en `NAVIGATION`.
- La cotización con `GET /api/freight-rates/quote`.
- Persistir distancia y duración en el viaje.
- Guard por rol sobre `/viajes/crear`.

Cada uno de esos, si entra, va en su propia spec.
