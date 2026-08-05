import { FileFormField, SelectFormField, TextFormField } from "@/features/shared/shared";
import { VEHICLE_STATUSES, VEHICLE_TYPES, type VehicleForm } from "@/features/vehicles/vehicles";
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
}

const currentYear = new Date().getFullYear();

export function VehicleFormComponent({ register, control, errors, imageRequired = true, imageLabel = "Fotografía de la unidad", showStatus = false }: Props) {
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
                        value: 15,
                        message: "La placa no puede tener más de 15 caracteres"
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
                            value: 1950,
                            message: "El año debe ser 1950 o posterior"
                        },
                        max: {
                            value: currentYear + 1,
                            message: `El año no puede ser mayor a ${currentYear + 1}`
                        }
                    }}
                />

                <TextFormField<VehicleForm>
                    label="Capacidad en kilogramos"
                    name="capacity"
                    type="number"
                    placeholder="15000.50"
                    register={register}
                    errorMessage={errors.capacity?.message}
                    validation={{
                        required: "Ingresa la capacidad de carga",
                        valueAsNumber: true,
                        min: {
                            value: 0.01,
                            message: "La capacidad debe ser mayor a cero"
                        }
                    }}
                />
            </div>

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

            {showStatus && (
                <SelectFormField<VehicleForm>
                    label="Estado de la unidad"
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
