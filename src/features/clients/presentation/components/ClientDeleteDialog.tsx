/**
 * La confirmación de borrado del catálogo de clientes, y el único punto de la
 * aplicación donde una baja es de verdad irreversible: el resto de catálogos
 * nacionales solo apagan un `status`, aquí la fila desaparece de la API y solo
 * se recupera tocando la base de datos a mano.
 *
 * Por eso no es un «¿seguro?»: hay que teclear el código del cliente. El campo
 * no es un trámite, es la pieza que cuenta lo que va a pasar —el código que se
 * escribe para borrar es exactamente el que queda ocupado para siempre—, así
 * que se pinta con la misma tipografía con la que se lee en el listado.
 */

import type { Client } from "@/features/clients/clients";
import { normalizeClientCode } from "@/features/clients/clients";
import { Modal, SpinnerComponent } from "@/features/shared/shared";
import { useState } from "react";

type Props = {
    /** El cliente a borrar, o `null` con el diálogo cerrado. */
    client: Client | null;
    isPending: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export function ClientDeleteDialog({ client, isPending, onClose, onConfirm }: Props) {
    return (
        <Modal
            modal={Boolean(client)}
            closeModal={onClose}
            title="Eliminar cliente"
            width="sm:max-w-lg"
        >
            {client && (
                /** La `key` reinicia lo tecleado al cambiar de cliente. */
                <ClientDeleteConfirmation
                    key={client.id}
                    client={client}
                    isPending={isPending}
                    onClose={onClose}
                    onConfirm={onConfirm}
                />
            )}
        </Modal>
    );
}

type ConfirmationProps = {
    client: Client;
    isPending: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

function ClientDeleteConfirmation({ client, isPending, onClose, onConfirm }: ConfirmationProps) {
    const [typedCode, setTypedCode] = useState('');

    /** Se compara ya normalizado: lo que importa es el código, no cómo se teclee. */
    const matches = normalizeClientCode(typedCode) === normalizeClientCode(client.code);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (matches && !isPending) onConfirm();
    };

    return (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
            <div className="flex flex-col gap-2 rounded-xl bg-ink-deep px-5 py-4 text-canvas">
                <span className="font-mono text-[15px] uppercase tracking-[0.2em]">
                    {client.code}
                </span>

                <span className="font-display text-lg font-semibold uppercase leading-tight tracking-tight">
                    {client.name}
                </span>
            </div>

            <div className="flex flex-col gap-3">
                <p className="text-sm text-ink-muted">
                    El cliente sale del catálogo y deja de existir para la aplicación: no
                    aparece en el listado, no se puede abrir y no hay forma de restaurarlo.
                    Recuperarlo exige entrar a la base de datos.
                </p>

                <p className="text-sm text-ink-muted">
                    Su código y su razón social quedan ocupados: ningún cliente nuevo podrá
                    volver a usarlos.
                </p>
            </div>

            <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-gray-700">
                    Escribe <span className="font-mono uppercase text-ink">{client.code}</span> para confirmar
                </span>

                <input
                    type="text"
                    value={typedCode}
                    onChange={(event) => setTypedCode(event.target.value)}
                    placeholder={client.code}
                    autoComplete="off"
                    autoFocus
                    className="text_form_field font-mono uppercase"
                />
            </label>

            <div className="flex flex-wrap justify-end gap-3">
                <button
                    type="button"
                    onClick={onClose}
                    className="cursor-pointer rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-canvas focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                >
                    Cancelar
                </button>

                <button
                    type="submit"
                    disabled={!matches || isPending}
                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-danger/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-danger/40 disabled:shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-danger/30"
                >
                    {isPending ? <SpinnerComponent /> : "Eliminar cliente"}
                </button>
            </div>
        </form>
    );
}
