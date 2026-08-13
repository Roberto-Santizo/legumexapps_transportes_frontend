import type { ZoneForm } from "@/features/zones/zones";
import {
    ZONE_DEFAULT_COLOR,
    ZONE_MIN_VERTICES,
    ZoneColorField,
    ZonePolygonEditor
} from "@/features/zones/zones";
import { TextAreaFormField, TextFormField } from "@/features/shared/shared";
import { Controller, useWatch, type Control, type FieldErrors, type UseFormRegister } from "react-hook-form";

type Props = {
    register: UseFormRegister<ZoneForm>;
    control: Control<ZoneForm>;
    errors: FieldErrors<ZoneForm>;
}

export function ZoneFormComponent({ register, control, errors }: Props) {
    const color = useWatch({ control, name: 'color' }) ?? ZONE_DEFAULT_COLOR;

    return (
        <>
            <TextFormField<ZoneForm>
                label="Nombre de la zona"
                name="name"
                type="text"
                placeholder="Zona norte"
                register={register}
                errorMessage={errors.name?.message}
                validation={{
                    required: "El nombre de la zona es obligatorio",
                    maxLength: {
                        value: 255,
                        message: "El nombre de la zona no puede superar los 255 caracteres"
                    }
                }}
            />

            <TextAreaFormField<ZoneForm>
                label="Descripción"
                name="description"
                placeholder="Qué cubre esta zona y por qué se separó del resto."
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

            <ZoneColorField
                control={control}
                errorMessage={errors.color?.message}
            />

            <Controller
                control={control}
                name="area"
                rules={{
                    validate: (value) =>
                        (value?.length ?? 0) >= ZONE_MIN_VERTICES ||
                        `El área debe tener al menos ${ZONE_MIN_VERTICES} puntos`
                }}
                render={({ field }) => (
                    <ZonePolygonEditor
                        value={field.value ?? []}
                        color={color}
                        onChange={field.onChange}
                        errorMessage={errors.area?.message}
                    />
                )}
            />
        </>
    );
}
