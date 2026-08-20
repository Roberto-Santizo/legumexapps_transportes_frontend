# `GET /api/freight-rates/quote` — referencia de integración para el frontend

Referencia **de un solo endpoint**: la cotización de flete. Responde *cuánto cuesta la libra hasta este destino* y, si se mandan las libras, *cuánto cuesta el flete completo*.

Todo lo que hay aquí está verificado contra la implementación real (`FreightRateService::quote()`, `QuoteFreightRateRequest`, `FreightQuoteResource`) y contra su suite de tests. Los mensajes de error son **literales**: se pueden mostrar tal cual al usuario.

> Documentación OpenAPI viva: `/api/documentation` (operación `quoteFreightRate`).
> El resto del dominio (listado y CRUD de tarifas) está en `references/freight-rates-api.md`.

---

## 1. Lo mínimo que hay que saber antes de escribir código

1. **Se cotiza por DESTINO, no por coordenadas.** Se manda `locationId` (un destino dado de alta en `POST /api/locations`). `lat` y `lng` **ya no se aceptan por ningún nombre**: mandarlos no filtra, no valida y no cambia la respuesta.
2. **Las coordenadas del destino no influyen en el precio.** No hay distancia, kilometraje, geocodificación ni ruta. Corregir el pin de un destino **no cambia ninguna cotización**.
3. **El precio del combustible nunca viaja en la petición.** Solo se manda el **tipo** (`fuelType`); el importe sale siempre del `FuelPrice` con `status active` del servidor. Cualquier precio en la query se ignora por completo.
4. **No persiste nada.** Es una consulta pura: no crea filas, no reserva, no bloquea el precio. Mañana la misma consulta puede dar otro número.
5. **No tiene ningún 404.** Sus cuatro fallos de negocio son **400**; un `locationId`/`productId` inexistente es **422** (regla `exists`).
6. **Aquí nada es tolerante**, al contrario que el listado: un parámetro ausente, fuera del enum o mal formado es 422, no se ignora.
7. **El total autoritativo es el de la API.** Se multiplica con los **seis** decimales de `pricePerPound` y se redondea **solo al final**.
8. **Abierto a cualquier autenticado**, incluido un `carrier` sin empresa: la tarifa es un dato nacional de Legumex.

---

## 2. Autenticación y permisos

```
Authorization: Bearer {token}
Accept: application/json
```

| Rol | Puede cotizar |
|---|:--:|
| `administrator` | ✅ |
| `carrier` (con o sin empresa) | ✅ |
| `pilot` | ✅ |
| `manager` | ✅ |

No lleva `role:` ni `carrier.required`. Sin token, o con uno expirado, **401**:

```json
{ "statusCode": 401, "message": "El token de sesión no es válido o ha expirado", "data": null }
```

---

## 3. La petición

```
GET /api/freight-rates/quote?locationId=3&productId=7&fuelType=diesel&pounds=45000
```

| Query param | Obligatorio | Tipo | Reglas |
|---|:--:|---|---|
| `locationId` | ✅ | `integer` | Debe **existir** en `locations` (si no: 422) y estar **activo** (si no: 400). |
| `productId` | ✅ | `integer` | Mismas dos reglas que el destino. |
| `fuelType` | ✅ | `string` | Uno de `regular`, `premium`, `diesel`, `diesel_premium`. Fuera del enum: 422. |
| `pounds` | — | `number` | Entre `0.01` y `99999999.99`. Único parámetro opcional. |

Todo lo demás se **ignora**: `lat`, `lng`, `zoneId`, y cualquier intento de fijar el precio del combustible (`fuelPrice`, `price`, `currentFuelPrice`…). Ignorar significa exactamente eso: la respuesta es **idéntica** a la de la misma query sin ellos.

⚠️ **`pounds` no cambia la tarifa.** No hay escalas por volumen ni descuentos por cantidad: solo añade `total` a la respuesta.

⚠️ Solo se cotiza **un producto por llamada**. No hay cotización múltiple.

---

## 4. La respuesta

**200** — `"Cotización obtenida correctamente"`

```json
{
  "statusCode": 200,
  "message": "Cotización obtenida correctamente",
  "data": {
    "freightRateId": 12,
    "locationId": 3,
    "locationName": "BODEGA CENTRAL ESCUINTLA",
    "productId": 7,
    "productName": "BRÓCOLI",
    "fuelType": "diesel",
    "currentFuelPrice": "40.00",
    "appliedFuelMin": "35.00",
    "pricePerPound": "0.454120",
    "pounds": "45000.00",
    "total": "20435.40"
  }
}
```

Son **once claves, siempre las mismas y en este orden**. Ningún campo desaparece: sin `pounds`, `pounds` y `total` viajan `null` y **el resto es idéntico**.

