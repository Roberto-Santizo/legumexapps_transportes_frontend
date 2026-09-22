# Costo del viaje — referencia de integración para el frontend

Referencia completa del dominio **Trip Costs** de la API de Legumex Transportes: **un solo endpoint REST**, `GET /api/trips/{trip}/cost`, que devuelve el desglose del costo directo en quetzales de un viaje **ya finalizado**.

> ⚠️ **Antes de nada: esto es COSTO DIRECTO, no «lo que costó el viaje».** Son exactamente cuatro componentes —combustible confirmado, viáticos confirmados, salario del piloto prorrateado y seguro del vehículo prorrateado— y **no incluye**: depreciación del vehículo, mantenimiento (`vehicle_expenses`), llantas, peajes, administración, ni ingreso, margen o rentabilidad. Etiquetar la cifra como «costo total del viaje» en la interfaz sería engañoso.

Es el **primer dominio del proyecto que solo lee y solo calcula**: no hay tabla, ni migración, ni columna, ni caché. El número se recalcula en cada lectura —pero **no cambia entre dos lecturas**, porque sus insumos son históricos y están congelados.

Todo lo que hay aquí está verificado contra la implementación real (Laravel 13) y contra su suite de tests (`TripCostTest`, `TripCostServiceTest`, la sección `trip_cost` de `TripToolsTest`). Los mensajes de error son literales: se pueden mostrar tal cual al usuario.

> Documentación OpenAPI viva: `/api/documentation`, tag **Trip Costs**.

---

## 1. Lo mínimo que hay que saber antes de escribir código

1. **Solo viajes `finished`.** Un viaje `pending` o `in_route` responde **400**, aunque ya tenga cargas y viáticos confirmados. No existe el costo parcial ni una bandera `isFinal`: si necesitas seguir el gasto de un viaje en curso, hoy se piden `GET /api/trips/{trip}/fuels` y `GET /api/trips/{trip}/expenses` y se suma en el cliente.
2. **El piloto no puede ver el costo.** Cualquier `pilot` recibe **403**, **incluido el asignado al viaje**: el desglose revela su propio salario mensual. Igual que con el rastro y las paradas, y al revés que `/fuels` y `/expenses`, donde el dato sí es suyo.
3. **El orden de las guardas es contrato: 404 → 403 → 400.** Un viaje `in_route` **de otra empresa** responde **403**, no 400. Un viaje **borrado** responde **404** (no el 400 «El viaje ya fue eliminado» de las rutas de escritura): esta es una ruta de lectura y sigue a `GET /api/trips/{trip}`.
4. **Todo importe y todo decimal sale como `string` de dos decimales** (`"1347.50"`, `"2.50"`). Hay que `parseFloat` antes de operar. **La única excepción es `expenses.count`**, que es un entero de verdad.
5. **Un insumo que falta vale `0.00` y se ve como `null`, nunca un error.** Sin piloto o vehículo asignados, sin salario capturado, sin `traveledHours` o sin precio de combustible para la fecha de una carga, el insumo sale en `null`, su subtotal en `"0.00"` y la respuesta **sigue siendo 200**. El endpoint no falla por un catálogo incompleto, y puedes avisar al usuario porque ves el hueco.
6. **Un total bajo casi siempre es un insumo que falta, no un viaje barato.** Antes de pintar la cifra, mira si `traveledHours` es `null` (viaje cerrado antes de la spec de métricas reales: los **dos** prorrateos salen en `"0.00"` aunque el salario y el seguro tengan valor) y si algún `pricePerGallon` es `null`.
7. **Los galones sí suman aunque no haya precio.** Una carga anterior al primer precio capturado de su tipo aporta `0.00` al importe pero **sí cuenta** en `gallons`. Un bloque con galones y sin importe es la señal visible de que falta historial de precios.
8. **El mes son 720 horas (30 × 24)**, no una jornada laboral. El salario y el seguro se reparten sobre el mes completo, así que **el prorrateo de un viaje corto es simbólico**: 4 500 / 720 × 2,5 h = **15,63 GTQ**. Es la decisión de diseño, no un error: un viaje de madrugada no puede costar el triple que el mismo viaje de día.
9. **`traveledHours` sale una sola vez, en la raíz.** Es el **mismo** multiplicador de `pilot` y de `vehicle`; repetirlo dentro de los dos bloques invitaría a creer que pueden diferir. Es tiempo **bruto**, sin descontar las paradas.
10. **El precio del combustible es el histórico, el de la fecha de cada carga**, no el de hoy, y el estado de esa fila de precios **no importa** (una fila `inactive` es precisamente el precio que estuvo vigente). Capturar el precio del mes siguiente **no mueve** el costo de un viaje ya cerrado.
11. **`fuel.byType` agrupa por tipo pero multiplica por carga.** Dos cargas del mismo tipo a ambos lados de un cambio de precio se cotizan cada una a su precio y caen en **un solo elemento** con los importes ya sumados; su `pricePerGallon` es entonces el **precio medio ponderado**, no un precio real de tarifa.
12. **`totalCost` es la suma exacta de los cuatro subtotales tal como salen.** Se suman ya redondeados, nunca se redondea al final: el desglose **siempre** cuadra con el total a la vista.
13. **Es un endpoint de detalle, uno por pantalla.** No existe `GET /api/trips/costs`, ni clave de costo en el listado de viajes, ni filtros u orden por costo: pintar el costo de cien viajes en una tabla dispararía seiscientas consultas.
14. **No hay ni un query param ni cuerpo.** Cualquier parámetro enviado **se ignora en silencio**, con 200, nunca 422.
15. **La salida es camelCase** y **las fechas del proyecto van en `d-m-Y h:i:s A`, no en ISO 8601** — aunque este endpoint concreto **no devuelve ninguna fecha**: su único dato temporal es `traveledHours`, un número en horas.
16. **Toda respuesta viaja en un sobre** `{ statusCode, message, data }`. Este endpoint **no tiene 422**.

