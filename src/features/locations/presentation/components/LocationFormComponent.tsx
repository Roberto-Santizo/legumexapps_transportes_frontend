import type { LocationForm } from "@/features/locations/locations";
import { LocationPinField } from "@/features/locations/locations";
import { TextAreaFormField, TextFormField } from "@/features/shared/shared";
import { Controller, useWatch, type Control, type FieldErrors, type UseFormRegister, type UseFormSetValue } from "react-hook-form";

type Props = {
    register: UseFormRegister<LocationForm>;
    control: Control<LocationForm>;
    errors: FieldErrors<LocationForm>;
    /** El lugar elegido escribe tres campos a la vez, así que no basta un Controller. */
    setValue: UseFormSetValue<LocationForm>;
    onError?: (message: string) => void;
}

export function LocationFormComponent({ register, control, errors, setValue, onError }: Props) {
    const name = useWatch({ control, name: 'name' }) ?? '';
    const latitude = useWatch({ control, name: 'latitude' }) ?? 0;
    const longitude = useWatch({ control, name: 'longitude' }) ?? 0;

    return (
        <>
            <TextFormField<LocationForm>
                label="Nombre del destino"
                name="name"
                type="text"
                placeholder="Bodega central Escuintla"
                register={register}
                errorMessage={errors.name?.message}
                validation={{
                    required: "El nombre del destino es obligatorio",
                    maxLength: {
                        value: 255,
                        message: "El nombre del destino no puede superar los 255 caracteres"
                    }
                }}
            />

            <TextAreaFormField<LocationForm>
                label="Descripción"
                name="description"
                placeholder="Dirección exacta, referencias para llegar o quién recibe."
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
                rules={{ required: "Busca la dirección del destino para anclarlo a un lugar" }}
                render={({ field }) => (
                    <LocationPinField
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
