/**
 * Las líneas de producto terminado del alta del viaje (SPEC 37): sin al menos
 * una, el `POST` es 422.
 *
 * El selector solo ofrece los SKU del cliente elegido —otro es 400— y **al
 * cambiar de cliente se vacían las líneas**: las del cliente anterior ya no
 * valen. Un producto elegido en una fila desaparece de las demás, porque
 * repetirlo también es 422.
 */

import { useFieldArray, useWatch, type Control, type FieldErrors, type UseFormRegister } from "react-hook-form";
import type { TripFormValues } from "@/features/trips/trips";
import {
    TRIP_PRODUCTS_CATALOG_LIMIT,
    TRIP_PRODUCT_BOXES_VALIDATION,
    toTripFinishedProductOptions
} from "@/features/trip-finished-products/trip-finished-products";
import { finishedProductProvider } from "@/features/finished-products/finished-products";
import { SelectFormField, TextFormField } from "@/features/shared/shared";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Plus, Trash2 } from "lucide-react";

type Props = {
    register: UseFormRegister<TripFormValues>;
    control: Control<TripFormValues>;
    errors: FieldErrors<TripFormValues>;
}

const EMPTY_LINE = { finishedProductId: undefined, boxes: undefined };

export function TripProductLinesField({ register, control, errors }: Props) {
    const { fields, append, remove, replace } = useFieldArray({
        control,
        name: 'products',
        rules: { required: "El viaje debe llevar al menos un producto terminado" }
    });

    const clientId = useWatch({ control, name: 'clientId' });
    const lines = useWatch({ control, name: 'products' });

    /** Cambiar de cliente invalida las líneas elegidas: se vuelve a una fila vacía. */
    const previousClientId = useRef(clientId);

    useEffect(() => {
        if (previousClientId.current === clientId) return;

        previousClientId.current = clientId;
        replace([EMPTY_LINE]);
    }, [clientId, replace]);

    const { data: products, isLoading } = useQuery({
        queryKey: ['getFinishedProducts', TRIP_PRODUCTS_CATALOG_LIMIT, '1', '', String(clientId)],
        queryFn: () => finishedProductProvider.getFinishedProducts(TRIP_PRODUCTS_CATALOG_LIMIT, '1', { clientId: String(clientId) }),
        enabled: Boolean(clientId)
    });

    const catalog = products?.data ?? [];

    /** Lo elegido en las otras filas no se ofrece en esta. */
    const optionsFor = (index: number) => toTripFinishedProductOptions(
        catalog,
        (lines ?? [])
            .filter((_, other) => other !== index)
            .map((line) => Number(line?.finishedProductId))
            .filter((id) => Number.isFinite(id) && id > 0)
    );

    const listError = errors.products?.root?.message ?? errors.products?.message;

    if (!clientId) {
        return (
            <p className="rounded-xl border border-dashed border-line-strong bg-canvas px-5 py-6 text-center text-sm text-ink-muted">
                Elige el cliente para ver sus productos terminados.
            </p>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {isLoading && (
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                    Cargando productos del cliente
                </p>
            )}

            {!isLoading && catalog.length === 0 && (
                <p className="rounded-xl border border-line bg-canvas px-4 py-3.5 text-sm text-ink-muted">
                    Este cliente no tiene productos terminados registrados. Sin al menos uno
                    el viaje no se puede publicar.
                </p>
            )}

            <ol className="flex flex-col gap-4">
                {fields.map((field, index) => (
                    <li
                        key={field.id}
                        className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-[1fr_9rem_auto] sm:items-start"
                    >
                        <SelectFormField<TripFormValues>
                            label="Producto terminado"
                            name={`products.${index}.finishedProductId`}
                            options={optionsFor(index)}
                            errorMessage={errors.products?.[index]?.finishedProductId?.message}
                            control={control}
                            validation={{ required: "El producto terminado es obligatorio" }}
                        />

                        <TextFormField<TripFormValues>
                            label="Cajas"
                            name={`products.${index}.boxes`}
                            type="number"
                            placeholder="960"
                            register={register}
                            errorMessage={errors.products?.[index]?.boxes?.message}
                            validation={TRIP_PRODUCT_BOXES_VALIDATION}
                        />

                        <button
                            type="button"
                            onClick={() => remove(index)}
                            disabled={fields.length === 1}
                            aria-label={`Quitar la línea ${index + 1}`}
                            title={fields.length === 1 ? "El viaje debe llevar al menos un producto" : "Quitar línea"}
                            className="cursor-pointer self-start rounded-md p-2 text-danger transition-colors hover:bg-canvas focus:outline-none focus-visible:ring-2 focus-visible:ring-danger/20 disabled:cursor-not-allowed disabled:text-ink-subtle/50 disabled:hover:bg-transparent sm:mt-7"
                        >
                            <Trash2 size={15} />
                        </button>
                    </li>
                ))}
            </ol>

            {listError && <p className="text-xs text-red-400">{listError}</p>}

            <button
                type="button"
                onClick={() => append(EMPTY_LINE)}
                disabled={fields.length >= catalog.length && catalog.length > 0}
                className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-line px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:bg-canvas focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 disabled:cursor-not-allowed disabled:text-ink-subtle"
            >
                <Plus size={15} aria-hidden />
                Agregar otro producto
            </button>
        </div>
    );
}
