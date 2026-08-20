import type { AccessoryCharacteristicForm } from "@/features/accessory-characteristics/accessory-characteristics";
import {
    CHARACTERISTIC_NAME_MAX_LENGTH,
    CHARACTERISTIC_VALUE_MAX_LENGTH,
    normalizeCharacteristicName
} from "@/features/accessory-characteristics/accessory-characteristics";
import { TextFormField } from "@/features/shared/shared";
import { useWatch, type Control, type FieldErrors, type UseFormRegister } from "react-hook-form";

type Props = {
    register: UseFormRegister<AccessoryCharacteristicForm>;
    control: Control<AccessoryCharacteristicForm>;
    errors: FieldErrors<AccessoryCharacteristicForm>;
}

/**
 * Dos campos y ninguno para el accesorio: en el alta lo pone el panel donde se
 * captura y en la edición es inmutable. Ofrecer un selector de accesorio sería
 * mentir —el backend ignora el `accessory_id` del PATCH sin dar error, así que
 * el usuario creería que movió la característica—.
 */
export function AccessoryCharacteristicFormComponent({ register, control, errors }: Props) {
    /** Lo que lleva tecleado el nombre, para anticipar con qué forma se guardará. */
    const nameValue = useWatch({ control, name: 'name' }) ?? '';
    const normalized = normalizeCharacteristicName(nameValue);
    /** Solo se avisa cuando el guardado difiere de lo tecleado: si ya coincide, no hay nada que advertir. */
    const showsPreview = normalized.length > 0 && normalized !== nameValue;

    return (
        <>
            <div className="flex flex-col gap-2">
                <TextFormField<AccessoryCharacteristicForm>
                    label="Nombre"
                    name="name"
                    type="text"
                    placeholder="Placa"
                    register={register}
                    errorMessage={errors.name?.message}
                    validation={{
                        required: "Ingresa el nombre de la característica",
                        maxLength: {
                            value: CHARACTERISTIC_NAME_MAX_LENGTH,
                            message: `El nombre no puede superar los ${CHARACTERISTIC_NAME_MAX_LENGTH} caracteres`
                        },
                        validate: (value) =>
                            normalizeCharacteristicName(value).length > 0
                                ? true
                                : "Ingresa el nombre de la característica"
                    }}
                />

                {/*
                  * El nombre se guarda en mayúsculas y con los espacios colapsados.
                  * Se enseña antes de enviar para que nadie se sorprenda al ver la
                  * fila guardada con otra forma de la que tecleó.
                  */}
                {showsPreview && (
                    <p className="-mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-ink-muted">
                        Se guardará como
                        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink">
                            {normalized}
                        </span>
                    </p>
                )}
            </div>

            {/* El valor conserva su capitalización: solo se le recortan los extremos. */}
            <TextFormField<AccessoryCharacteristicForm>
                label="Valor"
                name="value"
                type="text"
                placeholder="P-123ABC"
                register={register}
                errorMessage={errors.value?.message}
                validation={{
                    required: "Ingresa el valor de la característica",
                    maxLength: {
                        value: CHARACTERISTIC_VALUE_MAX_LENGTH,
                        message: `El valor no puede superar los ${CHARACTERISTIC_VALUE_MAX_LENGTH} caracteres`
                    },
                    validate: (value) =>
                        value.trim().length > 0
                            ? true
                            : "Ingresa el valor de la característica"
                }}
            />
        </>
    );
}
