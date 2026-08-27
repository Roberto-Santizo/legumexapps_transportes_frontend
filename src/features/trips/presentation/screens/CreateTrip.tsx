import {
    TripFormComponent,
    TripPageHeader,
    buildTripPayload,
    canWriteTrips,
    getTripFieldErrors,
    tripProvider,
    type TripFormValues
} from "@/features/trips/trips";
import { CustomFilledButton, CustomForm, FadeInUp, useNotification } from "@/features/shared/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@/config/store/store";

export function CreateTrip() {
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();

    const role = useSelector((state: RootState) => state.auth.user?.role);
    const canWrite = canWriteTrips(role);

    const {
        register,
        control,
        handleSubmit,
        setValue,
        setError,
        formState: { errors },
    } = useForm<TripFormValues>();

    const { mutate, isPending } = useMutation({
        mutationFn: (payload: TripFormValues) => tripProvider.createTrip(buildTripPayload(payload)),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getTrips'] });
            navigate('/viajes');
        },
        /**
         * Los errores llegan repartidos en dos formatos y hay que anclarlos al
         * campo que falla: el 422 trae las claves en `errors`, pero un catálogo
         * borrado o inactivo llega como **400 suelto en `message`** —`exists:`
         * lee la tabla en crudo y no ve el borrado lógico—. Si solo se leyera
         * `errors`, esos cuatro casos se verían como un aviso sin dueño.
         */
        onError: (err) => {
            const fieldErrors = getTripFieldErrors(err);

            if (fieldErrors.length === 0) {
                notification.error(err.message);
                return;
            }

            fieldErrors.forEach(({ field, message }) => setError(field, { message }));
        }
    });

    const onSubmit = (data: TripFormValues) => mutate(data);

    return (
        <div className="flex flex-col gap-8">
            <TripPageHeader
                title="Publicar viaje"
                subtitle="El viaje nace sin dueño y sin tripulación: se publica para que una empresa transportista lo tome."
            />

            {!canWrite && (
                <FadeInUp>
                    <div className="rounded-2xl border border-dashed border-line-strong bg-surface px-8 py-12 text-center">
                        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                            Solo lectura
                        </p>

                        <p className="mx-auto mt-3 max-w-[44ch] text-sm text-ink-muted">
                            Los viajes los publica un administrador. Puedes consultarlos, pero
                            no crearlos.
                        </p>
                    </div>
                </FadeInUp>
            )}

            {canWrite && (
                <FadeInUp>
                    <div className="max-w-3xl">
                        <CustomForm onSubmit={handleSubmit(onSubmit)}>
                            <TripFormComponent
                                register={register}
                                control={control}
                                errors={errors}
                                setValue={setValue}
                            />

                            <CustomFilledButton
                                label="Publicar viaje"
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