---

## 2. Autenticación y permisos

El endpoint exige el token JWT que devuelve el login:

```
Authorization: Bearer {token}
Accept: application/json
```

Sin él la respuesta es **401** con `El token de sesión no es válido o ha expirado`.

La ruta lleva **`jwt.auth` a secas**: sin `role:` y **sin `carrier.required`**. Pero no la alcanzan los cuatro roles — el veto al piloto lo aplica el service, no el middleware.

| Acción | `administrator` | `carrier` | `pilot` | `manager` |
|---|---|---|---|---|
| `GET` consultar el costo | ✅ todos los viajes | ✅ los de su ámbito | **403 siempre** | ✅ todos los viajes |
| Crear / editar / borrar un costo | — | — | — | — |

No existe ninguna acción de escritura para ningún rol: nada de lo que devuelve este endpoint está guardado en ninguna tabla.

### El ámbito de lectura es el del dominio de viajes y no se reescribe aquí

Es **exactamente** el mismo que el del detalle del viaje, el rastro y las paradas:

- `administrator` y `manager` alcanzan **cualquier** viaje.
- Un `carrier` alcanza los viajes que **asignó su empresa** (la bolsa libre son `pending` y nunca llegan a tener costo: caen en el 400).
- Fuera de ámbito es **403**, *no* 404: se le confirma que el viaje existe.
- Cualquier `pilot` recibe **403**, incluido el asignado a ese viaje.

---

## 3. El objeto `TripCost`

```json
{
  "tripId": 42,
  "order": "ORD-1024",
  "traveledHours": "2.50",
  "fuel": {
    "gallons": "35.00",
    "byType": [
      { "fuelType": "diesel", "gallons": "35.00", "pricePerGallon": "38.50", "amount": "1347.50" }
    ],
    "subtotal": "1347.50"
  },
  "expenses": { "count": 2, "subtotal": "450.00" },
  "pilot": { "pilotId": 7, "pilotName": "Juan Pérez", "monthlySalary": "4500.00", "subtotal": "15.63" },
  "vehicle": { "vehicleId": 3, "plate": "C-123BCD", "monthlyInsuranceCost": "350.00", "subtotal": "1.22" },
  "totalCost": "1814.35"
}
```

**Ocho claves de primer nivel en camelCase y ninguna más**, en ese orden. Cuatro de ellas son objetos.

### Raíz

