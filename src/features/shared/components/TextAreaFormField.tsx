import type { FieldValues, Path, RegisterOptions, UseFormRegister } from "react-hook-form";

type Props<T extends FieldValues> = {
    label: string;
    name: Path<T>;
    placeholder: string;
    rows?: number;
    errorMessage?: string;
    register: UseFormRegister<T>;
    validation: RegisterOptions<T, Path<T>>;
}

export function TextAreaFormField<T extends FieldValues>({ label, name, placeholder, rows = 3, errorMessage, register, validation }: Props<T>) {
    return (
        <div className="flex flex-col gap-2">
            <label
                className="text-sm font-medium text-gray-700"
                htmlFor={name}
            >
                {label}
            </label>

            <textarea
                {...register(name, validation)}
                id={name}
                name={name}
                rows={rows}
                placeholder={placeholder}
                autoComplete="off"
                className={`resize-none ${errorMessage ? 'text_form_field_error' : 'text_form_field'}`}
            />

            <p className="text-red-400 text-xs">{errorMessage}</p>
        </div>
    )
}
