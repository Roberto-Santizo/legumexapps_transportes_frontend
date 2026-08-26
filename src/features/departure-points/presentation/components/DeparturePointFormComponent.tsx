import type { DeparturePointForm } from "@/features/departure-points/departure-points";
import { DeparturePointPinField } from "@/features/departure-points/departure-points";
import { TextAreaFormField, TextFormField } from "@/features/shared/shared";
import { Controller, useWatch, type Control, type FieldErrors, type UseFormRegister, type UseFormSetValue } from "react-hook-form";

type Props = {
    register: UseFormRegister<DeparturePointForm>;
    control: Control<DeparturePointForm>;
    errors: FieldErrors<DeparturePointForm>;
    /** El lugar elegido escribe tres campos a la vez, así que no basta un Controller. */
    setValue: UseFormSetValue<DeparturePointForm>;
    onError?: (message: string) => void;
}

export function DeparturePointFormComponent({ register, control, errors, setValue, onError }: Props) {
    const name = useWatch({ control, name: 'name' }) ?? '';
    const latitude = useWatch({ control, name: 'latitude' }) ?? 0;
    const longitude = useWatch({ control, name: 'longitude' }) ?? 0;

    return (
        <>
            <TextFormField<DeparturePointForm>
                label="Nombre del punto de partida"
                name="name"
                type="text"
                placeholder="Bodega central Escuintla"
                register={register}
                errorMessage={errors.name?.message}
                validation={{
                    required: "El nombre del punto de partida es obligatorio",
                    maxLength: {
                        value: 255,
                        message: "El nombre del punto de partida no puede superar los 255 caracteres"
                    }
                }}
            />

            <TextAreaFormField<DeparturePointForm>
                label="Descripción"
                name="description"
                placeholder="Portón de carga, referencias para llegar o quién entrega."
                rows={3}
                register={register}
                errorMessage={errors.description?.message}
                validation={{
                    maxLength: {
                        value: 1000,
                        message: "La descripción no puede superar los 1000 caracteres"
                    }
                }}
            />

            <Controller
                control={control}
                name="googlePlaceId"
                rules={{ required: "Busca la dirección del punto de partida para anclarlo a un lugar" }}
                render={({ field }) => (
                    <DeparturePointPinField
                        googlePlaceId={field.value ?? ''}
                        latitude={Number(latitude)}
                        longitude={Number(longitude)}
                        onPlaceSelected={(place) => {
                            field.onChange(place.id);
                            setValue('latitude', place.latitude, { shouldDirty: true });
                            setValue('longitude', place.longitude, { shouldDirty: true });

                            if (name.trim().length === 0) {
                                setValue('name', place.formattedAddress, { shouldDirty: true, shouldValidate: true });
                            }
                        }}
                        onPinMoved={(nextLatitude, nextLongitude) => {
                            setValue('latitude', nextLatitude, { shouldDirty: true });
                            setValue('longitude', nextLongitude, { shouldDirty: true });
                        }}
                        onError={onError}
                        errorMessage={errors.googlePlaceId?.message}
                    />
                )}
            />
        </>
    );
}
