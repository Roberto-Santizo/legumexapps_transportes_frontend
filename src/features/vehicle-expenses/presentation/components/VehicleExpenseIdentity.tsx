/**
 * Piezas de lectura del gasto. La flota ya compone sus cifras como
 * instrumentos —la placa como placa, el kilometraje como odómetro—, así que el
 * acumulado se compone igual: un tablero oscuro con los dígitos en mono. Leído
 * junto al odómetro dice lo que un jefe de taller quiere saber de una unidad:
 * cuánto ha corrido y cuánto ha costado.
 *
 * El color se gasta en un solo eje, la **naturaleza**: preventivo es lo
 * planeado y correctivo es lo que se rompió. La categoría, que tiene 22
 * valores, se queda en gris para que la tabla no parezca un semáforo.
 */

import {
    formatExpenseQuetzales,
    isInvoiceImage,
    VEHICLE_EXPENSE_CATEGORY_LABELS,
    VEHICLE_EXPENSE_NATURE_LABELS
} from "@/features/vehicle-expenses/vehicle-expenses";
import { FileText, Image, ShieldCheck, TriangleAlert } from "lucide-react";

type CategoryProps = {
    category: string;
}

export function VehicleExpenseCategoryTag({ category }: CategoryProps) {
    return (
        <span className="inline-flex items-center rounded-md border border-line bg-canvas px-2 py-1 text-xs whitespace-nowrap text-ink-muted">
            {VEHICLE_EXPENSE_CATEGORY_LABELS[category] ?? category}
        </span>
    );
}

type NatureProps = {
    nature: string;
}

/**
 * Preventivo y correctivo no son dos etiquetas del mismo rango: uno es un
 * gasto decidido y el otro una avería. Por eso solo el segundo lleva color, y
 * el primero se pinta como una marca al margen.
 */
export function VehicleExpenseNatureTag({ nature }: NatureProps) {
    const label = VEHICLE_EXPENSE_NATURE_LABELS[nature] ?? nature;

    if (nature === 'corrective') {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-danger/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] whitespace-nowrap text-danger">
                <TriangleAlert size={12} aria-hidden />
                {label}
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] whitespace-nowrap text-ink-muted">
            <ShieldCheck size={12} aria-hidden />
            {label}
        </span>
    );
}

type AmountProps = {
    amount: string;
}

/** El importe llega como cadena y se parsea solo para formatearlo. */
export function VehicleExpenseAmount({ amount }: AmountProps) {
    return (
        <span className="font-mono text-sm tabular-nums whitespace-nowrap text-ink">
            {formatExpenseQuetzales(amount)}
        </span>
    );
}

type DateProps = {
    /** Ya viene formateada de la API (`d-m-Y`): se pinta tal cual, sin parsear. */
    expenseDate: string;
}

export function VehicleExpenseDate({ expenseDate }: DateProps) {
    return (
        <span className="font-mono text-sm tabular-nums whitespace-nowrap text-ink">
            {expenseDate}
        </span>
    );
}

type InvoiceProps = {
    isInvoiced: boolean;
    invoiceUrl: string | null;
    /** `jpg`, `png` o `pdf`. Decide qué se abre; la extensión de la URL no. */
    invoiceType: string | null;
}

/**
 * La factura no es un estado del gasto, es un documento: o está adjunta y se
 * puede abrir, o no existe. Por eso el facturado se pinta como un enlace y el
 * no facturado como un hueco, sin insignia ni color —el color de esta tabla se
 * gasta entero en la naturaleza—.
 *
 * El archivo se abre en otra pestaña y nunca se descarga a la fuerza: la URL es
 * pública, viene del bucket y no la sirve esta API.
 */
export function VehicleExpenseInvoiceLink({ isInvoiced, invoiceUrl, invoiceType }: InvoiceProps) {
    if (!isInvoiced || !invoiceUrl) {
        return (
            <span className="font-mono text-[11px] tracking-[0.16em] text-ink-subtle">
                —<span className="sr-only">Sin factura</span>
            </span>
        );
    }

    return (
        <a
            href={invoiceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-line bg-canvas px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] whitespace-nowrap text-ink-muted transition-colors hover:border-ink-subtle hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
        >
            {isInvoiceImage(invoiceType)
                ? <Image size={12} aria-hidden />
                : <FileText size={12} aria-hidden />}
            Ver factura
        </a>
    );
}

type AuthorProps = {
    registeredBy: string;
    /** Cuándo se capturó el gasto, que no es cuándo ocurrió. */
    createdAt: string;
}

export function VehicleExpenseAuthor({ registeredBy, createdAt }: AuthorProps) {
    return (
        <span className="flex flex-col gap-0.5">
            <span className="text-sm whitespace-nowrap text-ink">{registeredBy}</span>

            <span className="font-mono text-[10px] tracking-[0.12em] whitespace-nowrap text-ink-subtle">
                {createdAt}
            </span>
        </span>
    );
}

type TotalProps = {
    /** `totalAmount`: suma de **todos** los gastos filtrados, no los de la página. */
    totalAmount: string;
    /** Conteo de registros. Es `total` cuando se pagina, no el acumulado. */
    count: number;
    filtered: boolean;
}

/**
 * El acumulado y el conteo son las dos cifras que la API manda juntas y que se
 * confunden con más facilidad: una es dinero y la otra registros. Se separan
 * en dos alturas distintas —el dinero en el tablero, el conteo en el pie— para
 * que nunca se lean como lo mismo.
 */
export function VehicleExpenseTotal({ totalAmount, count, filtered }: TotalProps) {
    return (
        <div className="flex flex-col gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
                Gasto acumulado
            </span>

            <span className="w-fit rounded bg-ink-deep px-3 py-1.5 font-mono text-lg font-medium tracking-[0.08em] tabular-nums text-canvas">
                {formatExpenseQuetzales(totalAmount)}
            </span>

            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-subtle">
                {count === 1 ? '1 gasto' : `${count} gastos`}
                {filtered ? ' · con los filtros aplicados' : ' · historial completo'}
            </span>
        </div>
    );
}
