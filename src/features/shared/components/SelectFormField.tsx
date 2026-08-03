import { Controller, type Control, type FieldValues, type Path, type RegisterOptions } from "react-hook-form";
import Select from "react-select";
import type { Option } from "@/features/shared/shared";

type Props<T extends FieldValues> = {
    label: string;
    name: Path<T>;
    options: Option[];
    errorMessage?: string;
    control: Control<T>;
    validation: RegisterOptions<T, Path<T>>;
};

export function SelectFormField<T extends FieldValues>({
    label,
    name,
    options,
    errorMessage,
    control,
    validation
}: Props<T>) {
    return (
        <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">
                {label}
            </label>

            <Controller
                name={name}
                control={control}
                rules={validation}
                render={({ field }) => (
                    <Select
                        {...field}
                        options={options}
                        isSearchable
                        placeholder="Seleccione un opción"
                        noOptionsMessage={() => 'Sin opciones'}
                        classNamePrefix="react-select "
                        value={options.find((opt) => opt.value === field.value) || null}
                        onChange={(selected) => field.onChange(selected?.value)}

                    />
                )}
            />

            <p className="text-red-400 text-xs">{errorMessage}</p>
        </div>
    );
}
