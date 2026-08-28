# Integración — Resumen de Packing List por orden

Endpoint público que devuelve el resumen consolidado del packing list asociado a una orden: totales por producto más los datos de destino y contenedor del CTPAT.

Resuelve automáticamente las dos variantes de packing list del sistema (producto y jugo), así que el consumidor no necesita saber de qué tipo es la orden.

---

## Endpoint

```
GET /api/ctpat/summary/{order}
```

| | |
|---|---|
| **Método** | `GET` |
| **Autenticación** | **Ninguna.** No requiere `Authorization` ni JWT. |
| **Base URL (local)** | `http://localhost:3000` |
| **Swagger** | `/documentation` → tag *Ctpats* |

### Parámetro de ruta

| Nombre | Tipo | Requerido | Descripción |
|---|---|---|---|
| `order` | `string` | Sí | Número de orden del packing list. Coincidencia **exacta**, sensible a mayúsculas y espacios. |

> La orden va en la URL, así que **hay que codificarla** si contiene espacios u otros caracteres especiales (`encodeURIComponent`).

---

## Respuesta `200`

```jsonc
{
  "statusCode": 200,
  "response": {
    "order": "ORD-123",
    "destination": "MIAMI, FL",
    "container": "MSCU1234567",
    "type": 1,
    "client": "CLIENTE X",
    "products": [
      {
        "product": "OKRA",
        "total_boxes": 120,
        "gross_weight": 1500,
        "net_weight": 1380
      }
    ],
    "totals": {
      "total_boxes": 120,
      "gross_weight": 1500,
      "net_weight": 1380
    }
  }
}
```

### Campos

| Campo | Tipo | Notas |
|---|---|---|
| `order` | `string` | La orden solicitada, tal como está guardada. |
| `destination` | `string` | Destino del CTPAT relacionado. Nunca nulo. |
| `container` | `string` | Número de contenedor del CTPAT (`Container.container`), no el id. |
| `type` | `number` | Tipo del CTPAT: `1` = producto, cualquier otro = jugo. |
| `client` | `string` | `customer` del packing list; si viene vacío, cae al `destination` del CTPAT. |
| `products` | `array` | Un renglón **por producto**, ya agrupado y sumado. Arreglo vacío si el packing list no tiene items. |
| `products[].product` | `string` | Nombre del producto (`Product.name`) o del jugo (`Juice.name`). |
| `products[].total_boxes` | `number` | Suma de cajas de todos los items de ese producto. |
| `products[].gross_weight` | `number` | Suma de peso bruto. |
| `products[].net_weight` | `number` | Suma de peso neto. |
| `products[].bottles` | `number` | **Solo en jugos.** Suma de botellas. Ausente en packing lists de producto. |
| `totals` | `object` | Totales generales, suma de todos los renglones de `products`. |
| `totals.bottles` | `number` | **Solo en jugos.** |

### Variante de jugos

Cuando la orden pertenece a un packing list de jugos, cada renglón y los totales traen además `bottles`:

```jsonc
{
  "statusCode": 200,
  "response": {
    "order": "ORD-456",
    "destination": "HOUSTON, TX",
    "container": "TCNU7654321",
    "type": 2,
    "client": "CLIENTE Y",
    "products": [
      {
        "product": "JUGO DE MANGO",
        "total_boxes": 15,
        "gross_weight": 165,
        "net_weight": 150,
        "bottles": 180
      }
    ],
    "totals": {
      "total_boxes": 15,
      "gross_weight": 165,
      "net_weight": 150,
      "bottles": 180
    }
  }
}
```

> **Recomendación para el consumidor:** no uses `type` para decidir si leer `bottles`. Verificá la presencia del campo (`"bottles" in row`), es más seguro.

---

## Respuesta `404`

Cuando ninguna de las dos tablas de packing list tiene esa orden:

```json
{
  "statusCode": 404,
  "message": "No se encontró un packing list con esa orden"
}
```

## Respuesta `500`

Error inesperado del servidor. Mismo formato:

```json
{
  "statusCode": 500,
  "message": "<mensaje del error>"
}
```

---

## Ejemplos

### cURL

```bash
# Orden simple
curl "http://localhost:3000/api/ctpat/summary/ORD-123"

# Orden con espacios: codificar
curl "http://localhost:3000/api/ctpat/summary/ORD%20123"
```

### fetch (browser / Node 18+)

```js
async function getPackingListSummary(order) {
    const res = await fetch(`${BASE_URL}/api/ctpat/summary/${encodeURIComponent(order)}`);
    const body = await res.json();

    if (res.status === 404) {
        return null; // la orden no existe
    }

    if (!res.ok) {
        throw new Error(body.message ?? 'Error al obtener el resumen del packing list');
    }

    return body.response;
}
```

### axios

```js
import axios from 'axios';

async function getPackingListSummary(order) {
    try {
        const { data } = await axios.get(`${BASE_URL}/api/ctpat/summary/${encodeURIComponent(order)}`);
        return data.response;
    } catch (error) {
        if (error.response?.status === 404) return null;
        throw error;
    }
}
```

---

## Comportamiento y detalles a tener en cuenta

- **Resolución producto → jugo.** Se busca primero en `PackingList` (producto); si no hay coincidencia, se busca en `PackingListJuice`. La primera que coincida es la que se devuelve.
- **La orden se asume única.** No hay constraint `UNIQUE` en la columna `order` de ninguna de las dos tablas; si por error existieran duplicados, se devuelve solo uno.
- **Match exacto.** No es una búsqueda parcial. Para búsquedas tipo *contiene*, existe el listado paginado `GET /api/ctpat?limit=&offset=&order=` (requiere JWT y solo busca en packing lists de producto).
- **Pesos como flotantes.** `gross_weight` y `net_weight` se almacenan como `float`, así que las sumas pueden traer decimales largos (p. ej. `1380.0000000000002`). Redondeá del lado del consumidor si lo vas a mostrar.
- **Agrupación por nombre de producto.** Si dos clientes llevan el mismo producto en la misma orden, quedan sumados en un solo renglón. El desglose por cliente no está en este endpoint; para eso usá `GET /api/packing-list/getPackingListTotals/{ctpatId}` o `GET /api/packing-list-juice/getPackingListJuiceItems/{ctpatId}` (ambos con JWT).
- **Packing list sin items.** Devuelve `200` con `products: []` y todos los totales en `0`. No es un `404`.
- **CORS.** La configuración actual (`src/config/cors.ts`) acepta cualquier origen, así que se puede consumir desde el navegador sin proxy.

---

## Referencias de código

| Capa | Archivo |
|---|---|
| Ruta | `src/routes/ctpatRoutes.ts` (registrada **antes** de `router.use(authenticate)`, por eso es pública) |
| Controlador | `src/controllers/CtpatController.ts` → `getPackingListSummary` |
| Orquestación | `src/services/CtpatService.ts` → `getPackingListSummaryByOrder` |
| Consulta producto | `src/services/PackingListService.ts` → `getPackingListSummaryByOrder` |
| Consulta jugo | `src/services/PackingListJuiceService.ts` → `getPackingListJuiceSummaryByOrder` |
| Forma de la respuesta | `src/resources/PackingListSummaryResource.ts` |
| Tipos | `src/types/index.ts` → `ProductSummary`, `SummaryTotals`, `PackingListSummary` |
| Documentación Swagger | `src/docs/ctpatDocs.ts` |
| Tests | `src/__tests__/ctpat.test.ts` (integración) y `src/__tests__/function.test.ts` (unitarios del resource) |
