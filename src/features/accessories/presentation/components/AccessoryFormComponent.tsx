/**
 * El formulario del accesorio. El alta y la edición comparten los seis campos
 * del inventario; el estado solo aparece al editar, porque el accesorio nace
 * activo y el backend no acepta ese campo en el alta.
 *
 * `currentValue` no está aquí ni puede estarlo: es derivado, se recalcula en
 * cada lectura y el backend descarta lo que se le mande.
 */

import type { AccessoryForm } from "@/features/accessories/accessories";
import {
    ACCESSORY_CODE_MAX_LENGTH,
    ACCESSORY_DEPRECIATION_MAX,
    ACCESSORY_DEPRECIATION_MIN,
    ACCESSORY_DESCRIPTION_MAX_LENGTH,
    ACCESSORY_NAME_MAX_LENGTH,
    ACCESSORY_PRICE_MAX,
    ACCESSORY_PRICE_MIN,
    ACCESSORY_STATUSES,
    todayInputValue
} from "@/features/accessories/accessories";
import { DateFormField, SelectFormField, TextAreaFormField, TextFormField } from "@/features/shared/shared";
import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";

type Props = {
    register: UseFormRegister<AccessoryForm>;
    errors: FieldErrors<AccessoryForm>;
    control: Control<AccessoryForm>;
    /** El estado solo se toca en la edición: es el único camino para reactivar una baja. */
    showStatus?: boolean;
}

export function AccessoryFormComponent({ register, errors, control, showStatus = false }: Props) {
    return (
        <>
            <div className="grid gap-6 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                    <TextFormField<AccessoryForm>
                        label="Código"
                        name="code"
                        type="text"
                        placeholder="ACC-0012"
                        register={register}
                        errorMessage={errors.code?.message}
                        validation={{
                            required: "Ingresa el código del accesorio",
                            maxLength: {
                                value: ACCESSORY_CODE_MAX_LENGTH,
                                message: `El código no puede pasar de ${ACCESSORY_CODE_MAX_LENGTH} caracteres`
                            }
                        }}
                    />

                    <p className="text-xs text-ink-muted">
                        Se guarda en mayúsculas. Un código usado no se libera nunca, ni siquiera
                        si el accesorio se dio de baja.
                    </p>
                </div>

                <TextFormField<AccessoryForm>
                    label="Nombre"
                    name="name"
                    type="text"
                    placeholder="Gato hidráulico 20 ton"
                    register={register}
                    errorMessage={errors.name?.message}
                    validation={{
                        required: "Ingresa el nombre del accesorio",
                        maxLength: {
                            value: ACCESSORY_NAME_MAX_LENGTH,
                            message: `El nombre no puede pasar de ${ACCESSORY_NAME_MAX_LENGTH} caracteres`
                        }
                    }}
                />
            </div>

            <TextAreaFormField<AccessoryForm>
                label="Descripción"
                name="description"
                placeholder="Gato de botella, comprado en Ferretería El Tornillo"
                rows={3}
                register={register}
                errorMessage={errors.description?.message}
                validation={{
                    maxLength: {
                        value: ACCESSORY_DESCRIPTION_MAX_LENGTH,
                        message: `La descripción no puede pasar de ${ACCESSORY_DESCRIPTION_MAX_LENGTH} caracteres`
                    }
                }}
            />

            <div className="grid gap-6 sm:grid-cols-3">
                <TextFormField<AccessoryForm>
                    label="Precio (Q)"
                    name="price"
                    type="number"
                    placeholder="10000.00"
                    register={register}
                    errorMessage={errors.price?.message}
                    validation={{
                        required: "Ingresa el precio de compra",
                        valueAsNumber: true,
                        min: {
                            value: ACCESSORY_PRICE_MIN,
                            message: "El precio debe ser mayor a 0"
                        },
                        max: {
                            value: ACCESSORY_PRICE_MAX,
                            message: `El precio no puede pasar de ${ACCESSORY_PRICE_MAX}`
                        }
                    }}
                />

                <DateFormField<AccessoryForm>
                    label="Fecha de compra"
                    name="purchaseDate"
                    register={register}
                    errorMessage={errors.purchaseDate?.message}
                    max={todayInputValue()}
                    validation={{ required: "Ingresa la fecha de compra" }}
                />

                <div className="flex flex-col gap-1.5">
                    <TextFormField<AccessoryForm>
                        label="Depreciación anual (%)"
                        name="annualDepreciation"
                        type="number"
                        placeholder="20"
                        register={register}
                        errorMessage={errors.annualDepreciation?.message}
                        validation={{
                            required: "Ingresa el porcentaje de depreciación anual",
                            valueAsNumber: true,
                            min: {
                                value: ACCESSORY_DEPRECIATION_MIN,
                                message: "La depreciación no puede ser negativa"
                            },
                            max: {
                                value: ACCESSORY_DEPRECIATION_MAX,
                                message: "La depreciación no puede pasar de 100"
                            }
                        }}
                    />

                    <p className="text-xs text-ink-muted">
                        Cuánto valor pierde al año. Deja 0 si no se deprecia.
                    </p>
                </div>
            </div>

            {showStatus && (
                <div className="max-w-sm">
                    <SelectFormField<AccessoryForm>
                        label="Estado"
                        name="status"
                        options={ACCESSORY_STATUSES}
                        control={control}
                        errorMessage={errors.status?.message}
                        validation={{ required: "Elige el estado del accesorio" }}
                    />
                </div>
            )}
        </>
    );
}
