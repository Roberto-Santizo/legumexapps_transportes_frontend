# Seguro de la carga del viaje — referencia de integración para el frontend

Referencia del cambio **Seguro de la carga** de la API de Legumex Transportes. La empresa transportista fija el **seguro de la carga** del viaje (en GTQ) al tomarlo con `PATCH /api/trips/{trip}/assignment`, junto al piloto, el vehículo, la primera carga de combustible y la bonificación.

**No es un dominio nuevo y no hay rutas nuevas.** Es una columna del viaje (`trips.cargo_insurance`) que funciona igual que la bonificación (`references/trip-bonus-api.md`): se escribe en `/assignment`, se lee en el detalle del viaje, suma en el costo directo y sale en los Excel de viajes. Es un concepto **propio**. No se suma con la bonificación y no es el seguro del vehículo (`monthlyInsuranceCost`, que es mensual y se prorratea por horas).

Todo lo que hay aquí está verificado contra la implementación real (rama `spec-39-trip-emergency-expenses`, cambio sin spec) y contra su suite de tests (`TripTest`, `TripServiceTest`, `TripCostTest`, `TripCostServiceTest`, `TripToolsTest`, `ReportServiceTest`, `ReportTest`). Los mensajes de error son literales: se pueden mostrar tal cual al usuario.

> ⚠️ **Cambio incompatible en el body de `/assignment`, sin periodo de gracia.** El body pasa de **5 a 6 campos obligatorios**. Un front que no mande `cargoInsurance` recibe **422** en **todas** sus asignaciones. El front y el back se despliegan juntos.

> Documentación OpenAPI viva: `/api/documentation` (schemas `AssignTripRequest`, `Trip`, `TripCost` y `TripCostCargoInsurance`).

---

## 1. Lo mínimo que hay que saber antes de escribir código

1. **`cargoInsurance` es obligatorio en `/assignment`.** Es numérico, de `0` a `99999999.99`. `0` es válido y significa «sin seguro». Si falta, es `null`, es negativo, no es numérico o supera el tope, la respuesta es **422**.
2. **Es un solo monto por viaje.** No hay tabla, ni filas, ni endpoint propio.
3. **El piloto no confirma nada.** El seguro cuenta desde que se guarda.
4. **Reasignar lo sobrescribe, sin historial.** Cada `/assignment` válido reemplaza el valor anterior (la carga de combustible, en cambio, se acumula).
5. **Solo cambia al reasignar.** El `PATCH /api/trips/{trip}` general del administrador **lo ignora** sin avisar: responde 200 y no lo toca. Además, `/assignment` solo funciona mientras el viaje siga `pending`.
6. **`null` no es cero.** `cargoInsurance: null` significa una de dos cosas: «el viaje sigue en la bolsa» o «se asignó antes de que existiera este campo» (no hubo backfill). `"0.00"` significa que la empresa capturó cero.
7. **`shipment` nunca lo ve.** Le llega `cargoInsurance: null` en el detalle, y su Excel no trae la columna.
8. **Sale como cadena de dos decimales** (`"150.00"`). Hay que convertirlo a número antes de operar.
9. **No se mezcla con `bonus`.** Son dos campos, dos bloques de costo y dos columnas de Excel.

---

## 2. Autenticación y permisos

Los middlewares no cambian. Quien puede asignar el viaje es quien puede escribir el seguro:

| Acción | `administrator` | `manager` | `carrier` | `pilot` | `export` | `user` | `shipment` |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Fijar `cargoInsurance` (`PATCH /{trip}/assignment`) | 403 | 403 | ✅ + empresa | 403 | 403 | 403 | 403 |
| Leer `cargoInsurance` en `GET /api/trips/{trip}` (y respuestas de escritura) | ✅ | ✅ | ✅ (su ámbito) | ✅ (su viaje) | ✅ | ✅ | `null` |
| Leer `cargoInsurance` en `GET /api/trips/{trip}/cost` | ✅ | ✅ | ✅ (su ámbito) | 403 | ✅ | ✅ | 403 |
| Columna en `GET /api/reports/trips` | ✅ | ✅ | ✅ | 403 | ✅ | ✅ | sin columna |

