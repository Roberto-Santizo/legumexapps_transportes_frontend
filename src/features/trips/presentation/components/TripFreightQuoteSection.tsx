/**
 * El costeo del flete dentro del registro de viaje. Vive en su propio
 * `useForm`: sus tres campos son obligatorios para cotizar, pero el viaje se
 * guarda sin ellos —`POST /trips` solo recibe la polilínea—, así que meterlos
 * en `TripFormValues` bloquearía el submit por un dato que el servidor no pide.
 *
 * Se dispara con `useMutation` y no con `useQuery` a propósito: la cotización
 * no es un precio fijo ni una reserva, y cachearla haría que un botón pulsado
 * mañana devolviera el número de hoy.
 */

import type { Option } from "@/features/shared/shared";
import { CustomFilledButton, SelectFormField, TextFormField } from "@/features/shared/shared";
import { FREIGHT_FUEL_TYPES, POUNDS_RANGE, freightRateProvider } from "@/features/freight-rates/freight-rates";
import { TRIP_PRODUCTS_LIMIT, TripFreightQuoteSummary } from "@/features/trips/trips";
import { productProvider } from "@/features/products/products";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useEffect } from "react";

/** Los campos que se capturan aquí. El destino lo pone el formulario del viaje. */
type QuoteFields = {
    productId: number;
    fuelType: string;
    pounds: number;
}

type Props = {
    /** `null` mientras no se elige destino: sin él no hay trío que cotizar. */
    locationId: number | null;
}

export function TripFreightQuoteSection({ locationId }: Props) {
    const {
        control,
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<QuoteFields>({
        defaultValues: {
            fuelType: 'diesel'
        }
    });

    const { data: productsPage } = useQuery({
        queryKey: ['getProducts', TRIP_PRODUCTS_LIMIT, '1'],
        queryFn: () => productProvider.getProducts(TRIP_PRODUCTS_LIMIT, '1')
    });

    /** Un producto inactivo devuelve 400 al cotizar: no llega al select. */
    const products: Option[] = (productsPage?.data ?? [])
        .filter((product) => product.status)
        .map((product) => ({ value: product.id, label: product.name }));

    const { data: quote, mutate, isPending, error, reset } = useMutation({
        mutationFn: (values: QuoteFields) => freightRateProvider.getFreightQuote({
            locationId: locationId as number,
            productId: Number(values.productId),
            fuelType: values.fuelType,
            pounds: Number(values.pounds)
        })
    });

    /** Cambiar de destino invalida lo cotizado: era el precio de otro viaje. */
    useEffect(() => {
        reset();
    }, [locationId, reset]);

    const hasDestination = locationId !== null;

    return (
        <div className="flex flex-col gap-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                Costeo del flete
            </p>

            {!hasDestination ? (
                <div className="rounded-2xl border border-line bg-canvas p-6">
                    <p className="text-sm text-ink-muted">
                        Elige el destino para cotizar el flete. La tarifa depende del destino, del
                        producto y del combustible, no de la distancia de la ruta.
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-5">
                    {products.length === 0 && (
                        <p className="rounded-lg border border-line bg-canvas px-4 py-3 text-sm text-ink-muted">
                            No hay productos activos en el catálogo. Registra uno para poder cotizar el flete.
                        </p>
                    )}

                    <div className="grid gap-5 sm:grid-cols-2">
                        <SelectFormField<QuoteFields>
                            label="Producto"
                            name="productId"
                            options={products}
                            control={control}
                            errorMessage={errors.productId?.message}
                            validation={{
                                required: "El producto es obligatorio"
                            }}
                        />

                        <SelectFormField<QuoteFields>
                            label="Tipo de combustible"
                            name="fuelType"
                            options={FREIGHT_FUEL_TYPES}
                            control={control}
                            errorMessage={errors.fuelType?.message}
                            validation={{
                                required: "El tipo de combustible es obligatorio"
                            }}
                        />
                    </div>

                    <TextFormField<QuoteFields>
                        label="Libras de la carga"
                        name="pounds"
                        type="number"
                        placeholder="45000.00"
                        register={register}
                        errorMessage={errors.pounds?.message}
                        validation={{
                            required: "Las libras son obligatorias para cotizar el flete",
                            valueAsNumber: true,
                            validate: (value) =>
                                !Number.isNaN(value) || "Las libras deben ser un número",
                            min: {
                                value: POUNDS_RANGE.min,
                                message: "Las libras deben ser mayores que cero"
                            },
                            max: {
                                value: POUNDS_RANGE.max,
                                message: `Las libras no pueden superar las ${POUNDS_RANGE.max}`
                            }
                        }}
                    />

                    {/* `type="button"`: dentro del formulario del viaje, un submit lo enviaría. */}
                    <CustomFilledButton
                        label="Cotizar flete"
                        type="button"
                        onClick={handleSubmit((values) => mutate(values))}
                        disabled={isPending}
                    />

                    <TripFreightQuoteSummary
                        quote={quote}
                        isPending={isPending}
                        error={error}
                    />
                </div>
            )}
        </div>
    );
}
