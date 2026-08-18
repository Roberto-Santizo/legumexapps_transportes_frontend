import { FileFormField, SelectFormField, TextFormField } from "@/features/shared/shared";
import {
    VEHICLE_CONDITIONS,
    VEHICLE_DECIMAL_MIN,
    VEHICLE_ENGINE_NUMBER_MAX_LENGTH,
    VEHICLE_PLATE_MAX_LENGTH,
    VEHICLE_STATUSES,
    VEHICLE_TYPES,
    VEHICLE_YEAR_MIN,
    type VehicleForm
} from "@/features/vehicles/vehicles";
import { Lock } from "lucide-react";
import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";

type Props = {
    register: UseFormRegister<VehicleForm>;
    control: Control<VehicleForm>;
    errors: FieldErrors<VehicleForm>;
    /** En edición la imagen ya existe: solo se reemplaza si el usuario sube otra. */
    imageRequired?: boolean;
    imageLabel?: string;
    /** El estado solo se edita: al crear, la unidad siempre nace activa. */
    showStatus?: boolean;
    /**
     * Solo un `administrator` mueve el kilometraje. Bloqueado, el campo se
     * pinta pero no se envía: quien edita ve el valor guardado y el PATCH no
     * arriesga el 403 que abortaría la operación entera.
     */
    mileageLocked?: boolean;
    /** Valor guardado, para pintarlo cuando el campo va bloqueado. */
    storedMileage?: number;
}

const currentYear = new Date().getFullYear();