| Campo | Tipo | Notas para el front |
|---|---|---|
| `tripId` | `number` | El mismo id que va en la URL. Viaja aquí para que un objeto de costo suelto en el estado siga sabiendo a qué viaje pertenece. |
| `order` | `string` | Número de orden del viaje, en MAYÚSCULAS. Es el mismo `order` del detalle y del listado, repetido para titular la pantalla sin pedir el viaje entero. **No es único**: dos viajes pueden compartir orden. |
| `traveledHours` | `string \| null` | ⚠️ **String** de dos decimales. Horas **reales** del viaje, tiempo **bruto** sin descontar paradas. Es el **único** multiplicador de `pilot` y `vehicle`. **`null` = viaje cerrado antes de la spec de métricas reales** (no hubo backfill): en ese caso los dos prorrateos valen `"0.00"` aunque sus insumos tengan valor. |
| `totalCost` | `string` | ⚠️ **String** de dos decimales. Suma **exacta** de los cuatro subtotales tal como salen en esta misma respuesta. |

### `fuel`

| Campo | Tipo | Notas para el front |
|---|---|---|
| `gallons` | `string` | Galones **confirmados** del viaje, todos los tipos. Es el mismo número que `totalFuelGallons` del detalle del viaje y que `totalGallons` de `GET /api/trips/{trip}/fuels`. ⚠️ **Puede haber galones con importe cero.** |
| `byType` | `array` | Un elemento por tipo de combustible presente. **Lista vacía (`[]`), nunca `null`**, cuando no hay cargas confirmadas: puedes mapear sin guarda. |
| `subtotal` | `string` | Suma de los `amount` de `byType`, ya redondeados uno a uno. |

Cada elemento de `byType`:

| Campo | Tipo | Notas para el front |
|---|---|---|
| `fuelType` | `string` | **Valor crudo del enum en inglés**, sin traducir: `regular`, `premium`, `diesel` o `diesel_premium`. Traducirlo para la interfaz es del front. |
| `gallons` | `string` | Galones confirmados de ese tipo. Incluye los de las cargas que no pudieron cotizarse. |
| `pricePerGallon` | `string \| null` | Con un único precio vigente es exactamente ese precio; si el viaje cruzó un cambio de precio es el **medio ponderado** de las cargas cotizadas. **`null` = ninguna carga de ese tipo encontró precio** para su fecha → `amount` es `"0.00"` mientras `gallons` sigue contando. Falta historial de precios, no es que fuera gratis. |
| `amount` | `string` | Suma de galones × precio vigente de **cada** carga, redondeada una sola vez al final del bloque. |

### `expenses`

| Campo | Tipo | Notas para el front |
|---|---|---|
| `count` | `number` | ⚠️ **El único entero de verdad de toda la respuesta.** Cuántos viáticos **confirmados** tiene el viaje. `0` si no hay ninguno. |
| `subtotal` | `string` | Suma de los viáticos confirmados. Es el **mismo** número que `totalExpensesAmount` del detalle del viaje y que el `totalAmount` de `GET /api/trips/{trip}/expenses`. |

### `pilot`

| Campo | Tipo | Notas para el front |
|---|---|---|
| `pilotId` | `number \| null` | `null` en un viaje finalizado sin piloto (solo alcanzable por el `PATCH` general del administrador). |
| `pilotName` | `string \| null` | Para pintar el bloque sin cruzar con el viaje. `null` si no hay piloto. |
| `monthlySalary` | `string \| null` | Salario mensual base **vigente cuando arrancó el viaje**, leído de la bitácora de salarios. ⚠️ **Su `null` tiene tres causas indistinguibles**: no hay piloto; el piloto **ya no está vinculado** a la empresa que tomó el viaje (se cambió de transportista y el vínculo desapareció); o el vínculo existe pero nunca se le asignó salario. En los tres casos `subtotal` es `"0.00"` y la respuesta es 200. |
| `subtotal` | `string` | `monthlySalary / 720 × traveledHours`. Vale `"0.00"` cuando falta el salario **o** cuando faltan las horas: un `"0.00"` aquí **no** significa que el piloto no cobre. |

### `vehicle`

