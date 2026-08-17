import type { FreightRateForm } from "@/features/freight-rates/freight-rates";
import {
    FREIGHT_FUEL_TYPES,
    FUEL_MIN_RANGE,
    PRICE_PER_POUND_RANGE,
    SUSPICIOUS_FUEL_MIN
} from "@/features/freight-rates/freight-rates";
import { SelectFormField, TextFormField, type Option } from "@/features/shared/shared";
import { useWatch, type Control, type FieldErrors, type UseFormRegister } from "react-hook-form";

type Props = {
    register: UseFormRegister<FreightRateForm>;
    control: Control<FreightRateForm>;
    errors: FieldErrors<FreightRateForm>;
    products: Option[];
}

export function FreightRateFormComponent({ register, control, errors, products }: Props) {
    const fuelMin = useWatch({ control, name: 'fuelMin' });

    /**
     * Un `3` donde iba un `30` crea una banda válida: el backend la acepta y
     * pasa a ser la más barata del par. El error solo se ve al cotizar, así que
     * se avisa aquí sin bloquear el envío —hay combustibles baratos—.
     */
    const looksMistyped = typeof fuelMin === 'number'
        && fuelMin > 0
        && fuelMin < SUSPICIOUS_FUEL_MIN;

    return (
        <>
            <SelectFormField<FreightRateForm>
                label="Producto"
                name="productId"
                options={products}
                control={control}
                errorMessage={errors.productId?.message}
                validation={{
                    required: "El producto es obligatorio"
                }}
            />

            <SelectFormField<FreightRateForm>
                label="Tipo de combustible"
                name="fuelType"
                options={FREIGHT_FUEL_TYPES}
                control={control}
                errorMessage={errors.fuelType?.message}
                validation={{
                    required: "El tipo de combustible es obligatorio"
                }}
            />

            <div className="flex flex-col gap-1">
                <TextFormField<FreightRateForm>
                    label="La tarifa rige desde (Q por galón)"
                    name="fuelMin"
                    type="number"
                    placeholder="35.00"
                    register={register}
                    errorMessage={errors.fuelMin?.message}
                    validation={{
                        required: "El precio de combustible desde el cual rige la tarifa es obligatorio",
                        valueAsNumber: true,
                        validate: (value) =>
                            !Number.isNaN(value) ||
                            "El precio de combustible debe ser un número en quetzales por galón",
                        min: {
                            value: FUEL_MIN_RANGE.min,
                            message: "El precio de combustible debe ser mayor que cero"
                        },
                        max: {
                            value: FUEL_MIN_RANGE.max,
                            message: `El precio de combustible no puede superar los ${FUEL_MIN_RANGE.max} quetzales por galón`
                        }
                    }}
                />

                {looksMistyped && (
                    <p className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs text-ink">
                        Un galón por debajo de Q{SUSPICIOUS_FUEL_MIN} es inusual. Revisa que no falte un dígito:
                        una banda mal tecleada se guarda sin error y pasa a ser la más barata del producto.
                    </p>
                )}
            </div>

            <TextFormField<FreightRateForm>
                label="Tarifa por libra (Q, hasta seis decimales)"
                name="pricePerPound"
                type="number"
                placeholder="0.454120"
                register={register}
                errorMessage={errors.pricePerPound?.message}
                validation={{
                    required: "La tarifa por libra es obligatoria",
                    valueAsNumber: true,
                    validate: (value) =>
                        !Number.isNaN(value) ||
                        "La tarifa por libra debe ser un número en quetzales",
                    min: {
                        value: PRICE_PER_POUND_RANGE.min,
                        message: "La tarifa por libra debe ser mayor que cero"
                    },
                    max: {
                        value: PRICE_PER_POUND_RANGE.max,
                        message: `La tarifa por libra no puede superar los ${PRICE_PER_POUND_RANGE.max} quetzales`
                    }
                }}
            />
        </>
    );
}
