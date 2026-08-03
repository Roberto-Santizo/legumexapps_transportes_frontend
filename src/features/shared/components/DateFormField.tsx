import type {
  Path,
  RegisterOptions,
  UseFormRegister,
} from "react-hook-form";

type Props<T extends Record<string, any>> = {
  label: string;
  name: Path<T>;
  errorMessage?: string;
  register: UseFormRegister<T>;
  validation?: RegisterOptions<T, Path<T>>;
  min?: string;
  max?: string;
};

export function DateFormField<T extends Record<string, any>>({
  label,
  name,
  errorMessage,
  register,
  validation,
  min,
  max,
}: Props<T>) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <label
        className="text-sm font-medium text-gray-700"
        htmlFor={name}
      >
        {label}
      </label>

      <input
        type="date"
        id={name}
        {...register(name, validation)}
        min={min}
        max={max}
        className={`text_form_field ${errorMessage ? "text_form_field_error" : ""}`}
      />

      {errorMessage && (
        <p className="text-red-400 text-xs">{errorMessage}</p>
      )}
    </div>
  );
}