| Campo | Tipo | Qué es |
|---|---|---|
| `freightRateId` | `number` | Id de la tarifa **que se aplicó** (`freight_rates.id`): la banda que ganó. Sirve para auditar. Ese id ya existía antes de la consulta. |
| `locationId` | `number` | El mismo que se envió. |
| `locationName` | `string` | Nombre del destino, **en mayúsculas**. Viaja resuelto para confirmarle al usuario qué se cotizó sin un segundo `GET`. |
| `productId` | `number` | El mismo que se envió. |
| `productName` | `string` | Nombre del producto, resuelto por relación. |
| `fuelType` | `string` | El mismo que se envió. |
| `currentFuelPrice` | `string` | Precio de combustible **vigente**, GTQ por galón, 2 decimales. Sale del `FuelPrice` `active`, nunca de la petición. |
| `appliedFuelMin` | `string` | `fuelMin` de la banda aplicada, GTQ por galón, 2 decimales. |
| `pricePerPound` | `string` | Tarifa aplicada, GTQ por libra, **6 decimales**. |
| `pounds` | `string \| null` | Las libras enviadas, normalizadas a 2 decimales. `null` si no se enviaron. |
| `total` | `string \| null` | `pounds × pricePerPound` redondeado a 2 decimales. `null` si no se enviaron libras. |

⚠️ **Los importes viajan como `string`, no como `number`.** Es deliberado: un `float` de JavaScript no representa exactamente `0.454120`. Parsea solo en el último momento, para formatear.

**Coordenadas: no viajan.** Quien mandó el `locationId` ya las tiene.

**Unidades fijas del dominio, no configurables:** `currentFuelPrice` y `appliedFuelMin` en **GTQ por galón**, `pricePerPound` en **GTQ por libra**, `pounds` en **libras**, `total` en **GTQ**. No hay moneda alternativa, kilos, litros, IVA, recargos ni redondeo comercial.

### Tipo TypeScript sugerido

```ts
export type FuelType = 'regular' | 'premium' | 'diesel' | 'diesel_premium';

export interface FreightQuote {
  freightRateId: number;
  locationId: number;
  locationName: string;
  productId: number;
  productName: string;
  fuelType: FuelType;
  /** GTQ por galón, 2 decimales, como string. */
  currentFuelPrice: string;
  /** GTQ por galón, 2 decimales, como string. */
  appliedFuelMin: string;
  /** GTQ por libra, 6 decimales, como string. */
  pricePerPound: string;
  /** Libras, 2 decimales; null si no se enviaron. */
  pounds: string | null;
  /** GTQ, 2 decimales; null si no se enviaron libras. */
  total: string | null;
}

export interface QuoteParams {
  locationId: number;
  productId: number;
  fuelType: FuelType;
  pounds?: number;
}
```

---

## 5. Qué hace, en este orden

El orden **es parte del contrato**: cada paso tiene su propio mensaje de error.

1. **Destino activo.** El id inexistente ya lo atrapó el 422; aquí solo queda el inactivo → **400** `"El destino seleccionado no está activo"`.
2. **Producto activo.** Un producto inactivo se trata como inexistente → **400** `"El producto seleccionado no está activo"`.
3. **Precio de combustible vigente.** El `FuelPrice` con `status active` de ese tipo. Si no hay ninguno → **400** `"No existe un precio vigente para el combustible indicado"`, aunque existan tarifas cotizadas.
4. **Tarifas vivas del trío** (`destino + producto + fuelType`). Si no hay ninguna → **400** `"No existe tarifa cotizada para ese producto en ese destino"`. Una tarifa eliminada no cuenta: si era la única, el trío se queda sin tarifa.
5. **Elección de banda** (§6). **Este paso nunca falla.**
6. **Total**, solo si llegó `pounds`.

---

## 6. Banda abierta: cómo se elige la tarifa

Cada tarifa es una **banda abierta**: rige **desde** su `fuelMin` **hacia arriba**, hasta que exista otra banda mayor del mismo trío. No hay `fuelMax` y no hay huecos.

> De las bandas vivas del trío, gana **la de mayor `fuelMin` que sea menor o igual** que `currentFuelPrice` — el límite es **inclusivo**. Si el combustible vigente está **por debajo de todas**, se aplica **la de menor `fuelMin`**, sin error.

Con bandas desde `28.00` y desde `35.00`:

| Diésel vigente | Banda aplicada |
|---|---|
| `40.00` | `35.00` |
| `35.00` (exacto) | `35.00` |
| `30.00` | `28.00` |
| `25.00` | `28.00` ← por debajo de todas: aplica la más barata, **no es error** |

Por eso **la cotización nunca falla por el precio del combustible**.

### ⚠️ Una banda vieja se aplica en silencio

Es el riesgo más caro del dominio. `currentFuelPrice: "60.00"` junto a `appliedFuelMin: "28.00"` significa que esa banda lleva mucho sin recotizarse y que el flete se está cobrando **por debajo del costo real**. La API responde **200** con un número que parece perfectamente válido.

**La distancia entre `currentFuelPrice` y `appliedFuelMin` es la única señal disponible.** El sistema no avisa por ningún otro medio. Si la pantalla lo permite, vale la pena pintar un aviso cuando esa distancia sea grande.

---

## 7. El cálculo del total: dónde se pierden 185 quetzales

**No recalcules el total en pantalla con `pricePerPound` redondeado.** La API multiplica con los seis decimales completos y redondea **solo al final**:

