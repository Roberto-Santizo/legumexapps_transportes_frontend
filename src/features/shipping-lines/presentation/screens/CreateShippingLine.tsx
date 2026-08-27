import {
    ShippingLineFormComponent,
    ShippingLinePageHeader,
    buildShippingLinePayload,
    canWriteShippingLines,
    getShippingLineFieldErrors,
    shippingLineProvider,
    type ShippingLineForm
} from "@/features/shipping-lines/shipping-lines";
import { CustomFilledButton, CustomForm, FadeInUp, useNotification } from "@/features/shared/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@/config/config";

export function CreateShippingLine() {
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();

    const role = useSelector((state: RootState) => state.auth.user?.role);
    const canWrite = canWriteShippingLines(role);

    const {
        register,
        control,
        handleSubmit,
        setError,
        formState: { errors },
    } = useForm<ShippingLineForm>({ defaultValues: { name: '' } });

    const { mutate, isPending } = useMutation({
        mutationFn: (payload: ShippingLineForm) => shippingLineProvider.createShippingLine(payload),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getShippingLines'] });
            navigate('/navieras');
        },
        /**
         * El duplicado llega como **400 en el mensaje**, no como 422 en `errors`:
         * si solo se leyera `errors` se perdería en silencio. Se ancla al campo,
         * con el texto íntegro del servidor —incluida la coletilla «que puede
         * haber sido eliminada»—, porque el ocupante del nombre puede ser una
         * naviera borrada que no aparece en ninguna pantalla.
         */
        onError: (err) => {
            const fieldErrors = getShippingLineFieldErrors(err);

            if (fieldErrors.length === 0) {
                notification.error(err.message);
                return;
            }

            fieldErrors.forEach(({ field, message }) => setError(field, { message }));
        }
    });

    const onSubmit = (data: ShippingLineForm) => mutate(buildShippingLinePayload(data));

    return (
        <div className="flex flex-col gap-8">
            <ShippingLinePageHeader
                title="Agregar naviera"
                subtitle="Un solo dato: el nombre comercial de la naviera. Revisa las coincidencias antes de guardar."
            />

            {!canWrite && (
                <FadeInUp>
                    <div className="rounded-2xl border border-dashed border-line-strong bg-surface px-8 py-12 text-center">
                        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                            Solo lectura
                        </p>

                        <p className="mx-auto mt-3 max-w-[42ch] text-sm text-ink-muted">
                            El catálogo de navieras lo mantiene un administrador. Puedes
                            consultarlo, pero no agregar registros.
                        </p>
                    </div>
                </FadeInUp>
            )}

            {canWrite && (
                <FadeInUp>
                    <div className="max-w-2xl">
                        <CustomForm onSubmit={handleSubmit(onSubmit)}>
                            <ShippingLineFormComponent
                                register={register}
                                control={control}
                                errors={errors}
                            />

                            <CustomFilledButton
                                label="Agregar naviera"
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