| Campo | Tipo | Notas para el front |
|---|---|---|
| `vehicleId` | `number \| null` | `null` en un viaje finalizado sin vehículo. |
| `plate` | `string \| null` | Placa en MAYÚSCULAS. `null` si no hay vehículo. |
| `monthlyInsuranceCost` | `string \| null` | Costo mensual del seguro, leído del vehículo **tal como está hoy**. ⚠️ **Es el único insumo del desglose que NO es histórico**: el vehículo no guarda bitácora de su seguro, así que cambiarlo **sí** mueve el costo de los viajes ya cerrados de ese vehículo. `null` solo cuando no hay vehículo. |
| `subtotal` | `string` | `monthlyInsuranceCost / 720 × traveledHours`. Misma base de 720 h que el salario. |

### Tipos TypeScript sugeridos

```ts
export type FuelType = 'regular' | 'premium' | 'diesel' | 'diesel_premium';

export interface TripCostFuelType {
  /** Valor crudo del enum en inglés: traducir en el front. */
  fuelType: FuelType;
  /** String de 2 decimales. Incluye galones no cotizados. */
  gallons: string;
  /** null = ninguna carga del tipo encontró precio para su fecha. */
  pricePerGallon: string | null;
  amount: string;
}

export interface TripCost {
  tripId: number;
  order: string;
  /** String de 2 decimales. null = viaje cerrado antes de que existieran las métricas reales. */
  traveledHours: string | null;
  fuel: {
    gallons: string;
    /** [] cuando no hay cargas confirmadas; nunca null. */
    byType: TripCostFuelType[];
    subtotal: string;
  };
  expenses: {
    /** El único number de la respuesta. */
    count: number;
    subtotal: string;
  };
  pilot: {
    pilotId: number | null;
    pilotName: string | null;
    /** null = sin piloto, piloto desvinculado, o salario sin asignar. */
    monthlySalary: string | null;
    subtotal: string;
  };
  vehicle: {
    vehicleId: number | null;
    plate: string | null;
    /** Único insumo NO histórico: cambiarlo mueve costos ya cerrados. */
    monthlyInsuranceCost: string | null;
    subtotal: string;
  };
  /** Suma exacta de los cuatro subtotales tal como salen. */
  totalCost: string;
}

const money = (value: string | null): number => (value === null ? 0 : parseFloat(value));

/** Un componente con insumo ausente: pintar un aviso en vez de un cero limpio. */
export const missingInputs = (cost: TripCost): string[] => {
  const holes: string[] = [];

  if (cost.traveledHours === null) { holes.push('Sin horas reales: salario y seguro no se pudieron prorratear.'); }
  if (cost.pilot.monthlySalary === null) { holes.push('Sin salario del piloto.'); }
  if (cost.vehicle.monthlyInsuranceCost === null) { holes.push('Sin seguro del vehículo.'); }
  if (cost.fuel.byType.some((t) => t.pricePerGallon === null)) { holes.push('Hay combustible sin precio capturado para su fecha.'); }

  return holes;
};
```

---

## 4. Formato de las respuestas

### Éxito — el sobre de siempre, con un **objeto** en `data`

**No es un listado**: no hay `total`, ni `currentPage`, ni `lastPage`, ni paginación de ningún tipo.

```json
{
  "statusCode": 200,
  "message": "Costo del viaje obtenido correctamente",
  "data": { /* TripCost */ }
}
```

### Listado sin paginar / paginado — **no aplican aquí**

El resto de la API devuelve listados en `data` como array, y con `limit` numérico aplana `total`, `currentPage` y `lastPage` **en la raíz** del sobre (no bajo `meta`). **Este endpoint nunca lo hace**: `data` es siempre un objeto y `limit` se ignora.

### Errores de negocio (400, 401, 403, 404) — sobre

```json
{ "statusCode": 400, "message": "El costo solo está disponible para viajes finalizados", "data": null }
```

### Error de validación (422) — **no ocurre en este endpoint**

El resto de la API usa para el 422 el formato estándar de Laravel `{ message, errors }`, **distinto del sobre**:

```json
{ "message": "El campo es obligatorio.", "errors": { "campo": ["El campo es obligatorio."] } }
```

**Aquí no aparece nunca**: no hay cuerpo, ni query param, ni FormRequest.

---

## 5. Endpoints

### 5.1 `GET /api/trips/{trip}/cost` — consultar el costo de un viaje finalizado