- **El piloto asignado sí ve el seguro** en el detalle de su viaje. El costo directo le sigue vetado porque revela su salario.
- **El administrador no puede fijarlo ni corregirlo.**

---

## 3. `PATCH /api/trips/{trip}/assignment`: tomar el viaje con su seguro de la carga

Solo `carrier` con empresa registrada. El resto del contrato no cambia: ámbito, guardas, transacción con bloqueo, carga de combustible, bonificación y viático opcional.

### Body

```json
{
  "pilotId": 12,
  "vehicleId": 8,
  "fuelGallons": 45.5,
  "fuelType": "diesel",
  "bonus": 250,
  "cargoInsurance": 150,
  "expenseAmount": 350,
  "expenseDescription": "Alimentación y peajes"
}
```

| Campo | Obligatorio | Reglas |
|---|:--:|---|
| `pilotId` | ✅ | Sin cambios. |
| `vehicleId` | ✅ | Sin cambios. |
| `fuelGallons` | ✅ | Sin cambios (SPEC 27). |
| `fuelType` | ✅ | Sin cambios (SPEC 27). |
| `bonus` | ✅ | Sin cambios (bonificación). |
| **`cargoInsurance`** | ✅ **nuevo** | Numérico, **0 ≤ x ≤ 99999999.99**, en GTQ. Se guarda con dos decimales. No se valida contra ningún otro dato. |
| `expenseAmount` | — | Sin cambios (SPEC 31). |
| `expenseDescription` | — | Sin cambios (SPEC 31). |

### Efectos

- `cargoInsurance` se escribe en el **mismo UPDATE** que `pilotId`, `vehicleId`, `assignedById` y `bonus`, dentro de la misma transacción. Si una guarda falla (403/400) o la validación da 422, **no se guarda nada**.
- **Reasignar** (mismo viaje `pending`, misma empresa) **sobrescribe** el valor anterior sin dejar rastro.
- La respuesta (`200 · Viaje asignado correctamente`) ya trae `cargoInsurance` con el valor guardado.

### Respuestas

- **200** · `Viaje asignado correctamente`.
- **422** si `cargoInsurance` (o cualquier otro campo) falta o no es válido.
- El resto de 400/403/404 no cambia.

Ejemplo de 422 sin `cargoInsurance`:

```json
{
  "message": "El seguro de la carga es obligatorio",
  "errors": {
    "cargoInsurance": ["El seguro de la carga es obligatorio"]
  }
}
```

---

## 4. Dónde se lee el seguro de la carga

### 4.1 `Trip` (detalle y escrituras): nueva clave `cargoInsurance`

`GET /api/trips/{trip}` gana **una clave**, `cargoInsurance`, justo después de `bonus` y antes de `createdAt`. También la ganan las respuestas de `POST`, `PATCH`, `DELETE`, `/assignment`, `/start` y `/finish`:

```json
{
  "totalFuelGallons": "0.00",
  "totalExpensesAmount": "0.00",
  "totalEmergencyExpensesAmount": "0.00",
  "bonus": "250.00",
  "cargoInsurance": "150.00",
  "createdAt": "27-08-2026 09:14:03 AM",
  "updatedAt": "05-10-2026 10:02:44 AM",
  "deletedAt": null
}
```

| Campo | Tipo | Notas |
|---|---|---|
| `cargoInsurance` | `string \| null` | Cadena de dos decimales. Es `null` si el viaje sigue en la bolsa o se asignó antes de existir el campo. Para `shipment` es **siempre** `null`. |

