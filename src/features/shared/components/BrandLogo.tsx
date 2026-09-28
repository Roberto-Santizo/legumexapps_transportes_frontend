import logo from "@/assets/brand/legumex-logo.png";
import mark from "@/assets/brand/legumex-mark.png";

type Props = {
    /** `full`: logo con nombre y lema. `mark`: solo las montañas, para espacios chicos. */
    variant?: "full" | "mark";
    className?: string;
};

/** Logo de Agroindustria Legumex. Verde oscuro sobre transparente: pensado para fondos claros. */
export function BrandLogo({ variant = "full", className = "" }: Props) {
    return (
        <img
            src={variant === "full" ? logo : mark}
            alt="Agroindustria Legumex"
            className={`object-contain ${className}`}
            draggable={false}
        />
    );
}
