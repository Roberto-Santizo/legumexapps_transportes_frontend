/**
 * Confirmación reforzada: el borrado es real e irreversible y el código queda
 * ocupado para siempre, así que hay que teclearlo para confirmar.
 */

import type { FinishedProduct } from "@/features/finished-products/finished-products";
import { normalizeFinishedProductCode } from "@/features/finished-products/finished-products";
import { Modal, SpinnerComponent } from "@/features/shared/shared";
import { useState } from "react";

type Props = {
    /** El SKU a borrar, o `null` con el diálogo cerrado. */
    finishedProduct: FinishedProduct | null;
    isPending: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export function FinishedProductDeleteDialog({ finishedProduct, isPending, onClose, onConfirm }: Props) {
    return (
        <Modal
            modal={Boolean(finishedProduct)}
            closeModal={onClose}
            title="Eliminar producto terminado"
            width="sm:max-w-lg"
        >
            {finishedProduct && (
                /** La `key` reinicia lo tecleado al cambiar de SKU. */
                <FinishedProductDeleteConfirmation
                    key={finishedProduct.id}
                    finishedProduct={finishedProduct}
                    isPending={isPending}
                    onClose={onClose}
                    onConfirm={onConfirm}
                />
            )}
        </Modal>
    );
}

type ConfirmationProps = {
    finishedProduct: FinishedProduct;
    isPending: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

function FinishedProductDeleteConfirmation({ finishedProduct, isPending, onClose, onConfirm }: ConfirmationProps) {
    const [typedCode, setTypedCode] = useState('');

    const matches = normalizeFinishedProductCode(typedCode) === normalizeFinishedProductCode(finishedProduct.code);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (matches && !isPending) onConfirm();
    };

    return (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
            <div className="flex flex-col gap-2 rounded-xl bg-ink-deep px-5 py-4 text-canvas">
                <span className="font-mono text-[15px] uppercase tracking-[0.2em]">
                    {finishedProduct.code}
                </span>

                <span className="font-display text-lg font-semibold uppercase leading-tight tracking-tight">
                    {finishedProduct.name}
                </span>

                {finishedProduct.clientName && (
                    <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-canvas/60">
                        {finishedProduct.clientName}
                    </span>
                )}
            </div>

            <div className="flex flex-col gap-3">
                <p className="text-sm text-ink-muted">
                    El producto sale del catálogo: no aparece en el listado, no se puede
                    abrir y no hay forma de restaurarlo.
                </p>

                <p className="text-sm text-ink-muted">
                    Su código queda ocupado: ningún producto nuevo podrá volver a usarlo.
                </p>
            </div>

            <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-gray-700">
                    Escribe <span className="font-mono uppercase text-ink">{finishedProduct.code}</span> para confirmar
                </span>

                <input
                    type="text"
                    value={typedCode}
                    onChange={(event) => setTypedCode(event.target.value)}
                    placeholder={finishedProduct.code}
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
                    {isPending ? <SpinnerComponent /> : "Eliminar producto"}
                </button>
            </div>
        </form>
    );
}
