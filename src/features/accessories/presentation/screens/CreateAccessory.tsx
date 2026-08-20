import {
    AccessoryFormComponent,
    AccessoryPageHeader,
    accessoryProvider,
    canWriteAccessories,
    type AccessoryForm
} from "@/features/accessories/accessories";
import { CustomFilledButton, CustomForm, FadeInUp, useNotification } from "@/features/shared/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@/config/store/store";

export function CreateAccessory() {
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();

    const role = useSelector((state: RootState) => state.auth.user?.role);
    const canWrite = canWriteAccessories(role);

    const {
        register,
        handleSubmit,
        control,
        formState: { errors },
    } = useForm<AccessoryForm>();

    const { mutate, isPending } = useMutation({
        mutationFn: (payload: AccessoryForm) => accessoryProvider.createAccessory(payload),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getAccessories'] });
            navigate('/accesorios');
        },
        onError: (err) => notification.error(err.message)
    });

    const onSubmit = (data: AccessoryForm) => mutate(data);

    return (
        <div className="flex flex-col gap-8">
            <AccessoryPageHeader
                title="Agregar accesorio"
                subtitle="Una unidad física por registro: cuatro llantas iguales son cuatro accesorios con cuatro códigos. Entra al inventario como activo."
            />

            {!canWrite && (
                <FadeInUp>
                    <div className="rounded-2xl border border-dashed border-line-strong bg-surface px-8 py-12 text-center">
                        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                            Solo lectura
                        </p>

                        <p className="mx-auto mt-3 max-w-[42ch] text-sm text-ink-muted">
                            El inventario lo mantiene un administrador. Puedes consultar los
                            accesorios, pero no registrarlos.
                        </p>
                    </div>
                </FadeInUp>
            )}

            {canWrite && (
                <FadeInUp>
                    <div className="max-w-3xl">
                        <CustomForm onSubmit={handleSubmit(onSubmit)}>
                            <AccessoryFormComponent
                                register={register}
                                errors={errors}
                                control={control}
                            />

                            <CustomFilledButton
                                label="Agregar accesorio"
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
