import { FUEL_TYPES, type FuelPriceForm } from "@/features/fuel-prices/fuel-prices";
import { SelectFormField, TextFormField } from "@/features/shared/shared";
import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";

type Props = {
    register: UseFormRegister<FuelPriceForm>;
    control: Control<FuelPriceForm>;
    errors: FieldErrors<FuelPriceForm>;
}

export function FuelPriceFormComponent({ register, control, errors }: Props) {
    return (
        <>
            <SelectFormField<FuelPriceForm>
                label="Combustible"
                name="fuelType"
                options={FUEL_TYPES}
                control={control}
                errorMessage={errors.fuelType?.message}
                validation={{
                    required: "Selecciona el combustible",
                }}
            />

            <TextFormField<FuelPriceForm>
                label="Precio por galón en quetzales"
                name="price"
                type="number"
                placeholder="32.45"
                register={register}
                errorMessage={errors.price?.message}
                validation={{
                    required: "Ingresa el precio por galón",
                    valueAsNumber: true,
                    min: {
                        value: 0.01,
                        message: "El precio debe ser mayor a cero"
                    }
                }}
            />
        </>
    );
}
