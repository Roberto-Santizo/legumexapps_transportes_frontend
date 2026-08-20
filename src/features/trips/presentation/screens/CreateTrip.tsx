import type { TripFormValues } from "@/features/trips/trips";
import {
    TripFormComponent,
    TripFreightQuoteSection,
    buildTripPayload,
    tripProvider
} from "@/features/trips/trips";
import { CustomFilledButton, CustomForm, FadeInUp, Title, useNotification } from "@/features/shared/shared";
import { useForm, useWatch } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";

export function CreateTrip() {
    const notification = useNotification();

    const {
        control,
        setValue,
        handleSubmit,
        formState: { errors },
    } = useForm<TripFormValues>({
        defaultValues: {
            polyline: '',
            originGooglePlaceId: '',
            originLatitude: 0,
            originLongitude: 0,
            locationId: null
        }
    });

    /** El costeo cotiza contra el mismo destino que ya eligió el viaje. */
    const locationId = useWatch({ control, name: 'locationId' }) ?? null;

    /**
     * `POST /trips` todavía no existe: el datasource lanza `No implementado` y
     * el toast lo muestra. Por eso el botón no se deshabilita —la cadena
     * completa se ejercita hasta el datasource y el error dice dónde se corta—.
     */
    const { mutate } = useMutation({
        mutationFn: (values: TripFormValues) => tripProvider.createTrip(buildTripPayload(values)),
        onSuccess: (message) => notification.success(message),
        onError: (err) => notification.error(err.message)
    });

    const onSubmit = (values: TripFormValues) => mutate(values);

    return (
        <div className="flex flex-col gap-8">
            <Title
                title="Registrar viaje"
                subtitle="Elige de dónde sale, a qué destino registrado va y cuánto cuesta el flete."
            />

            <FadeInUp>
                <div className="max-w-4xl">
                    <CustomForm onSubmit={handleSubmit(onSubmit)}>
                        <TripFormComponent
                            control={control}
                            errors={errors}
                            setValue={setValue}
                            onError={(message) => notification.error(message)}
                        />

                        {/*
                          * El costeo es informativo: no viaja en el payload ni bloquea el
                          * guardado. Por eso lleva su propio formulario y su propio botón.
                          */}
                        <TripFreightQuoteSection locationId={locationId} />

                        <CustomFilledButton
                            label="Guardar viaje"
                            type="submit"
                            fullWitdh
                        />
                    </CustomForm>
                </div>
            </FadeInUp>
        </div>
    );
}
