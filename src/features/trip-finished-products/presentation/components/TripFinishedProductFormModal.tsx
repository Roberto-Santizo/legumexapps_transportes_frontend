/**
 * Agregar un producto al viaje o corregir sus cajas. Es el mismo modal para
 * las dos cosas porque la edición es un subconjunto del alta: la línea **solo
 * edita `boxes`** y el producto queda fijo. Cambiar de producto es quitar la
 * línea y agregar otra, y el modal lo dice en lugar de ofrecer un selector que
 * la API ignoraría en silencio.
 */

import type { TripFinishedProduct, TripFinishedProductForm } from "@/features/trip-finished-products/trip-finished-products";
import {
    TRIP_PRODUCTS_CATALOG_LIMIT,
    TRIP_PRODUCT_BOXES_MAX,
    TRIP_PRODUCT_BOXES_MIN,
    TRIP_PRODUCT_BOXES_VALIDATION,
    buildTripFinishedProductPayload,
    formatTripProductDecimal,
    getTripFinishedProductFieldErrors,
    toTripFinishedProductOptions,
    tripFinishedProductProvider
} from "@/features/trip-finished-products/trip-finished-products";
import { finishedProductProvider } from "@/features/finished-products/finished-products";
import { CustomFilledButton, Modal, SelectFormField, TextFormField, useNotification } from "@/features/shared/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

type Props = {
    open: boolean;
    tripId: number;
    /** Solo se ofrecen los SKU de este cliente: otro es 400. */
    clientId: number;
    /** Con línea es edición de cajas; sin ella, alta. */
    line?: TripFinishedProduct | null;
    /** Productos que ya están en el viaje: repetirlos es 400. */
    existingProductIds: number[];
    onClose: () => void;
}

export function TripFinishedProductFormModal({ open, tripId, clientId, line, existingProductIds, onClose }: Props) {
    const notification = useNotification();
    const queryClient = useQueryClient();
    const isEdit = Boolean(line);

    const {
        register,
        control,
        handleSubmit,
        reset,
        setError,
        formState: { errors },
    } = useForm<TripFinishedProductForm>();

    /** Cada apertura empieza limpia: la edición precargada, el alta vacía. */
    useEffect(() => {
        if (!open) return;

        reset(line ? { boxes: line.boxes } : { finishedProductId: undefined, boxes: undefined });
    }, [open, line, reset]);

    const { data: products, isLoading: isLoadingProducts } = useQuery({
        queryKey: ['getFinishedProducts', TRIP_PRODUCTS_CATALOG_LIMIT, '1', '', clientId.toString()],
        queryFn: () => finishedProductProvider.getFinishedProducts(TRIP_PRODUCTS_CATALOG_LIMIT, '1', { clientId: clientId.toString() }),
        enabled: open && !isEdit
    });

    const options = toTripFinishedProductOptions(products?.data ?? [], existingProductIds);

    const { mutate, isPending } = useMutation({
        mutationFn: (form: TripFinishedProductForm) => line
            ? tripFinishedProductProvider.updateTripFinishedProductById(line.id.toString(), { boxes: Number(form.boxes) })
            : tripFinishedProductProvider.createTripFinishedProduct(buildTripFinishedProductPayload(tripId, form)),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getTripFinishedProducts', tripId.toString()] });
            onClose();
        },
        onError: (err) => {
            const fieldErrors = getTripFinishedProductFieldErrors(err);

            if (fieldErrors.length === 0) {
                notification.error(err.message);
                return;
            }

            fieldErrors.forEach(({ field, message }) => setError(field, { message }));
        }
    });

    const onSubmit = (form: TripFinishedProductForm) => mutate(form);

    return (
        <Modal
            modal={open}
            closeModal={onClose}
            title={isEdit ? "Corregir cajas" : "Agregar producto al viaje"}
            width="sm:max-w-lg"
        >
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
                {line ? (
                    <div className="flex flex-col gap-1 rounded-xl border border-line bg-canvas px-4 py-3.5">
                        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
                            {line.code}
                        </span>

                        <span className="text-sm font-medium text-ink">{line.name}</span>

                        <span className="text-xs text-ink-muted">
                            Presentación {formatTripProductDecimal(line.presentation)} ·{' '}
                            {formatTripProductDecimal(line.boxesPerPallet)} cajas por tarima
                        </span>
                    </div>
                ) : (
                    <>
                        <SelectFormField<TripFinishedProductForm>
                            label="Producto terminado"
                            name="finishedProductId"
                            options={options}
                            errorMessage={errors.finishedProductId?.message}
                            control={control}
                            validation={{ required: "El producto terminado es obligatorio" }}
                        />

                        {isLoadingProducts && (
                            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                                Cargando productos del cliente
                            </p>
                        )}

                        {!isLoadingProducts && options.length === 0 && (
                            <p className="text-xs text-ink-muted">
                                El cliente no tiene más productos terminados que agregar: todos ya
                                están en el viaje o no tiene ninguno registrado.
                            </p>
                        )}
                    </>
                )}

                <TextFormField<TripFinishedProductForm>
                    label="Cajas"
                    name="boxes"
                    type="number"
                    placeholder="960"
                    register={register}
                    errorMessage={errors.boxes?.message}
                    validation={TRIP_PRODUCT_BOXES_VALIDATION}
                />

                <p className="-mt-3 text-xs text-ink-muted">
                    Cajas físicas, en entero, de {TRIP_PRODUCT_BOXES_MIN} a {TRIP_PRODUCT_BOXES_MAX}.
                    {isEdit && " Para cambiar de producto, agrega el nuevo y luego quita este."}
                </p>

                <CustomFilledButton
                    label={isEdit ? "Guardar cajas" : "Agregar producto"}
                    type="submit"
                    fullWitdh
                    disabled={isPending}
                />
            </form>
        </Modal>
    );
}