| Cálculo | Resultado |
|---|---|
| `45000 × 0.454120` → redondeo final | **20 435.40** ✅ (lo que devuelve la API) |
| `45000 × 0.45` (tarifa redondeada a 2 decimales) | 20 250.00 ❌ |

**185 quetzales de diferencia en un solo flete.** Muestra siempre el `total` que devuelve la API.

---

## 8. Errores

### Sobre estándar (400, 401)

```json
{ "statusCode": 400, "message": "El destino seleccionado no está activo", "data": null }
```

### Validación (422) — **formato distinto**

Es el formato nativo de Laravel, **no** el sobre `{ statusCode, message, data }`:

```json
{
  "message": "El destino es obligatorio",
  "errors": { "locationId": ["El destino es obligatorio"] }
}
```

Prepara los **dos** formatos.

### Tabla de mensajes literales

**422 — validación**

| Parámetro | Situación | Mensaje |
|---|---|---|
| `locationId` | ausente | `El destino es obligatorio` |
| `locationId` | no entero | `El destino debe ser un identificador numérico` |
| `locationId` | no existe | `El destino seleccionado no existe` |
| `productId` | ausente | `El producto es obligatorio` |
| `productId` | no entero | `El producto debe ser un identificador numérico` |
| `productId` | no existe | `El producto seleccionado no existe` |
| `fuelType` | ausente | `El tipo de combustible es obligatorio` |
| `fuelType` | fuera del enum | `El tipo de combustible no es válido` |
| `pounds` | no numérico | `Las libras deben ser un número` |
| `pounds` | `0` o negativo | `Las libras deben ser mayores que cero` |
| `pounds` | `> 99999999.99` | `Las libras no pueden superar las 99999999.99` |

**400 — negocio (los cuatro únicos, en orden de comprobación)**

| # | Situación | Mensaje |
|---|---|---|
| 1 | El destino existe pero tiene `status false` | `El destino seleccionado no está activo` |
| 2 | El producto existe pero tiene `status false` | `El producto seleccionado no está activo` |
| 3 | Ese `fuelType` no tiene ninguna fila `active` | `No existe un precio vigente para el combustible indicado` |
| 4 | El trío no tiene ninguna tarifa viva | `No existe tarifa cotizada para ese producto en ese destino` |

### ⚠️ 422 vs 400 vs 404

| Caso | Respuesta |
|---|---|
| `locationId` / `productId` **que no existe** | **422** (regla `exists`) |
| `locationId` / `productId` que existe pero está **inactivo** | **400** (regla de negocio) |
| Cualquier caso | **nunca 404** |

Mandar `lat` y `lng` **no produce 422 por sí mismo**: se ignoran, y lo que falla es la ausencia de `locationId`.

---

## 9. Flujo completo en el frontend

```
GET  /api/places?search=escuintla   → el usuario busca la dirección
POST /api/locations                 → alta del destino (googlePlaceId + coordenadas)   [admin]
GET  /api/products                  → elegir el producto
GET  /api/freight-rates/quote?locationId=&productId=&fuelType=[&pounds=]
```

El destino se da de alta **una vez** y se reutiliza en todas las cotizaciones. La API **nunca llama a Google** durante la cotización.

---

## 10. Checklist de implementación

- [ ] Mandar el token en `Authorization: Bearer`.
- [ ] Selector de **destino** alimentado por `GET /api/locations` (solo activos), no un mapa con coordenadas.
- [ ] Selector de **producto** alimentado por `GET /api/products` (solo activos).
- [ ] Selector de `fuelType` con los cuatro valores del enum.
- [ ] `pounds` opcional: la pantalla debe funcionar mostrando solo la tarifa por libra.
- [ ] **Mostrar el `total` que devuelve la API**, sin recalcularlo.
- [ ] Tratar los importes como `string` hasta el momento de formatear.
- [ ] Manejar los **dos** formatos de error (sobre y `errors`).
- [ ] Diferenciar 422 (id inexistente) de 400 (existe pero inactivo) en el mensaje al usuario.
- [ ] No cachear la cotización como si fuera un precio fijo: no es una reserva.
- [ ] Considerar un aviso visual cuando `currentFuelPrice` esté muy por encima de `appliedFuelMin`.

---

## 11. Lo que este endpoint **no** hace (para no diseñarlo en el front)

- **No cotiza por coordenadas.** `lat`/`lng` no existen en el contrato.
- **No calcula distancia, kilometraje ni ruta.**
- **No acepta un precio de combustible hipotético.** No hay simulación *"¿y si el diésel subiera a 45?"*.
- **No persiste nada:** ni viaje, ni carga, ni reserva, ni historial de cotizaciones.
- **No cotiza varios productos** ni varios destinos en una llamada.
- **No aplica impuestos, IVA, recargos ni descuentos por volumen.**
- **No avisa** de que la banda aplicada se quedó vieja (§6).
- **No devuelve las coordenadas** del destino.
- **No expone `carrierId`:** la tarifa no pertenece a ninguna empresa.
