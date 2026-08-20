/**
 * Piezas de lectura de una característica. La ficha del accesorio ya rotula sus
 * campos fijos con el mono en versalitas y los responde con la faz de texto, y
 * aquí se compone igual: los campos que el usuario añadió se leen como los que
 * trae el sistema, en la misma placa.
 *
 * La asimetría tipográfica no es adorno, es el dato: la API sube el `name` a
 * MAYÚSCULAS y le respeta la caja al `value`. Rotular con mono en versalitas y
 * responder con la faz de texto es enseñar esa regla sin explicarla.
 */

import { formatCharacteristicMoment } from "@/features/accessory-characteristics/accessory-characteristics";

type NameProps = {
    /** Ya viene en MAYÚSCULAS de la API: se pinta tal cual, sin transformar. */
    name: string;
}

export function AccessoryCharacteristicName({ name }: NameProps) {
    return (
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
            {name}
        </span>
    );
}

type ValueProps = {
    /** Siempre texto, aunque diga «12» o «12/03/2024»: la API no tipa los valores. */
    value: string;
}

export function AccessoryCharacteristicValue({ value }: ValueProps) {
    return (
        <span className="text-sm break-words text-ink">
            {value}
        </span>
    );
}

type AuthorProps = {
    registeredBy: string;
    /** Cuándo se capturó, en `d-m-Y h:i:s A`. No hay `updatedAt` que mostrar. */
    createdAt: string;
}

export function AccessoryCharacteristicAuthor({ registeredBy, createdAt }: AuthorProps) {
    return (
        <span className="font-mono text-[10px] tracking-[0.12em] text-ink-subtle">
            {registeredBy} · {formatCharacteristicMoment(createdAt)}
        </span>
    );
}
