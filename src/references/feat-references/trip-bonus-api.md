# Bonificación del viaje — referencia de integración para el frontend

Referencia del cambio **Bonificación del viaje** de la API de Legumex Transportes: la empresa transportista fija la **bonificación** del viaje (en GTQ) en el mismo acto en que lo toma, `PATCH /api/trips/{trip}/assignment`, junto al piloto, el vehículo y la primera carga de combustible.

**No es un dominio nuevo y no hay rutas nuevas.** Es una columna del viaje (`trips.bonus`) que se escribe en `/assignment`, se lee en el detalle del viaje, suma en el costo directo y sale en los Excel de viajes.

Todo lo que hay aquí está verificado contra la implementación real (rama `spec-39-trip-emergency-expenses`, cambio sin spec) y contra su suite de tests (`TripTest`, `TripServiceTest`, `TripCostTest`, `TripCostServiceTest`, `TripToolsTest`, `ReportServiceTest`, `ReportTest`). Los mensajes de error son literales: se pueden mostrar tal cual al usuario.

> ⚠️ **Cambio incompatible en el body de `/assignment`, sin periodo de gracia.** Pasa de **4 a 5 campos obligatorios**: un front que no mande `bonus` recibe **422** en **todas** sus asignaciones. El despliegue del front debe ir junto al del back.

> Documentación OpenAPI viva: `/api/documentation` (schemas `AssignTripRequest`, `Trip`, `TripCost` y `TripCostBonus`).

---

## 1. Lo mínimo que hay que saber antes de escribir código

1. **`bonus` es obligatorio en `/assignment`.** Numérico, de `0` a `99999999.99`. `0` es válido y significa «sin bonificación». Ausente, `null`, negativo, no numérico o por encima del tope → **422**.
2. **No es un calco de las cargas de combustible.** No hay tabla, ni filas, ni endpoint propio, ni `POST /api/trips/{trip}/bonus`. Es **un solo monto por viaje**.
3. **El piloto no confirma nada.** La bonificación cuenta desde que se guarda: no hay `isConfirmed`, ni `/confirm`, ni estado pendiente.
4. **Reasignar la sobrescribe, sin historial.** Cada `/assignment` válido pisa el valor anterior. Ojo con el contraste: la carga de combustible de cada `/assignment` **se acumula** (otra fila), la bonificación **se reemplaza**.
5. **Solo se cambia reasignando.** El `PATCH /api/trips/{trip}` general del administrador **ignora** `bonus` en silencio (200 sin tocarla), y `/assignment` solo funciona mientras el viaje siga `pending`. Una vez arrancado, la bonificación queda fija por API.
6. **`null` no es cero.** `bonus: null` significa «el viaje sigue en la bolsa» o «se asignó antes de que existiera este campo» (no hubo backfill). `"0.00"` significa que la empresa capturó cero.
7. **`shipment` nunca la ve**: le llega `bonus: null` en el detalle y su Excel no trae la columna.
8. **Sale como cadena de dos decimales** (`"250.00"`), como el resto del dinero del proyecto: parsear antes de operar.

---

## 2. Autenticación y permisos

Nada cambia en los middlewares. Escribir la bonificación es lo mismo que asignar el viaje:

| Acción | `administrator` | `manager` | `carrier` | `pilot` | `export` | `user` | `shipment` |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Fijar `bonus` (`PATCH /{trip}/assignment`) | 403 | 403 | ✅ + empresa | 403 | 403 | 403 | 403 |
| Leer `bonus` en `GET /api/trips/{trip}` (y respuestas de escritura) | ✅ | ✅ | ✅ (su ámbito) | ✅ (su viaje) | ✅ | ✅ | `null` |
| Leer `bonus` en `GET /api/trips/{trip}/cost` | ✅ | ✅ | ✅ (su ámbito) | 403 | ✅ | ✅ | 403 |
| Columna en `GET /api/reports/trips` | ✅ | ✅ | ✅ | 403 | ✅ | ✅ | sin columna |

- **El piloto asignado sí ve su bonificación** en el detalle de su viaje. El costo directo le sigue vetado (revela su salario).
- **El administrador no puede fijarla ni corregirla**: no asigna por ninguna vía y su `PATCH` general la ignora.

---

## 3. `PATCH /api/trips/{trip}/assignment` — tomar el viaje con su bonificación

Solo `carrier` con empresa registrada. El resto del contrato (ámbito, guardas, transacción con bloqueo, carga de combustible, viático opcional) **no cambia**.

### Body

