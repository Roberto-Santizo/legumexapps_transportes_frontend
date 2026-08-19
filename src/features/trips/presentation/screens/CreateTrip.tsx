import type { TripFormValues } from "@/features/trips/trips";
import { TripFormComponent } from "@/features/trips/trips";
import { CustomFilledButton, CustomForm, FadeInUp, Title, useNotification } from "@/features/shared/shared";
import { useForm } from "react-hook-form";

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

    // TODO(paso 9): la mutación sobre `tripProvider.createTrip` entra aquí.
    const onSubmit = (data: TripFormValues) => console.log(data);

    return (
        <div className="flex flex-col gap-8">
            <Title
                title="Registrar viaje"
                subtitle="Elige de dónde sale y a qué destino registrado va."
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