Conteo de claves: el `Trip` pasa de **44 a 45** claves. En `GET /api/trips/{trip}` pasa de 45 a **46**, porque ese endpoint añade `positions` al final (salvo para el piloto, que ve 45).

**El listado no cambia.** `TripListItem` (`GET /api/trips` y `GET /api/trips/current`) sigue con sus 20 claves y **no trae `cargoInsurance`**.

### 4.2 `GET /api/trips/{trip}/cost`: nuevo bloque `cargoInsurance`

El costo directo pasa de **seis a siete componentes** y de **10 a 11 claves** en la raíz. El bloque `cargoInsurance` va entre `bonus` y `pilot`:

```json
{
  "tripId": 42,
  "order": "ORD-1024",
  "traveledHours": "2.50",
  "fuel": { "gallons": "35.00", "byType": [ ... ], "subtotal": "1347.50" },
  "expenses": { "count": 1, "subtotal": "450.00" },
  "emergencyExpenses": { "count": 0, "subtotal": "0.00" },
  "bonus": { "amount": "300.00", "subtotal": "300.00" },
  "cargoInsurance": { "amount": "125.50", "subtotal": "125.50" },
  "pilot": { "pilotId": 7, "pilotName": "Juan Pérez", "monthlySalary": "4500.00", "subtotal": "15.63" },
  "vehicle": { "vehicleId": 3, "plate": "C-123BCD", "monthlyInsuranceCost": "350.00", "subtotal": "1.22" },
  "totalCost": "2239.85"
}
```

| Campo | Tipo | Notas |
|---|---|---|
| `cargoInsurance.amount` | `string \| null` | Tiene el mismo valor que `cargoInsurance` del `Trip`. Es **`null` si el viaje se asignó antes de existir el campo**. |
| `cargoInsurance.subtotal` | `string` | Igual a `amount`, o `"0.00"` cuando `amount` es `null`. **Nunca es `null`.** |

- **`totalCost` suma los siete subtotales** ya redondeados: combustible, viáticos, gastos emergentes, bonificación, **seguro de la carga**, salario y seguro del vehículo.
- El seguro de la carga **no se prorratea**: entra entero.
- **No confundir con `vehicle.monthlyInsuranceCost`**, que es el seguro mensual del vehículo prorrateado por horas.
- El bloque **nunca es `null`**. Sin dato vale `{ "amount": null, "subtotal": "0.00" }`.

### 4.3 Excel de viajes

| Exportación | Cambio |
|---|---|
| `GET /api/reports/trips` (descarga binaria, SPEC 38) | Nueva columna **«Seguro de carga (Q)»**, justo después de «Bonificación (Q)» y **antes** de «Productos»/«Total de cajas». Es numérica (Excel la suma) y queda vacía si el viaje no tiene el dato. La ven **todos los roles salvo `shipment`**. |
| `export_trips` del asistente | Nueva columna **«Seguro de carga (Q)»** al final: pasa de 18 a **19** columnas. |

Columnas resultantes de `GET /api/reports/trips` por rol:

| Rol | Columnas |
|---|---|
| `administrator`, `manager`, `export` | 22 base + Bonificación + Seguro de carga + Productos + Total de cajas = **26** |
| `carrier`, `user` | 22 base + Bonificación + Seguro de carga = **24** |
| `shipment` | 22 base + Productos + Total de cajas = **24** |

⚠️ Si el front lee el Excel **por índice de columna**: para los roles que ven dinero, «Productos» y «Total de cajas» se corren **una posición más** a la derecha (índices 24 y 25, contando desde 0).

### 4.4 Asistente (`POST /api/assistant/chat`)

La API del chat no cambia. El modelo ahora:

- ve `cargoInsurance` en la tool `trip`;
- ve el bloque `cargoInsurance` en `trip_cost` y lo explica como el séptimo componente;
- exporta la columna en `export_trips`;
- trata `null` como «sin dato», no como cero, y no lo suma con la bonificación ni lo confunde con el seguro del vehículo.

