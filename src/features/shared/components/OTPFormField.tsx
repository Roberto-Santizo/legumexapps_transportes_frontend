import { Controller, type Control, type FieldValues, type Path, type RegisterOptions } from "react-hook-form";
import { OTPInput, REGEXP_ONLY_DIGITS, type SlotProps } from "input-otp";

type Props<T extends FieldValues> = {
    label: string;
    name: Path<T>;
    control: Control<T>;
    validation: RegisterOptions<T, Path<T>>;
    length?: number;
    errorMessage?: string;
    disabled?: boolean;
    onComplete?: (value: string) => void;
};

type SlotFieldProps = {
    slot: SlotProps;
    hasError: boolean;
};

function Slot({ slot, hasError }: SlotFieldProps) {
    const borderColor = hasError
        ? "border-danger"
        : slot.isActive
            ? "border-ink"
            : "border-line-strong";

    const ring = slot.isActive
        ? hasError
            ? "shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-danger)_18%,transparent)]"
            : "shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-ink)_14%,transparent)]"
        : "";

    return (
        <div
            className={`relative flex h-14 w-11 items-center justify-center rounded-lg border bg-surface font-mono text-xl text-ink transition-all duration-150 ${borderColor} ${ring}`}
        >
            {slot.char !== null && <span>{slot.char}</span>}

            {slot.hasFakeCaret && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="otp_caret h-7 w-px bg-ink" />
                </div>
            )}
        </div>
    );
}

export function OTPFormField<T extends FieldValues>({
    label,
    name,
    control,
    validation,
    length = 6,
    errorMessage,
    disabled = false,
    onComplete
}: Props<T>) {
    const hasError = Boolean(errorMessage);

    return (
        <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700" htmlFor={name}>
                {label}
            </label>

            <Controller
                name={name}
                control={control}
                rules={validation}
                render={({ field }) => (
                    <OTPInput
                        id={name}
                        ref={field.ref}
                        name={field.name}
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        onComplete={onComplete}
                        maxLength={length}
                        pattern={REGEXP_ONLY_DIGITS}
                        disabled={disabled}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        containerClassName="flex items-center gap-2 has-disabled:opacity-50"
                        render={({ slots }) => (
                            <>
                                <div className="flex gap-2">
                                    {slots.slice(0, length / 2).map((slot, index) => (
                                        <Slot key={index} slot={slot} hasError={hasError} />
                                    ))}
                                </div>

                                <div className="h-px w-3 shrink-0 bg-line-strong" />

                                <div className="flex gap-2">
                                    {slots.slice(length / 2).map((slot, index) => (
                                        <Slot key={index} slot={slot} hasError={hasError} />
                                    ))}
                                </div>
                            </>
                        )}
                    />
                )}
            />

            <p className="text-red-400 text-xs">{errorMessage}</p>
        </div>
    );
}
