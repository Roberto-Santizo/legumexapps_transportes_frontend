/**
 * La confirmación de borrado del catálogo de navieras. Aquí la baja es de
 * verdad irreversible —la fila desaparece de la API y solo se recupera tocando
 * la base de datos— y además **quema el nombre**, que en este dominio es lo
 * único que identifica a la naviera: ninguna naviera nueva podrá volver a
 * usarlo, ni siquiera para reponer la que se acaba de borrar.
 *
 * Por eso no es un «¿seguro?»: hay que teclear el nombre. Y el campo cuenta lo
 * que va a pasar —lo que se escribe para borrar es exactamente lo que queda
 * ocupado para siempre—, así que se pinta con la misma tipografía con la que se
 * lee en el listado.
 */

import type { ShippingLine } from "@/features/shipping-lines/shipping-lines";
import { normalizeShippingLineName } from "@/features/shipping-lines/shipping-lines";
import { Modal, SpinnerComponent } from "@/features/shared/shared";
import { useState } from "react";

type Props = {
    /** La naviera a borrar, o `null` con el diálogo cerrado. */
    shippingLine: ShippingLine | null;
    isPending: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export function ShippingLineDeleteDialog({ shippingLine, isPending, onClose, onConfirm }: Props) {
    return (
        <Modal
            modal={Boolean(shippingLine)}
            closeModal={onClose}
            title="Eliminar naviera"
            width="sm:max-w-lg"
        >
            {shippingLine && (
                /** La `key` reinicia lo tecleado al cambiar de naviera. */
                <ShippingLineDeleteConfirmation
                    key={shippingLine.id}
                    shippingLine={shippingLine}
                    isPending={isPending}
                    onClose={onClose}
                    onConfirm={onConfirm}
                />
            )}
        </Modal>
    );
}

type ConfirmationProps = {
    shippingLine: ShippingLine;
    isPending: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

function ShippingLineDeleteConfirmation({ shippingLine, isPending, onClose, onConfirm }: ConfirmationProps) {
    const [typedName, setTypedName] = useState('');

    /** Se compara ya normalizado: lo que importa es el nombre, no cómo se teclee. */
    const matches = normalizeShippingLineName(typedName) === normalizeShippingLineName(shippingLine.name);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (matches && !isPending) onConfirm();
    };

    return (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
            <div className="flex flex-col gap-2 rounded-xl bg-ink-deep px-5 py-4 text-canvas">
                <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-canvas/50">
                    Registro {shippingLine.id}
                </span>

                <span className="font-display text-lg font-semibold uppercase leading-tight tracking-tight">
                    {shippingLine.name}
                </span>
            </div>

            <div className="flex flex-col gap-3">
                <p className="text-sm text-ink-muted">
                    La naviera sale del catálogo y deja de existir para la aplicación: no
                    aparece en el listado, no se puede abrir y no hay forma de restaurarla.
                    Recuperarla exige entrar a la base de datos.
                </p>

                <p className="text-sm text-ink-muted">
                    Su nombre queda ocupado para siempre. Como es lo único que identifica a
                    una naviera, esta no podrá volver al catálogo ni con su propio nombre.
                    Si solo hay que corregir una errata, edítala en lugar de eliminarla.
                </p>
            </div>

            <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-gray-700">
                    Escribe <span className="font-display font-semibold uppercase text-ink">{shippingLine.name}</span> para confirmar
                </span>

                <input
                    type="text"
                    value={typedName}
                    onChange={(event) => setTypedName(event.target.value)}
                    placeholder={shippingLine.name}
                    autoComplete="off"
                    autoFocus
                    className="text_form_field uppercase"
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
                    {isPending ? <SpinnerComponent /> : "Eliminar naviera"}
                </button>
            </div>
        </form>
    );
}
