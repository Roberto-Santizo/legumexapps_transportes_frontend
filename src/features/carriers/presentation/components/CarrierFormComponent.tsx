import { FileFormField, TextFormField } from "@/features/shared/shared";
import type { CarrierForm } from "@/features/carriers/carriers";
import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";

type Props = {
    register: UseFormRegister<CarrierForm>;
    control: Control<CarrierForm>;
    errors: FieldErrors<CarrierForm>;
    /** En edición la imagen ya existe: solo se reemplaza si el usuario sube otra. */
    imageRequired?: boolean;
    imageLabel?: string;
}

export function CarrierFormComponent({ register, control, errors, imageRequired = true, imageLabel = "Logo o fotografía" }: Props) {
    return (
        <>
            <TextFormField<CarrierForm>
                label="Nombre"
                name="name"
                type="text"
                placeholder="Nombre del transportista"
                register={register}
                errorMessage={errors.name?.message}
                validation={{
                    required: "Ingresa el nombre del transportista",
                }}
            />

            <FileFormField<CarrierForm>
                label={imageLabel}
                name="image"
                control={control}
                validation={imageRequired ? { required: "Selecciona una imagen" } : {}}
            />
        </>
    );
}
