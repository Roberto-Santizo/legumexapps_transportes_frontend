import { SpinnerComponent } from "@/features/shared/shared";

type Props = {
    label: string;
    type: "submit" | "reset" | "button" | undefined;
    onClick?: () => void;
    icon?: React.ReactNode;
    disabled?: boolean;
    fullWitdh?: boolean;
    className?: string;
}
export function CustomFilledButton({ label, type, onClick, icon, disabled = false, fullWitdh = false, className }: Props) {
    const hasIcon = icon ? true : false;
    const classNameComponent = `
                ${fullWitdh ? "w-full" : ""}
                ${hasIcon ? "inline-flex items-center justify-center gap-2" : ""}
                rounded-lg
                bg-ink
                px-4
                py-2
                text-sm
                font-semibold
                text-white
                shadow-sm
                transition-all
                duration-200
                hover:bg-ink/90
                hover:shadow-md
                active:scale-[0.98]
                disabled:cursor-not-allowed
                disabled:bg-ink/40
                disabled:shadow-none
                focus:outline-none
                focus:ring-2
                focus:ring-ink/20
                focus:ring-offset-2
                cursor-pointer
                ${className}
            `;
    return (
        <button disabled={disabled} type={type} className={classNameComponent} onClick={onClick ? () => onClick() : () => { }}>
            {icon ? (icon) : (<></>)}
            {disabled ? <SpinnerComponent /> : (<p className="text-white font-semibold">{label}</p>)}
        </button>
    )
}
