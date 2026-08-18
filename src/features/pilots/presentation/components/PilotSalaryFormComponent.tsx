import type { PilotSalaryForm } from "@/features/pilots/pilots";
import { PILOT_SALARY_RANGE, formatSalary, isSameSalary } from "@/features/pilots/pilots";
import { TextFormField } from "@/features/shared/shared";
import { useWatch, type Control, type FieldErrors, type UseFormRegister } from "react-hook-form";

type Props = {
    register: UseFormRegister<PilotSalaryForm>;
    control: Control<PilotSalaryForm>;
    errors: FieldErrors<PilotSalaryForm>;
    /** Salario vigente del piloto. `null` si nunca se le ha asignado uno. */
    currentSalary: string | null;
}

export function PilotSalaryFormComponent({ register, control, errors, currentSalary }: Props) {
    const salary = useWatch({ control, name: 'salary' });

    const unchanged = isSameSalary(currentSalary, salary);
    const current = formatSalary(currentSalary);

    return (
        <>
            <TextFormField<PilotSalaryForm>
                label="Salario base mensual (Q)"
                name="salary"
                type="number"
                placeholder="4500.00"
                register={register}
                errorMessage={errors.salary?.message}
                validation={{
                    required: "El salario es obligatorio",
                    valueAsNumber: true,
                    validate: (value) =>
                        !Number.isNaN(value) || "El salario debe ser un número en quetzales",
                    min: {
                        value: PILOT_SALARY_RANGE.min,
                        message: "El salario debe ser mayor que cero"
                    },
                    max: {
                        value: PILOT_SALARY_RANGE.max,
                        message: `El salario no puede superar los ${PILOT_SALARY_RANGE.max} quetzales`
                    }
                }}
            />

            {unchanged && current && (
                <p className="rounded-lg border border-line bg-canvas px-3 py-2 text-xs text-ink-muted">
                    Ese es el salario que el piloto ya tiene ({current} al mes). Cambia la cifra
                    para registrar un ajuste.
                </p>
            )}

            <p className="text-xs text-ink-subtle">
                El ajuste rige desde que se guarda y queda en la bitácora con tu nombre.
                El piloto no recibe ningún aviso.
            </p>
        </>
    );
}
