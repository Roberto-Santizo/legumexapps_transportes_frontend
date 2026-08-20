/**
 * Placa de características de un accesorio. No es una pantalla: la API exige
 * `accessoryId` en el listado y no se puede buscar accesorios por característica,
 * así que este dominio existe solo dentro del detalle del accesorio y aquí se
 * administra entero —alta, edición y borrado incluidos—.
 *
 * Se pinta como una placa de especificaciones y no como una tabla: hay dos
 * columnas de datos, no siete, y los pares nombre/valor son la continuación de
 * los campos fijos de la ficha, no un libro de movimientos.
 */

import type { AccessoryCharacteristic } from "@/features/accessory-characteristics/accessory-characteristics";
import {
    AccessoryCharacteristicAuthor,
    AccessoryCharacteristicFormModal,
    AccessoryCharacteristicName,
    AccessoryCharacteristicValue,
    accessoryCharacteristicProvider,
    ACCESSORY_NOT_FOUND_MESSAGE,
    canWriteAccessoryCharacteristics
} from "@/features/accessory-characteristics/accessory-characteristics";
import {
    ActionsMenu,
    CustomFilledButton,
    FadeInUp,
    SpinnerComponent,
    useNotification
} from "@/features/shared/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useSelector } from "react-redux";
import type { ReactNode } from "react";
import type { RootState } from "@/config/store/store";

type Props = {
    accessoryId: string;
    /** El accesorio se nombra por su código en el diálogo de borrado, no por su id. */
    code: string;
}

export function AccessoryCharacteristicsPanel({ accessoryId, code }: Props) {
    const notification = useNotification();
    const queryClient = useQueryClient();

    const role = useSelector((state: RootState) => state.auth.user?.role);
    /** Cualquier autenticado lee; solo `administrator` escribe. Al resto se le esconden los botones. */
    const canWrite = canWriteAccessoryCharacteristics(role);

    const [formOpen, setFormOpen] = useState(false);
    const [characteristicToEdit, setCharacteristicToEdit] = useState<AccessoryCharacteristic | null>(null);

    /** Sin paginar: el listado completo cabe en una respuesta y no hay filtros ni orden configurable. */
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['getAccessoryCharacteristics', accessoryId],
        queryFn: () => accessoryCharacteristicProvider.getAccessoryCharacteristics(accessoryId)
    });

    const { mutate } = useMutation({
        mutationFn: (id: string) => accessoryCharacteristicProvider.deleteAccessoryCharacteristicById(id),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getAccessoryCharacteristics', accessoryId] });
        },
        onError: (err) => notification.error(err.message)
    });

    const openCreate = () => {
        setCharacteristicToEdit(null);
        setFormOpen(true);
    };

    const openEdit = (characteristic: AccessoryCharacteristic) => {
        setCharacteristicToEdit(characteristic);
        setFormOpen(true);
    };

    /**
     * El borrado es real: la fila desaparece y no hay papelera ni historial. Se
     * dice qué característica se está borrando y de qué accesorio, porque
     * recuperarla es volver a capturar los dos campos.
     */
    const askToDelete = (characteristic: AccessoryCharacteristic) => {
        notification.question(
            `Eliminar ${characteristic.name}`,
            "Eliminar",
            `Vale «${characteristic.value}» en ${code}. Se borra de la ficha del accesorio y no se puede deshacer.`,
            () => mutate(characteristic.id.toString())
        );
    };

    const characteristics = data ?? [];

    /**
     * Un 404 aquí es un accesorio que no está, que no es lo mismo que un
     * accesorio sin características: eso último llega como lista vacía y tiene
     * su propio estado.
     */
    if (isError) {
        return (
            <PanelShell>
                <p className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-ink">
                    {error.message === ACCESSORY_NOT_FOUND_MESSAGE
                        ? "Este accesorio ya no está en el inventario, así que no tiene características que mostrar."
                        : error.message}
                </p>
            </PanelShell>
        );
    }

    return (
        <PanelShell
            action={canWrite && characteristics.length > 0 && (
                <CustomFilledButton
                    label="Agregar característica"
                    type="button"
                    icon={<Plus size={16} />}
                    onClick={openCreate}
                />
            )}
        >
            {isLoading && <SpinnerComponent />}

            {!isLoading && characteristics.length === 0 && (
                <div className="rounded-2xl border border-dashed border-line-strong bg-canvas px-6 py-12 text-center">
                    <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                        Placa en blanco
                    </p>

                    <p className="mx-auto mt-3 max-w-[36ch] font-display text-lg font-semibold tracking-tight text-ink">
                        Este accesorio no tiene características.
                    </p>

                    <p className="mx-auto mt-2 max-w-[46ch] text-sm text-ink-muted">
                        Agrega los datos que lo identifican —su placa, su medida, su número de
                        serie— para reconocerlo sin tenerlo delante.
                    </p>

                    {canWrite && (
                        <div className="mt-6 flex justify-center">
                            <CustomFilledButton
                                label="Agregar característica"
                                type="button"
                                icon={<Plus size={16} />}
                                onClick={openCreate}
                            />
                        </div>
                    )}
                </div>
            )}

            {!isLoading && characteristics.length > 0 && (
                <FadeInUp>
                    {/* Los pares se leen como los campos fijos de la ficha: rótulo arriba, dato debajo. */}
                    <dl className="grid gap-x-8 sm:grid-cols-2">
                        {characteristics.map((characteristic) => (
                            <div
                                key={characteristic.id}
                                className="flex items-start justify-between gap-3 border-t border-line py-3.5"
                            >
                                <div className="flex min-w-0 flex-col gap-1.5">
                                    <dt>
                                        <AccessoryCharacteristicName name={characteristic.name} />
                                    </dt>

                                    <dd className="flex flex-col gap-1">
                                        <AccessoryCharacteristicValue value={characteristic.value} />

                                        <AccessoryCharacteristicAuthor
                                            registeredBy={characteristic.registeredBy}
                                            createdAt={characteristic.createdAt}
                                        />
                                    </dd>
                                </div>

                                {canWrite && (
                                    <ActionsMenu
                                        items={[
                                            {
                                                label: "Editar",
                                                icon: <Pencil />,
                                                onClick: () => openEdit(characteristic)
                                            },
                                            {
                                                label: "Eliminar",
                                                icon: <Trash2 />,
                                                onClick: () => askToDelete(characteristic),
                                                danger: true
                                            }
                                        ]}
                                    />
                                )}
                            </div>
                        ))}
                    </dl>
                </FadeInUp>
            )}

            {canWrite && (
                <AccessoryCharacteristicFormModal
                    open={formOpen}
                    closeModal={() => setFormOpen(false)}
                    accessoryId={accessoryId}
                    characteristic={characteristicToEdit}
                />
            )}
        </PanelShell>
    );
}

type ShellProps = {
    children: ReactNode;
    action?: ReactNode;
}

/** Mismo marco que la ficha del accesorio: la placa es otra hoja del mismo expediente. */
function PanelShell({ children, action }: ShellProps) {
    return (
        <section className="max-w-4xl rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h3 className="font-display text-xl font-semibold tracking-tight text-ink">
                        Características
                    </h3>

                    <p className="mt-1 text-sm text-ink-muted">
                        Los datos propios de este accesorio, con el nombre que le pusiste.
                    </p>
                </div>

                {action}
            </div>

            {children}
        </section>
    );
}
