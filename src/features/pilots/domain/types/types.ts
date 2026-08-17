import type {
    PaginatedPilotSalaryHistorySchema,
    PaginatedPilotsSchema,
    PilotSalaryHistorySchema,
    PilotSchema
} from "@/features/pilots/pilots";
import type { z } from "zod";

export type Pilot = z.infer<typeof PilotSchema>;
export type PaginatedPilots = z.infer<typeof PaginatedPilotsSchema>;
export type PilotSalaryHistory = z.infer<typeof PilotSalaryHistorySchema>;
export type PaginatedPilotSalaryHistory = z.infer<typeof PaginatedPilotSalaryHistorySchema>;

/**
 * El único cuerpo que acepta el dominio: un campo y nada más. `salary` es el
 * salario RESULTANTE y absoluto, no un aumento ni un delta, y se captura como
 * número aunque la API lo devuelva como cadena. El autor del cambio sale
 * siempre del token: mandarlo aquí no tiene ningún efecto.
 */
export type PilotSalaryForm = {
    /** GTQ mensuales, [0.01, 99999999.99]. Más de dos decimales se pierden al guardar. */
    salary: number;
}
