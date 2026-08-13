import type { ProductForm } from "@/features/products/products";
import { TextFormField } from "@/features/shared/shared";
import type { FieldErrors, UseFormRegister } from "react-hook-form";

type Props = {
    register: UseFormRegister<ProductForm>;
    errors: FieldErrors<ProductForm>;
}

export function ProductFormComponent({ register, errors }: Props) {
    return (
        <TextFormField<ProductForm>
            label="Nombre del producto"
            name="name"
            type="text"
            placeholder="Brócoli"
            register={register}
            errorMessage={errors.name?.message}
            validation={{
                required: "Ingresa el nombre del producto",
                maxLength: {
                    value: 100,
                    message: "El nombre no puede pasar de 100 caracteres"
                }
            }}
        />
    );
}
