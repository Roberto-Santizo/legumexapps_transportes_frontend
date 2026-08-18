/**
 * Único punto del front donde el salario deja de ser una cadena, donde se
 * decide si un cambio vale la pena enviar y donde se traduce un error del
 * backend a un texto para el usuario. Si aparece un `Number(pilot.salary)` en
 * cualquier otro archivo, está mal: el error caro de este dominio es tratar
 * `null` como cero, y eso solo se evita convirtiendo en un sitio.
 */

import type { PilotSalaryForm } from "@/features/pilots/pilots";
import { isAxiosError } from "axios";

/** Límites que valida el backend. Se replican para no gastar un 422. */
export const PILOT_SALARY_RANGE = { min: 0.01, max: 99999999.99 };

/** Los decimales más allá del segundo se pierden al guardar. */
const SALARY_DECIMALS = 2;

/**
 * Mandar el salario que el piloto ya tiene responde 400 y no escribe nada en
 * la bitácora. Este es el literal del backend: se reconoce para tratarlo como
 * «no había nada que guardar» y no como un fallo del formulario.
 */
export const SAME_SALARY_MESSAGE = "El salario indicado es el mismo que el piloto ya tiene registrado";

/** Un `carrier` sin empresa registrada recibe este 403 en los tres endpoints. */
export const CARRIER_REQUIRED_MESSAGE = "Debes estar vinculado a un transportista para acceder a este recurso";

/**
 * Cadena de la API → número. Conserva el `null`: un piloto sin salario
 * asignado no gana cero, y aplanarlo a `0` borra la única diferencia que
 * importa en este listado.
 */
export const toSalaryAmount = (value: string | null): number | null => {
    if (value === null) return null;

    const amount = Number(value);

    return Number.isFinite(amount) ? amount : null;
};

/**
 * Solo para mostrar. La API no manda ni símbolo ni periodicidad: el quetzal y
 * el «al mes» los pone el front porque son convención del dominio.
 */
export const formatSalary = (value: string | null): string | null => {
    const amount = toSalaryAmount(value);

    if (amount === null) return null;

    return `Q${amount.toLocaleString('es-GT', {
        minimumFractionDigits: SALARY_DECIMALS,
        maximumFractionDigits: SALARY_DECIMALS
    })}`;
};

/**
 * La comparación del backend es a dos decimales: contra un `"4500.00"` caen en
 * el 400 tanto `4500` como `4500.00` y `4500.004`. Se replica aquí para poder
 * deshabilitar el botón antes de gastar la petición.
 */
export const isSameSalary = (current: string | null, next: number): boolean => {
    const amount = toSalaryAmount(current);

    if (amount === null || !Number.isFinite(next)) return false;

    return amount.toFixed(SALARY_DECIMALS) === next.toFixed(SALARY_DECIMALS);
};

export type SalaryChangeDirection = 'initial' | 'up' | 'down';

/**
 * Bajar el salario está permitido y se registra igual que una subida, así que
 * la dirección es un dato de la bitácora, no una anomalía.
 */
export const getSalaryChangeDirection = (previousSalary: string | null, newSalary: string): SalaryChangeDirection => {
    const previous = toSalaryAmount(previousSalary);

    if (previous === null) return 'initial';

    return (toSalaryAmount(newSalary) ?? 0) >= previous ? 'up' : 'down';
};

/** Diferencia en valor absoluto entre los dos importes de una entrada. */
export const getSalaryDifference = (previousSalary: string | null, newSalary: string): string | null => {
    const previous = toSalaryAmount(previousSalary);
    const next = toSalaryAmount(newSalary);

    if (previous === null || next === null) return null;

    return formatSalary(Math.abs(next - previous).toFixed(SALARY_DECIMALS));
};

/** El backend rechaza la cadena del formulario: el importe viaja numérico. */
export const buildPilotSalaryPayload = (form: PilotSalaryForm): PilotSalaryForm => ({
    salary: Number(form.salary)
});

/**
 * El backend responde con dos formas distintas: el sobre `{ statusCode,
 * message, data }` para 400/401/403/404 y el formato de Laravel
 * `{ message, errors }` para el 422. En el 422 se prefieren los mensajes de
 * `errors`, que ya vienen redactados en español y nombran el campo que falla.
 */
export const getPilotErrorMessage = (error: unknown): string => {
    if (!isAxiosError(error)) return "Error no controlado.";

    const data = error.response?.data;

    if (data && typeof data === 'object') {
        const { errors, message } = data as { errors?: unknown; message?: unknown };

        if (errors && typeof errors === 'object') {
            const messages = Object.values(errors as Record<string, unknown>)
                .flatMap((entry) => Array.isArray(entry) ? entry : [entry])
                .filter((entry): entry is string => typeof entry === 'string');

            if (messages.length > 0) return messages.join(' · ');
        }

        if (typeof message === 'string') return message;
    }

    return "Error no controlado.";
};
