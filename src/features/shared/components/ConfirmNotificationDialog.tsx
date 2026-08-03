import { Dialog, Transition } from "@headlessui/react";
import { CircleHelp } from "lucide-react";
import { Fragment, useRef, useState } from "react";
import { notificationProvider } from "@/features/shared/core/notifications/notificationInstance";
import { useNotificationState } from "@/features/shared/core/notifications/useNotificationState";
import type { ToastItem } from "@/features/shared/domain/domain";

export function ConfirmNotificationDialog() {
    const { confirms } = useNotificationState();
    const cancelRef = useRef<HTMLButtonElement>(null);

    // Se conserva la última confirmación para que el panel no quede vacío durante la animación de salida.
    const current = confirms.at(0) ?? null;
    const [rendered, setRendered] = useState<ToastItem | null>(null);

    if (current && current.id !== rendered?.id) setRendered(current);

    const item = current ?? rendered;
    const close = (confirmed: boolean) => {
        if (item) notificationProvider.resolveConfirm(item.id, confirmed);
    };

    return (
        <Transition appear show={Boolean(current)} as={Fragment}>
            <Dialog as="div" className="relative z-50" initialFocus={cancelRef} onClose={() => close(false)}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-200"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-150"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-200"
                            enterFrom="opacity-0 scale-95 translate-y-2"
                            enterTo="opacity-100 scale-100 translate-y-0"
                            leave="ease-in duration-150"
                            leaveFrom="opacity-100 scale-100 translate-y-0"
                            leaveTo="opacity-0 scale-95 translate-y-2"
                        >
                            <Dialog.Panel className="w-full transform overflow-hidden rounded-2xl bg-surface p-6 shadow-2xl transition-all sm:max-w-md">
                                <div className="flex gap-3">
                                    <CircleHelp size={18} className="mt-0.5 shrink-0 text-ink" />

                                    <div className="min-w-0 flex-1">
                                        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                                            Confirmar
                                        </p>

                                        <Dialog.Title className="mt-1 font-display text-lg font-semibold text-ink-deep">
                                            {item?.message}
                                        </Dialog.Title>

                                        {item?.description && (
                                            <p className="mt-2 text-[13px] leading-snug text-ink-muted">
                                                {item.description}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-6 flex justify-end gap-2">
                                    <button
                                        ref={cancelRef}
                                        type="button"
                                        onClick={() => close(false)}
                                        className="rounded-lg px-4 py-2 text-sm text-ink-muted transition-colors hover:bg-canvas hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15"
                                    >
                                        Cancelar
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => close(true)}
                                        className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ink-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15"
                                    >
                                        {item?.action?.label}
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