```json
{
  "pilotId": 12,
  "vehicleId": 8,
  "fuelGallons": 45.5,
  "fuelType": "diesel",
  "bonus": 250,
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
| **`bonus`** | ✅ **nuevo** | Numérico, **0 ≤ x ≤ 99999999.99**, en GTQ. Se guarda con dos decimales. Sin validación cruzada contra nada (salario, distancia, tarifa). |
| `expenseAmount` | — | Sin cambios (SPEC 31). |
| `expenseDescription` | — | Sin cambios (SPEC 31). |

### Efectos

- `bonus` se escribe en el **mismo UPDATE** que `pilotId`, `vehicleId` y `assignedById`, dentro de la misma transacción. Si cualquier guarda falla (403/400) o la validación da 422, **no se guarda nada**: ni la tripulación, ni la carga, ni la bonificación.
- **Reasignar** (mismo viaje `pending`, misma empresa) **sobrescribe** `bonus` con el nuevo valor. No queda rastro del anterior.
- La respuesta (`200 · Viaje asignado correctamente`) ya trae `bonus` con el valor guardado.

### Respuestas

**200** · `Viaje asignado correctamente` · **422** `bonus` ausente o inválido (o cualquier otro campo) · el resto de 400/403/404 sin cambios.

Ejemplo de 422 sin `bonus`:

```json
{
  "message": "La bonificación es obligatoria",
  "errors": {
    "bonus": ["La bonificación es obligatoria"]
  }
}
```

---

## 4. Dónde se lee la bonificación

### 4.1 `Trip` (detalle y escrituras): nueva clave `bonus`

`GET /api/trips/{trip}` y las respuestas de `POST`, `PATCH`, `DELETE`, `/assignment`, `/start` y `/finish` ganan **una clave**, `bonus`, justo después de `totalEmergencyExpensesAmount` y antes de `createdAt`:

```json
{
  "totalFuelGallons": "0.00",
  "totalExpensesAmount": "0.00",
  "totalEmergencyExpensesAmount": "0.00",
  "bonus": "250.00",
  "createdAt": "27-08-2026 09:14:03 AM",
  "updatedAt": "05-10-2026 10:02:44 AM",
  "deletedAt": null
}
```

| Campo | Tipo | Notas |
|---|---|---|
| `bonus` | `string \| null` | Cadena de dos decimales. `null` si el viaje sigue en la bolsa, si se asignó antes de existir el campo, y **siempre** para `shipment`. |

Conteo de claves: el `Trip` pasa de **43 a 44** claves (de 44 a **45** en `GET /api/trips/{trip}`, que añade `positions` al final salvo para el piloto).

**El listado no cambia**: `TripListItem` (`GET /api/trips` y `GET /api/trips/current`) sigue con sus 20 claves y **no trae `bonus`**. Para mostrarla hay que pedir el detalle.

### 4.2 `GET /api/trips/{trip}/cost`: nuevo bloque `bonus`

El costo directo pasa de **cinco a seis componentes** y de **9 a 10 claves** en la raíz. El bloque `bonus` va entre `emergencyExpenses` y `pilot`:

```json
{
  "tripId": 42,
  "order": "ORD-1024",
  "traveledHours": "2.50",
  "fuel": { "gallons": "35.00", "byType": [ ... ], "subtotal": "1347.50" },
  "expenses": { "count": 1, "subtotal": "450.00" },
  "emergencyExpenses": { "count": 0, "subtotal": "0.00" },
  "bonus": { "amount": "300.00", "subtotal": "300.00" },
  "pilot": { "pilotId": 7, "pilotName": "Juan Pérez", "monthlySalary": "4500.00", "subtotal": "15.63" },
  "vehicle": { "vehicleId": 3, "plate": "C-123BCD", "monthlyInsuranceCost": "350.00", "subtotal": "1.22" },
  "totalCost": "2114.35"
}
```

| Campo | Tipo | Notas |
|---|---|---|
| `bonus.amount` | `string \| null` | La bonificación del viaje, el mismo valor que `bonus` del `Trip`. **`null` si el viaje se asignó antes de existir el campo** (sin backfill). |
| `bonus.subtotal` | `string` | Igual a `amount`, o `"0.00"` cuando `amount` es `null`. **Nunca `null`.** |

- **`totalCost` ahora suma seis subtotales** (combustible + viáticos + gastos emergentes + **bonificación** + salario + seguro), ya redondeados: el desglose sigue cuadrando a la vista.
- La bonificación **no se prorratea**: entra entera, no por horas.
- **Bloque propio**: no se mezcla con viáticos (`expenses`) ni con gastos emergentes.
- El bloque **nunca es `null`**: sin dato vale `{ "amount": null, "subtotal": "0.00" }`.

### 4.3 Excel de viajes

| Exportación | Cambio |
|---|---|
| `GET /api/reports/trips` (descarga binaria, SPEC 38) | Nueva columna **«Bonificación (Q)»** justo después de las 22 columnas base y **antes** de «Productos»/«Total de cajas». Valor numérico (Excel suma); celda vacía si el viaje no tiene bonificación. **Todos los roles salvo `shipment`**, que se queda sin la columna. |
| `export_trips` del asistente | Nueva columna **«Bonificación (Q)»** al final: de 17 a **18** columnas. |

Columnas resultantes de `GET /api/reports/trips` por rol:

| Rol | Columnas |
|---|---|
| `administrator`, `manager`, `export` | 22 base + Bonificación + Productos + Total de cajas = **25** |
| `carrier`, `user` | 22 base + Bonificación = **23** |
| `shipment` | 22 base + Productos + Total de cajas = **24** |

⚠️ Si el front lee el Excel por **índice de columna**, los productos se movieron una posición a la derecha para los roles que ven la bonificación.

### 4.4 Asistente (`POST /api/assistant/chat`)

Sin cambios en la API del chat. El modelo ahora:

- ve `bonus` en la tool `trip` (detalle del viaje);
- ve el bloque `bonus` en `trip_cost` y lo explica como sexto componente del costo directo;
- exporta la columna en `export_trips`;
- trata `bonus: null` como «sin dato», no como cero, y nunca la suma con viáticos ni gastos emergentes.

---

## 5. Tipos TypeScript sugeridos

```ts
export interface AssignTripBody {
  pilotId: number;
  vehicleId: number;
  /** SPEC 27 */
  fuelGallons: number;
  fuelType: 'regular' | 'premium' | 'diesel' | 'diesel_premium';
  /** Bonificación en GTQ. OBLIGATORIA. 0 ≤ x ≤ 99999999.99; 0 = sin bonificación. Reasignar la sobrescribe. */
  bonus: number;
  /** SPEC 31, opcionales. */
  expenseAmount?: number | null;
  expenseDescription?: string | null;
}

