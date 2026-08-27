/**
 * El formulario entero del dominio: **un campo**. No hay código, ni sigla, ni
 * contacto, ni país, así que todo lo que se puede decir en pantalla se dice
 * alrededor de ese único campo.
 *
 * Debajo va el buscador previo al alta, que es la única defensa contra el
 * catálogo duplicado, y el aviso de cómo se guarda: un nombre ocupado puede
 * serlo por una naviera **borrada**, invisible en todas las pantallas. Es la
 * única pista que tiene el usuario cuando el servidor responde 400.
 */

import type { ShippingLineForm } from "@/features/shipping-lines/shipping-lines";
import { SHIPPING_LINE_NAME_MAX_LENGTH, ShippingLineNameMatches } from "@/features/shipping-lines/shipping-lines";
import { TextFormField } from "@/features/shared/shared";
import { useWatch, type Control, type FieldErrors, type UseFormRegister } from "react-hook-form";

type Props = {
    register: UseFormRegister<ShippingLineForm>;
    control: Control<ShippingLineForm>;
    errors: FieldErrors<ShippingLineForm>;
    /** En la edición, la propia naviera no cuenta como coincidencia. */
    excludeId?: number;
}

export function ShippingLineFormComponent({ register, control, errors, excludeId }: Props) {
    /** Lo que lleva tecleado el nombre, para buscarlo en el catálogo antes de enviar. */
    const term = useWatch({ control, name: 'name' }) ?? '';

    return (
        <>
            <TextFormField<ShippingLineForm>
                label="Nombre de la naviera"
                name="name"
                type="text"
                placeholder="Maersk Line"
                register={register}
                errorMessage={errors.name?.message}
                validation={{
                    required: "El nombre de la naviera es obligatorio",
                    maxLength: {
                        value: SHIPPING_LINE_NAME_MAX_LENGTH,
                        message: `El nombre de la naviera no puede superar los ${SHIPPING_LINE_NAME_MAX_LENGTH} caracteres`
                    }
                }}
            />

            <ShippingLineNameMatches term={term} excludeId={excludeId} />

            <ShippingLineFieldRules />
        </>
    );
}

export function ShippingLineFieldRules() {
    return (
        <div className="flex flex-col gap-2 rounded-xl border border-line bg-canvas px-4 py-3.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                Cómo se guarda
            </span>

            <p className="text-sm text-ink-muted">
                El nombre se guarda en mayúsculas, sin espacios sobrantes y con los
                internos juntos: se muestra lo que devuelve el servidor, no lo que se
                teclea.
            </p>

            <p className="text-sm text-ink-muted">
                El nombre es único y no se libera nunca: una naviera eliminada lo sigue
                ocupando, así que un duplicado puede venir de un registro que ya no
                aparece en el listado.
            </p>
        </div>
    );
}