---

## 5. Tipos TypeScript sugeridos

```ts
export interface AssignTripBody {
  pilotId: number;
  vehicleId: number;
  fuelGallons: number;
  fuelType: 'regular' | 'premium' | 'diesel' | 'diesel_premium';
  /** Bonificación en GTQ. OBLIGATORIA. */
  bonus: number;
  /** Seguro de la carga en GTQ. OBLIGATORIO. 0 ≤ x ≤ 99999999.99; 0 = sin seguro. Reasignar lo sobrescribe. */
  cargoInsurance: number;
  expenseAmount?: number | null;
  expenseDescription?: string | null;
}

/** Añadir a la interfaz Trip, después de bonus. */
export interface TripCargoInsuranceField {
  /** Cadena de dos decimales. null = en la bolsa, anterior al campo, o rol shipment. */
  cargoInsurance: string | null;
}

/** Nuevo bloque de TripCost, entre bonus y pilot. */
export interface TripCostCargoInsurance {
  /** null = viaje asignado antes de existir el campo. */
  amount: string | null;
  /** Nunca null: "0.00" cuando amount es null. */
  subtotal: string;
}
```

---

## 6. Tabla de mensajes de error (literales)

### 422: `PATCH /api/trips/{trip}/assignment`, en `errors.cargoInsurance`

| Caso | Mensaje |
|---|---|
| Ausente o `null` | `El seguro de la carga es obligatorio` |
| No numérico | `El seguro de la carga debe ser un número` |
| Negativo | `El seguro de la carga no puede ser negativo` |
| Mayor a 99999999.99 | `El seguro de la carga no puede superar 99999999.99` |

No hay mensajes 400/403/404 nuevos.

---

## 7. Checklist de implementación en el frontend

### Pantalla de asignación (`carrier`)
- [ ] Añadir el campo **Seguro de la carga (Q)** junto a la bonificación: **obligatorio**, numérico, mínimo 0. Permitir `0`.
- [ ] Mandar `cargoInsurance` en **todas** las llamadas a `/assignment`, también al reasignar.
- [ ] Al reasignar, **precargar el campo con el valor actual** y avisar de que el nuevo valor **reemplaza** al anterior.
- [ ] Mostrar el 422 de `errors.cargoInsurance` junto al campo.

### Detalle del viaje
- [ ] Mostrar `cargoInsurance` formateado como moneda, en una fila propia (separada de la bonificación).
- [ ] Mostrar `null` como «Sin seguro registrado» o «—», **no** como `Q 0.00`.
- [ ] No ofrecer edición al administrador.
- [ ] No buscar `cargoInsurance` en el listado: solo viene en el detalle.

### Costo del viaje
- [ ] Añadir la fila **Seguro de la carga** al desglose, entre bonificación y salario del piloto.
- [ ] Rotularla de forma que no se confunda con el **seguro del vehículo**.
- [ ] Si `cargoInsurance.amount === null`, avisar de que falta el dato.
- [ ] No recalcular `totalCost` en el cliente: ya incluye el seguro de la carga.

### Excel
- [ ] Si el Excel descargado se procesa por índice, contar con la columna nueva (después de «Bonificación (Q)»), salvo para `shipment`.

---

## 8. Lo que este cambio **no** hace

- **No hay endpoint propio** ni otra forma de editar el seguro fuera de `/assignment`.
- **No guarda historial**: reasignar reemplaza el valor sin dejar rastro.
- **No hay confirmación** del piloto.
- **No se puede cambiar** una vez arrancado el viaje.
- **No aparece** en el listado de viajes ni en el tablero, y no hay filtro ni orden por este campo.
- **No hubo backfill**: los viajes asignados antes de este cambio quedan en `null`.
- **No se relaciona** con la bonificación, con el seguro del vehículo ni con el valor de la carga o de los productos terminados.
- **No dispara notificaciones** nuevas.
