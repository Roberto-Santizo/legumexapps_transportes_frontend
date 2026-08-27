/**
 * Los dos únicos campos del cliente. Las reglas de los dos **no son la misma**,
 * y eso se dice en pantalla: el código rechaza cualquier espacio —la API
 * responde 422 en vez de corregirlo, para que un error de captura se vea— y el
 * nombre, en cambio, colapsa sus espacios internos en silencio.
 *
 * El aviso de abajo no es decoración: un cliente borrado sigue ocupando su
 * código y su nombre para siempre, así que un duplicado puede venir de una fila
 * que ya no aparece en ninguna pantalla. Es la única pista que tiene el usuario.
 */

import type { ClientForm } from "@/features/clients/clients";
import { CLIENT_CODE_MAX_LENGTH, CLIENT_CODE_PATTERN, CLIENT_NAME_MAX_LENGTH } from "@/features/clients/clients";
import { TextFormField } from "@/features/shared/shared";
import type { FieldErrors, UseFormRegister } from "react-hook-form";

type Props = {
    register: UseFormRegister<ClientForm>;
    errors: FieldErrors<ClientForm>;
}

export function ClientFormComponent({ register, errors }: Props) {
    return (
        <>
            <TextFormField<ClientForm>
                label="Código"
                name="code"
                type="text"
                placeholder="CLI-001"
                register={register}
                errorMessage={errors.code?.message}
                validation={{
                    required: "El código del cliente es obligatorio",
                    maxLength: {
                        value: CLIENT_CODE_MAX_LENGTH,
                        message: `El código del cliente no puede superar los ${CLIENT_CODE_MAX_LENGTH} caracteres`
                    },
                    pattern: {
                        value: CLIENT_CODE_PATTERN,
                        message: "El código no puede contener espacios"
                    }
                }}
            />

            <TextFormField<ClientForm>
                label="Razón social"
                name="name"
                type="text"
                placeholder="Agroexportadora del Sur"
                register={register}
                errorMessage={errors.name?.message}
                validation={{
                    required: "El nombre del cliente es obligatorio",
                    maxLength: {
                        value: CLIENT_NAME_MAX_LENGTH,
                        message: `El nombre del cliente no puede superar los ${CLIENT_NAME_MAX_LENGTH} caracteres`
                    }
                }}
            />

            <ClientFieldRules />
        </>
    );
}

export function ClientFieldRules() {
    return (
        <div className="flex flex-col gap-2 rounded-xl border border-line bg-canvas px-4 py-3.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                Cómo se guarda
            </span>

            <p className="text-sm text-ink-muted">
                Los dos campos se guardan en mayúsculas y sin espacios sobrantes: se
                muestra lo que devuelve el servidor, no lo que se teclea. El código no
                admite espacios de ningún tipo; el nombre sí junta los internos.
            </p>

            <p className="text-sm text-ink-muted">
                El código y la razón social son únicos y no se liberan: un cliente
                eliminado los sigue ocupando, así que un duplicado puede venir de un
                registro que ya no aparece en el listado.
            </p>
        </div>
    );
}