Cualquier autenticado **salvo `pilot`**, acotado por el ámbito del dominio de viajes. `{trip}` es el `id` del viaje, **en la URL**: no hay listado global de costos ni query param `tripId`.

**Sin cuerpo.**

**Query params:** ninguno.

| Param | Efecto |
|---|---|
| cualquiera | **Se ignora en silencio.** `?limit=5&currency=USD&includeDepreciation=true` devuelve el costo con 200, nunca 422. |

**Respuestas:**

| Código | Situación | `message` |
|:--:|---|---|
| 200 | Costo devuelto (posiblemente con insumos en `null`) | `Costo del viaje obtenido correctamente` |
| 400 | El viaje es `pending` o `in_route` | `El costo solo está disponible para viajes finalizados` |
| 401 | Sin token o expirado | `El token de sesión no es válido o ha expirado` |
| 403 | Quien consulta es `pilot` (incluido el asignado) | `No tienes permisos para consultar el costo de un viaje` |
| 403 | `carrier` fuera de ámbito | `No puedes acceder a un viaje que no pertenece a tu empresa transportista` |
| 404 | El viaje no existe **o está borrado** | `El viaje no existe` |

⚠️ **Un 200 no garantiza que los cuatro componentes tengan valor.** Un viaje finalizado sin cargas, sin viáticos, sin tripulación y sin horas responde 200 con `totalCost: "0.00"` y todos los insumos en `null`.

### 5.2 De dónde sale cada número (no es un endpoint)

| Componente | Fórmula | Qué lo mueve después |
|---|---|---|
| `fuel` | Σ por **carga confirmada** de `gallons × precio vigente en su fecha de carga` | **Nada.** El precio histórico está congelado; capturar precios nuevos no lo toca. Confirmar una carga pendiente **sí** lo sube. |
| `expenses` | Σ de los viáticos **confirmados** | **Nada**, salvo que el piloto confirme un viático pendiente. |
| `pilot` | `salario vigente al arrancar el viaje / 720 × traveledHours` | **Nada.** Un aumento posterior no mueve el costo: se lee la bitácora de salarios. Sin ninguna fila anterior al viaje se usa el salario actual del vínculo. |
| `vehicle` | `seguro mensual / 720 × traveledHours` | ⚠️ **Editar el seguro del vehículo SÍ lo mueve**, también en viajes ya cerrados: es el único insumo sin historial. |

**Lo confirmado es lo que cuenta**, en los dos casos: una carga o un viático registrados pero sin confirmar existen (salen en `/fuels` y `/expenses` con `isConfirmed: false`) pero **no suman aquí**, exactamente igual que en `totalFuelGallons` y `totalExpensesAmount` del detalle del viaje. Los números nunca se contradicen entre pantallas.

---

## 6. Tabla de mensajes de error (literales)

Se pueden mostrar tal cual al usuario; ya están en español.

| Código | Mensaje | Cuándo |
|:--:|---|---|
| 400 | `El costo solo está disponible para viajes finalizados` | El viaje es `pending` o `in_route`, aunque ya tenga cargas y viáticos confirmados |
| 401 | `El token de sesión no es válido o ha expirado` | Sin token, manipulado o expirado |
| 403 | `No tienes permisos para consultar el costo de un viaje` | Cualquier `pilot`, **incluido el asignado al viaje** |
| 403 | `No puedes acceder a un viaje que no pertenece a tu empresa transportista` | `carrier` que pide un viaje asignado por otra empresa, o `carrier` sin empresa vinculada |
| 404 | `El viaje no existe` | Id inexistente **o** viaje con baja lógica (indistinguibles) |

### Mensaje de éxito

| Código | Mensaje |
|:--:|---|
| 200 | `Costo del viaje obtenido correctamente` |

No hay 201, no hay 422 y no hay ningún otro 400: este dominio solo lee.

---

## 7. Checklist de implementación en el frontend

