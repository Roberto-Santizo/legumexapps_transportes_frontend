/**
 * Los cinco campos del SKU. El código rechaza cualquier espacio (la API da 422
 * en vez de corregirlo); el nombre se limpia antes de enviar porque el backend
 * lo guarda tal cual. Las dos cantidades admiten hasta dos decimales.
 */

import type { FinishedProductForm } from "@/features/finished-products/finished-products";
import {
    FINISHED_PRODUCT_AMOUNT_MAX,
    FINISHED_PRODUCT_AMOUNT_MIN,
    FINISHED_PRODUCT_AMOUNT_PATTERN,
    FINISHED_PRODUCT_CODE_MAX_LENGTH,
    FINISHED_PRODUCT_CODE_PATTERN,
    FINISHED_PRODUCT_NAME_MAX_LENGTH
} from "@/features/finished-products/finished-products";
import { SelectFormField, TextFormField, type Option } from "@/features/shared/shared";
import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";

type Props = {
    register: UseFormRegister<FinishedProductForm>;
    control: Control<FinishedProductForm>;
    errors: FieldErrors<FinishedProductForm>;
    clientOptions: Option[];
}

/** Mismas reglas para las dos cantidades; solo cambia el sujeto del mensaje. */
const amountValidation = (subject: string, required: string) => ({
    required,
    pattern: {
        value: FINISHED_PRODUCT_AMOUNT_PATTERN,
        message: `${subject} debe ser un número con hasta dos decimales`
    },
    validate: (value: string | number | null) => {
        const amount = Number(value);

        if (amount < FINISHED_PRODUCT_AMOUNT_MIN) return `${subject} debe ser mayor a 0`;
        if (amount > FINISHED_PRODUCT_AMOUNT_MAX) return `${subject} no puede superar ${FINISHED_PRODUCT_AMOUNT_MAX}`;

        return true;
    }
});

export function FinishedProductFormComponent({ register, control, errors, clientOptions }: Props) {
    return (
        <>
            <SelectFormField<FinishedProductForm>
                label="Cliente"
                name="clientId"
                options={clientOptions}
                control={control}
                errorMessage={errors.clientId?.message}
                validation={{ required: "El cliente es obligatorio" }}
            />

            <div className="grid gap-4 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
                <TextFormField<FinishedProductForm>
                    label="Código"
                    name="code"
                    type="text"
                    placeholder="BRO-IQF-10"
                    register={register}
                    errorMessage={errors.code?.message}
                    validation={{
                        required: "El código del producto terminado es obligatorio",
                        maxLength: {
                            value: FINISHED_PRODUCT_CODE_MAX_LENGTH,
                            message: `El código del producto terminado no puede superar los ${FINISHED_PRODUCT_CODE_MAX_LENGTH} caracteres`
                        },
                        setValueAs: (value: string) => value.trim(),
                        pattern: {
                            value: FINISHED_PRODUCT_CODE_PATTERN,
                            message: "El código no puede contener espacios"
                        }
                    }}
                />

                <TextFormField<FinishedProductForm>
                    label="Nombre"
                    name="name"
                    type="text"
                    placeholder="Brócoli florete IQF"
                    register={register}
                    errorMessage={errors.name?.message}
                    validation={{
                        validate: (value) => String(value ?? "").trim().length > 0 || "El nombre del producto terminado es obligatorio",
                        maxLength: {
                            value: FINISHED_PRODUCT_NAME_MAX_LENGTH,
                            message: `El nombre del producto terminado no puede superar los ${FINISHED_PRODUCT_NAME_MAX_LENGTH} caracteres`
                        }
                    }}
                />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <TextFormField<FinishedProductForm>
                    label="Presentación"
                    name="presentation"
                    type="text"
                    placeholder="10"
                    register={register}
                    errorMessage={errors.presentation?.message}
                    validation={amountValidation("La presentación", "La presentación es obligatoria")}
                />

                <TextFormField<FinishedProductForm>
                    label="Cajas por tarima"
                    name="boxesPerPallet"
                    type="text"
                    placeholder="96.5"
                    register={register}
                    errorMessage={errors.boxesPerPallet?.message}
                    validation={amountValidation("Las cajas por tarima", "Las cajas por tarima son obligatorias")}
                />
            </div>

            <FinishedProductFieldRules />
        </>
    );
}

export function FinishedProductFieldRules() {
    return (
        <div className="flex flex-col gap-2 rounded-xl border border-line bg-canvas px-4 py-3.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                Cómo se guarda
            </span>

            <p className="text-sm text-ink-muted">
                El código y el nombre se guardan en mayúsculas. El código no admite
                espacios y es único; el nombre puede repetirse, incluso en el mismo cliente.
            </p>

            <p className="text-sm text-ink-muted">
                Un producto eliminado sigue ocupando su código, así que un duplicado
                puede venir de un registro que ya no aparece en el listado.
            </p>
        </div>
    );
}