export function VehicleFormComponent({
    register,
    control,
    errors,
    imageRequired = true,
    imageLabel = "Fotografía de la unidad",
    showStatus = false,
    mileageLocked = false,
    storedMileage
}: Props) {
    return (
        <>
            <TextFormField<VehicleForm>
                label="Placa"
                name="plate"
                type="text"
                placeholder="P123ABC"
                register={register}
                errorMessage={errors.plate?.message}
                validation={{
                    required: "Ingresa la placa de la unidad",
                    maxLength: {
                        value: VEHICLE_PLATE_MAX_LENGTH,
                        message: `La placa no puede tener más de ${VEHICLE_PLATE_MAX_LENGTH} caracteres`
                    }
                }}
            />

            <div className="grid gap-6 sm:grid-cols-2">
                <TextFormField<VehicleForm>
                    label="Marca"
                    name="brand"
                    type="text"
                    placeholder="Kenworth"
                    register={register}
                    errorMessage={errors.brand?.message}
                    validation={{
                        required: "Ingresa la marca",
                    }}
                />

                <TextFormField<VehicleForm>
                    label="Modelo"
                    name="model"
                    type="text"
                    placeholder="T680"
                    register={register}
                    errorMessage={errors.model?.message}
                    validation={{
                        required: "Ingresa el modelo",
                    }}
                />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
                <TextFormField<VehicleForm>
                    label="Año"
                    name="year"
                    type="number"
                    placeholder="2021"
                    register={register}
                    errorMessage={errors.year?.message}
                    validation={{
                        required: "Ingresa el año",
                        valueAsNumber: true,
                        min: {
                            value: VEHICLE_YEAR_MIN,
                            message: `El año debe ser ${VEHICLE_YEAR_MIN} o posterior`
                        },
                        max: {
                            value: currentYear + 1,
                            message: `El año no puede ser mayor a ${currentYear + 1}`
                        }
                    }}
                />

                <TextFormField<VehicleForm>
                    label="Capacidad en libras"
                    name="capacity"
                    type="number"
                    placeholder="15000.50"
                    register={register}
                    errorMessage={errors.capacity?.message}
                    validation={{
                        required: "Ingresa la capacidad de carga",
                        valueAsNumber: true,
                        min: {
                            value: 0,
                            message: "La capacidad no puede ser negativa"
                        }
                    }}
                />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
                <SelectFormField<VehicleForm>
                    label="Tipo de unidad"
                    name="type"
                    options={VEHICLE_TYPES}
                    control={control}
                    errorMessage={errors.type?.message}
                    validation={{
                        required: "Selecciona el tipo de unidad",
                    }}
                />

                {/* Condición ≠ estado: se adquirió nueva o usada, y eso no cambia si opera o está en taller. */}
                <SelectFormField<VehicleForm>
                    label="Condición de compra"
                    name="condition"
                    options={VEHICLE_CONDITIONS}
                    control={control}
                    errorMessage={errors.condition?.message}
                    validation={{
                        required: "Selecciona cómo se adquirió la unidad",
                    }}
                />
            </div>

            <TextFormField<VehicleForm>
                label="Número de motor"
                name="engineNumber"
                type="text"
                placeholder="PE013704"
                register={register}
                errorMessage={errors.engineNumber?.message}
                validation={{
                    required: "Ingresa el número de motor",
                    maxLength: {
                        value: VEHICLE_ENGINE_NUMBER_MAX_LENGTH,
                        message: `El número de motor no puede tener más de ${VEHICLE_ENGINE_NUMBER_MAX_LENGTH} caracteres`
                    }
                }}
            />

            <fieldset className="flex flex-col gap-6 rounded-xl border border-line bg-canvas/40 p-5">
                <legend className="px-2 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
                    Operación y costos
                </legend>

                <TextFormField<VehicleForm>
                    label="Rendimiento en kilómetros por galón"
                    name="kilometersPerGallon"
                    type="number"
                    placeholder="17.20"
                    register={register}
                    errorMessage={errors.kilometersPerGallon?.message}
                    validation={{
                        required: "Ingresa el rendimiento de la unidad",
                        valueAsNumber: true,
                        min: {
                            value: VEHICLE_DECIMAL_MIN,
                            message: "El rendimiento debe ser mayor que cero"
                        }
                    }}
                />

                <div className="grid gap-6 sm:grid-cols-2">
                    <TextFormField<VehicleForm>
                        label="Valor de compra (Q)"
                        name="purchasePrice"
                        type="number"
                        placeholder="458897.46"
                        register={register}
                        errorMessage={errors.purchasePrice?.message}
                        validation={{
                            required: "Ingresa el valor de compra",
                            valueAsNumber: true,
                            min: {
                                value: VEHICLE_DECIMAL_MIN,
                                message: "El valor de compra debe ser mayor que cero"
                            }
                        }}
                    />

                    <TextFormField<VehicleForm>
                        label="Seguro mensual (Q)"
                        name="monthlyInsuranceCost"
                        type="number"
                        placeholder="603.37"
                        register={register}
                        errorMessage={errors.monthlyInsuranceCost?.message}
                        validation={{
                            required: "Ingresa el costo mensual del seguro",
                            valueAsNumber: true,
                            min: {
                                value: VEHICLE_DECIMAL_MIN,
                                message: "El seguro mensual debe ser mayor que cero"
                            }
                        }}
                    />
                </div>

                {mileageLocked
                    ? <LockedMileage storedMileage={storedMileage} />
                    : (
                        <TextFormField<VehicleForm>
                            label="Kilometraje"
                            name="mileage"
                            type="number"
                            placeholder="475046"
                            register={register}
                            errorMessage={errors.mileage?.message}
                            validation={{
                                required: "Ingresa el kilometraje",
                                valueAsNumber: true,
                                min: {
                                    value: 0,
                                    message: "El kilometraje no puede ser negativo"
                                },
                                validate: (value) =>
                                    value === undefined || Number.isInteger(value)
                                        ? true
                                        : "El kilometraje se registra en kilómetros enteros"
                            }}
                        />
                    )}
            </fieldset>

            {showStatus && (
                <SelectFormField<VehicleForm>
                    label="Estado operativo"
                    name="status"
                    options={VEHICLE_STATUSES}
                    control={control}
                    errorMessage={errors.status?.message}
                    validation={{
                        required: "Selecciona el estado de la unidad",
                    }}
                />
            )}

            <FileFormField<VehicleForm>
                label={imageLabel}
                name="image"
                control={control}
                validation={imageRequired ? { required: "Selecciona una imagen" } : {}}
            />
        </>
    );
}

type LockedMileageProps = {
    storedMileage?: number;
}

/**
 * El campo se enseña, pero no se registra en el formulario: así el kilometraje
 * no puede viajar por accidente y disparar el 403 que aborta el PATCH entero.
 * Se dice quién sí puede cambiarlo, para que el hueco no parezca un fallo.
 */
function LockedMileage({ storedMileage }: LockedMileageProps) {
    return (
        <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="mileage">
                Kilometraje
            </label>

            <input
                id="mileage"
                type="text"
                readOnly
                disabled
                value={storedMileage !== undefined ? storedMileage.toLocaleString('es-GT') : ''}
                className="text_form_field cursor-not-allowed opacity-70"
            />

            <p className="flex items-center gap-1.5 text-xs text-ink-muted">
                <Lock size={12} aria-hidden />
                Solo un administrador puede corregir el kilometraje.
            </p>
        </div>
    );
}
