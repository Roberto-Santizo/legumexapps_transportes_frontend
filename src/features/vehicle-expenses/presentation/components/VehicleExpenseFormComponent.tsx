import { DateFormField, SelectFormField, TextAreaFormField, TextFormField } from "@/features/shared/shared";
import type { VehicleExpenseForm } from "@/features/vehicle-expenses/vehicle-expenses";
import {
    todayAsInputValue,
    VEHICLE_EXPENSE_AMOUNT_MAX,
    VEHICLE_EXPENSE_AMOUNT_MIN,
    VEHICLE_EXPENSE_CATEGORIES,
    VEHICLE_EXPENSE_DESCRIPTION_MAX_LENGTH,
    VEHICLE_EXPENSE_NATURES
} from "@/features/vehicle-expenses/vehicle-expenses";
import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";

type Props = {
    register: UseFormRegister<VehicleExpenseForm>;
    control: Control<VehicleExpenseForm>;
    errors: FieldErrors<VehicleExpenseForm>;
}

/**
 * Cinco campos y ninguno para el vehículo: en el alta lo pone el panel donde se
 * captura el gasto y en la edición es inmutable. Si la unidad quedó mal, el
 * gasto se borra y se vuelve a registrar.
 */
export function VehicleExpenseFormComponent({ register, control, errors }: Props) {
    return (
        <>
            <div className="grid gap-6 sm:grid-cols-2">
                <SelectFormField<VehicleExpenseForm>
                    label="Categoría"
                    name="category"
                    options={VEHICLE_EXPENSE_CATEGORIES}
                    control={control}
                    errorMessage={errors.category?.message}
                    validation={{
                        required: "Selecciona la categoría del gasto"
                    }}
                />

                {/* La naturaleza no depende de la categoría: cualquier categoría admite las dos. */}
                <SelectFormField<VehicleExpenseForm>
                    label="Naturaleza"
                    name="nature"
                    options={VEHICLE_EXPENSE_NATURES}
                    control={control}
                    errorMessage={errors.nature?.message}
                    validation={{
                        required: "Indica si el gasto fue preventivo o correctivo"
                    }}
                />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
                <TextFormField<VehicleExpenseForm>
                    label="Monto (Q)"
                    name="amount"
                    type="number"
                    placeholder="1250.00"
                    register={register}
                    errorMessage={errors.amount?.message}
                    validation={{
                        required: "Ingresa el monto del gasto",
                        valueAsNumber: true,
                        min: {
                            value: VEHICLE_EXPENSE_AMOUNT_MIN,
                            message: "El monto debe ser mayor que cero"
                        },
                        max: {
                            value: VEHICLE_EXPENSE_AMOUNT_MAX,
                            message: `El monto no puede superar los ${VEHICLE_EXPENSE_AMOUNT_MAX}`
                        }
                    }}
                />

                {/* El mantenimiento ya ocurrió: una fecha futura es 422 en el backend. */}
                <DateFormField<VehicleExpenseForm>
                    label="Fecha del gasto"
                    name="expenseDate"
                    max={todayAsInputValue()}
                    register={register}
                    errorMessage={errors.expenseDate?.message}
                    validation={{
                        required: "Ingresa la fecha del gasto",
                        validate: (value) =>
                            typeof value !== 'string' || value <= todayAsInputValue()
                                ? true
                                : "La fecha del gasto no puede ser futura"
                    }}
                />
            </div>

            {/* Hoy no hay campos de taller, factura ni pieza: todo eso vive aquí. */}
            <TextAreaFormField<VehicleExpenseForm>
                label="Descripción"
                name="description"
                rows={4}
                placeholder="Cuatro llantas nuevas, taller El Rodaje, factura A-9912"
                register={register}
                errorMessage={errors.description?.message}
                validation={{
                    required: "Describe el gasto: taller, factura y pieza",
                    maxLength: {
                        value: VEHICLE_EXPENSE_DESCRIPTION_MAX_LENGTH,
                        message: `La descripción no puede superar los ${VEHICLE_EXPENSE_DESCRIPTION_MAX_LENGTH} caracteres`
                    }
                }}
            />
        </>
    );
}