- [ ] Cliente HTTP con `Authorization: Bearer` y `Accept: application/json`.
- [ ] **Pedir el costo solo cuando el viaje esté `finished`.** Ocultar o deshabilitar la pestaña de costo en `pending` e `in_route` en vez de dejar que el usuario choque contra el 400.
- [ ] **Ocultar la vista de costo para el rol `pilot`** (el 403 del servidor es la red, no la UX).
- [ ] `parseFloat` sobre **todos** los importes, `gallons` y `traveledHours` antes de operar. Recordar que `expenses.count` **ya es** un número.
- [ ] Etiquetar la cifra como **«costo directo»** y no como «costo total»: añadir una nota de qué no incluye (depreciación, mantenimiento, peajes, administración).
- [ ] **Avisar de los insumos en `null`** en vez de pintar un cero limpio: `traveledHours: null` explica por qué salario y seguro son `0.00`, y un `pricePerGallon: null` explica galones sin importe.
- [ ] Traducir `fuelType` a español (`diesel` → «Diésel», `diesel_premium` → «Diésel premium», etc.): llega crudo en inglés.
- [ ] Mapear `fuel.byType` sin guarda de `null`: es `[]` cuando no hay cargas.
- [ ] **No recalcular el total en el cliente**: `totalCost` ya cuadra con los cuatro subtotales tal como salen. Si lo recalculas, hazlo sobre los strings ya redondeados y no sobre valores crudos.
- [ ] Explicar la base de **720 horas** donde se muestren `pilot.subtotal` y `vehicle.subtotal`: un viaje corto da cantidades muy pequeñas y parecerá un error si no se dice.
- [ ] **No pedir este endpoint dentro de un bucle sobre el listado de viajes.** Es un endpoint de detalle: una pantalla, un viaje.
- [ ] No construir UI de alta, edición, recálculo ni borrado del costo: **no existen esos endpoints**.
- [ ] No esperar paginación: `data` es un objeto y `limit`/`page` se ignoran.

---

## 8. Lo que este dominio **no** hace (para no diseñarlo en el front)

- **No se crea, ni se edita, ni se borra nada.** Sin `POST`, sin `PATCH`, sin `DELETE`, sin recálculo manual y sin caché que invalidar.
- **No incluye depreciación del vehículo.** Decisión explícita: el precio de compra no entra ni prorrateado.
- **No imputa mantenimiento.** Los `vehicle_expenses` del vehículo no se reparten entre los viajes de su rango de fechas: la fecha no prueba a qué viaje pertenece un cambio de llantas.
- **No hay ingreso, margen ni rentabilidad.** Las tarifas de flete cotizan por libra y el viaje no guarda peso: no hay forma de calcular el ingreso con lo que existe hoy.
- **No hay costo de viajes en curso**, ni parcial, ni con bandera `isFinal`.
- **No hay costo por kilómetro** ni ningún otro ratio derivado.
- **No se persiste ni se congela.** Ninguna columna nueva en el viaje, ni snapshot al finalizar.
- **No hay listado de costos** (`GET /api/trips/costs`), ni filtros, ni orden por costo en `GET /api/trips`.
- **No hay agregados de costo en el tablero**: `/api/dashboard` no gana costo por empresa, por mes ni por vehículo.
- **No hay exportación a Excel del costo.**
- **No hay moneda**: todo es GTQ por convención, sin columna ni parámetro. No hay conversión.
- **El viaje no cambió de forma**: el detalle sigue con sus 42 claves y el listado con sus 19 — sin `totalCost` en ninguno de los dos.
- **No hay alertas ni umbrales**: nadie recibe aviso por un viaje que costó de más.
- **No hay desglose por parada, por tramo ni por día**: el costo es del viaje entero.
- **Sin backfill de precios de combustible**: las cargas anteriores al primer precio capturado de su tipo se quedan con `pricePerGallon: null` para siempre, salvo que alguien capture un precio con fecha anterior.

---

## 9. Consumo desde el asistente

El mismo desglose está disponible en lenguaje natural a través de `POST /api/assistant/chat`: el agente expone la herramienta **`trip_cost(tripId)`**, que devuelve exactamente este objeto con el mismo ámbito por rol. El endpoint del chat ya veta al `pilot` por middleware, así que no hace falta hacer nada en el front.

El prompt del agente le obliga a presentarlo como **costo directo**, a avisar cuando un insumo sale en `null` y a explicar que un viaje sin terminar no tiene costo. Preguntas como «¿cuánto costó el viaje de la orden ORD-1024?» se resuelven solas.
