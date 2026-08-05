import { CarrierFormComponent, CarrierPageHeader, carrierProvider, type CarrierForm } from "@/features/carriers/carriers";
import { CustomFilledButton, CustomForm, FadeInUp, useNotification } from "@/features/shared/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

export function CreateCarrier() {
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();

    const {
        register,
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<CarrierForm>();

    const { mutate, isPending } = useMutation({
        mutationFn: (payload: CarrierForm) => carrierProvider.createCarrier(payload),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getCarriers'] });
            navigate('/transportistas');
        },
        onError: (err) => notification.error(err.message)
    });

    const onSubmit = (data: CarrierForm) => mutate(data);

    return (
        <div className="flex flex-col gap-8">
            <CarrierPageHeader
                title="Nuevo transportista"
                subtitle="El código se asigna al guardar; con él se identifica al transportista en las guías."
            />

            <FadeInUp>
                <div className="max-w-xl">
                    <CustomForm onSubmit={handleSubmit(onSubmit)}>
                        <CarrierFormComponent
                            register={register}
                            control={control}
                            errors={errors}
                        />

                        <CustomFilledButton
                            label="Registrar transportista"
                            type="submit"
                            fullWitdh
                            disabled={isPending}
                        />
                    </CustomForm>
                </div>
            </FadeInUp>
        </div>
    );
}
