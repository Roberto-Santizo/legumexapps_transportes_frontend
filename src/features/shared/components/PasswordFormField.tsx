import { Eye, EyeClosed } from "lucide-react";
import { useState } from "react";
import type { Path, RegisterOptions, UseFormRegister } from "react-hook-form";

type Props<T extends Record<string, any>> = {
    label: string;
    name: Path<T>;
    placeholder: string;
    errorMessage?: string;
    register: UseFormRegister<T>;
    validation: RegisterOptions<T, Path<T>>;
}


export function PasswordFormField<T extends Record<string, any>>({ label, name, placeholder, errorMessage, register, validation }: Props<T>) {
    const [showPassword, setShowPassword] = useState<boolean>(false);

    return (
        <div className="flex flex-col gap-2">
            <label
                className="text-sm font-medium text-gray-700"
                htmlFor={name}
            >
                {label}
            </label>

            <div className="relative w-full">
                <input
                    {...register(name, validation)}
                    id={name}
                    type={showPassword ? "text" : "password"}
                    placeholder={placeholder}
                    autoComplete="off"
                    aria-invalid={!!errorMessage}
                    className={`${errorMessage ? "text_form_field_error" : "text_form_field"}`}
                />

                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    {showPassword ? <Eye size={18} /> : <EyeClosed size={18} />}
                </button>
            </div>

            <p className="text-red-400 text-xs">{errorMessage}</p>
        </div>
    )
}