/** Añadir a la interfaz Trip, después de totalEmergencyExpensesAmount. */
export interface TripBonusField {
  /** Cadena de dos decimales. null = en la bolsa, anterior al campo, o rol shipment. */
  bonus: string | null;
}

/** Nuevo bloque de TripCost, entre emergencyExpenses y pilot. */
export interface TripCostBonus {
  /** null = viaje asignado antes de existir el campo. */
  amount: string | null;
  /** Nunca null: "0.00" cuando amount es null. */
  subtotal: string;
}
```

---

## 6. Tabla de mensajes de error (literales)

### 422 — `PATCH /api/trips/{trip}/assignment`, en `errors.bonus`

| Caso | Mensaje |
|---|---|
| Ausente o `null` | `La bonificación es obligatoria` |
| No numérico | `La bonificación debe ser un número` |
| Negativo | `La bonificación no puede ser negativa` |
| Mayor a 99999999.99 | `La bonificación no puede superar 99999999.99` |

No hay mensajes 400/403/404 nuevos: los de `/assignment` siguen igual (ver `references/trips-api.md` §8).

---

## 7. Checklist de implementación en el frontend

### Pantalla de asignación (`carrier`)
- [ ] Añadir el campo **Bonificación (Q)** al formulario de asignación, **obligatorio**, numérico, mínimo 0. Permitir `0`.
- [ ] Mandar `bonus` en **todas** las llamadas a `/assignment` (también al reasignar): sin él es 422.
- [ ] Al reasignar, **precargar el campo con el `bonus` actual** del detalle y avisar de que el nuevo valor **reemplaza** al anterior.
- [ ] Pintar el 422 de `errors.bonus` junto al campo.

### Detalle del viaje
- [ ] Mostrar `bonus` formateado como moneda (`parseFloat` antes de operar).
- [ ] Mostrar `null` como «Sin bonificación registrada» / «—», **no** como `Q 0.00`.
- [ ] No ofrecer edición de la bonificación al administrador: su `PATCH` la ignora.
- [ ] No buscar `bonus` en el listado: solo viene en el detalle.

### Costo del viaje
- [ ] Añadir la fila **Bonificación** al desglose, entre gastos emergentes y salario del piloto.
- [ ] Si `bonus.amount === null`, avisar de que falta el dato (como con los demás insumos en `null`).
- [ ] No recalcular `totalCost` en el cliente: ya incluye la bonificación.

### Excel
- [ ] Si se procesa el Excel descargado por índice, contar con la columna nueva (posición 23, antes de los productos) salvo para `shipment`.

### App del piloto
- [ ] Opcional: mostrar al piloto su bonificación en el detalle de su viaje (le llega). No hay nada que confirmar.

---

## 8. Lo que este cambio **no** hace

- **No hay endpoint propio** de bonificación ni forma de editarla fuera de `/assignment`.
- **No hay historial**: reasignar pisa el valor sin rastro.
- **No hay confirmación** del piloto ni estado pendiente.
- **No se puede cambiar** una vez que el viaje arrancó (`/assignment` exige `pending`).
- **No sale en el listado** de viajes (`GET /api/trips`, `GET /api/trips/current`), ni en el tablero (`/api/dashboard/*`), ni hay filtro u orden por bonificación.
- **No hubo backfill**: los viajes asignados antes de este cambio quedan con `bonus: null`.
- **No se prorratea** en el costo ni se cruza con el salario del piloto: entra entera como componente propio.
- **No dispara notificaciones** nuevas: el push de `trip.assigned` no cambia de texto.
