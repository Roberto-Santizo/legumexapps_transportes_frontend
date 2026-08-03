import type { Path, PathValue, RegisterOptions, UseFormRegister } from "react-hook-form";

type Props<T extends Record<string, any>> = {
    label: string;
    name: Path<T>;
    placeholder: string;
    type: string;
    errorMessage?: string;
    register: UseFormRegister<T>;
    validation: RegisterOptions<T, Path<T>>;
    value?: PathValue<T, Path<T>>;
    disabled?: boolean;
}


export function TextFormField<T extends Record<string, any>>({ label, name, placeholder, type, errorMessage, register, validation, value, disabled = false }: Props<T>) {
    return (
        <div className="flex flex-col gap-2">
            <label
                className="text-sm font-medium text-gray-700"
                htmlFor={name}
            >
                {label}
            </label>

            <input
                disabled={disabled}
                {...register(name, validation)}
                id={name}
                name={name}
                type={type}
                placeholder={placeholder}
                autoComplete="off"
                className={errorMessage ? 'text_form_field_error' : 'text_form_field'}
                value={value}
            />
            <p className="text-red-400 text-xs">{errorMessage}</p>
        </div>
    )
}
