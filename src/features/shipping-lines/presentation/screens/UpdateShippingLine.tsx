import {
    SHIPPING_LINE_ALREADY_DELETED_MESSAGE,
    ShippingLineFormComponent,
    ShippingLineName,
    ShippingLinePageHeader,
    buildShippingLinePayload,
    canWriteShippingLines,
    getShippingLineFieldErrors,
    shippingLineProvider,
    type ShippingLineForm
} from "@/features/shipping-lines/shipping-lines";
import { CustomFilledButton, CustomForm, ErrorComponent, FadeInUp, useNotification } from "@/features/shared/shared";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@/config/config";

export function UpdateShippingLine() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();

    const role = useSelector((state: RootState) => state.auth.user?.role);
    const canWrite = canWriteShippingLines(role);

    const { data: shippingLine, isLoading, isError, error } = useQuery({
        queryKey: ['getShippingLineById', id],
        queryFn: () => shippingLineProvider.getShippingLineById(id!),
        enabled: Boolean(id)
    });

    const {
        register,
        control,
        handleSubmit,
        setValue,
        setError,
        formState: { errors },
    } = useForm<ShippingLineForm>({ defaultValues: { name: '' } });

    useEffect(() => {
        if (shippingLine) {
            setValue('name', shippingLine.name);
        }
    }, [shippingLine, setValue]);

    const { mutate, isPending } = useMutation({
        mutationFn: (payload: ShippingLineForm) => shippingLineProvider.updateShippingLineById(id!, payload),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getShippingLines'] });
            queryClient.invalidateQueries({ queryKey: ['getShippingLineById', id] });
            navigate('/navieras');
        },
        /**
         * Igual que en el alta, el duplicado llega como 400 en el mensaje y se
         * ancla al campo. Aquí la unicidad ignora la propia fila, así que
         * reenviar el mismo nombre no choca: si salta, el ocupante es otra
         * naviera —viva o ya eliminada—.
         *
         * El otro 400 posible, «La naviera ya fue eliminada», no pertenece al
         * campo: sale como notificación y devuelve al listado, donde la fila ya
         * no está.
         */
        onError: (err) => {
            const fieldErrors = getShippingLineFieldErrors(err);

            if (fieldErrors.length === 0) {
                notification.error(err.message);

                if (err.message.startsWith(SHIPPING_LINE_ALREADY_DELETED_MESSAGE)) {
                    queryClient.invalidateQueries({ queryKey: ['getShippingLines'] });
                    navigate('/navieras');
                }

                return;
            }

            fieldErrors.forEach(({ field, message }) => setError(field, { message }));
        }
    });

    const onSubmit = (data: ShippingLineForm) => mutate(buildShippingLinePayload(data));

    if (isError) return <ErrorComponent message={error.message} />

    return (
        <div className="flex flex-col gap-8">
            <ShippingLinePageHeader
                title="Editar naviera"
                subtitle="Corregir el nombre aquí es la única forma de arreglar una errata: al eliminar la naviera, el nombre queda ocupado y ya no hay arreglo."
            >
                {shippingLine && <ShippingLineName name={shippingLine.name} size="lg" />}
            </ShippingLinePageHeader>

            {!canWrite && (
                <FadeInUp>
                    <div className="rounded-2xl border border-dashed border-line-strong bg-surface px-8 py-12 text-center">
                        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                            Solo lectura
                        </p>

                        <p className="mx-auto mt-3 max-w-[42ch] text-sm text-ink-muted">
                            El catálogo de navieras lo mantiene un administrador. Puedes
                            consultarlo, pero no editarlo.
                        </p>
                    </div>
                </FadeInUp>
            )}

            {canWrite && isLoading && (
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                    Cargando naviera
                </p>
            )}

            {canWrite && !isLoading && shippingLine && (
                <FadeInUp>
                    <div className="max-w-2xl">
                        <CustomForm onSubmit={handleSubmit(onSubmit)}>
                            <ShippingLineFormComponent
                                register={register}
                                control={control}
                                errors={errors}
                                excludeId={shippingLine.id}
                            />

                            <CustomFilledButton
                                label="Guardar cambios"
                                type="submit"
                                fullWitdh
                                disabled={isPending}
                            />
                        </CustomForm>
                    </div>
                </FadeInUp>
            )}
        </div>
    );
}
