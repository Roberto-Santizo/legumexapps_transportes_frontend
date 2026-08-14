/**
 * Las bandas de una zona se administran aquí y no en una pantalla propia: una
 * tarifa no significa nada fuera de su zona, y el listado sin filtro devuelve
 * zonas × productos × combustibles × bandas de una sola vez. El modal vive
 * dentro del detalle de la zona y siempre consulta con `zoneId`.
 */

import type { FreightRate, FreightRateForm } from "@/features/freight-rates/freight-rates";
import {
    FreightBandThreshold,
    FreightFuelTypeTag,
    FreightPricePerPound,
    FreightRateFormComponent,
    FreightRateProvenance,
    buildFreightRatePayload,
    freightRateProvider,
    groupFreightRates
} from "@/features/freight-rates/freight-rates";
import {
    ActionsMenu,
    CustomFilledButton,
    Modal,
    SpinnerComponent,
    useNotification,
    type Option
} from "@/features/shared/shared";
import { productProvider } from "@/features/products/products";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";

/** El catálogo de productos no pagina en la práctica: se pide entero para el select. */
const PRODUCTS_LIMIT = '500';

type FormPanelProps = {
    zoneId: number;
    /** `null` da de alta una banda nueva; con tarifa, la edita. */
    rate: FreightRate | null;
    products: Option[];
    isPending: boolean;
    onSubmit: (payload: FreightRateForm) => void;
    onCancel: () => void;
}

/**
 * Se monta con los valores ya puestos y se desmonta al volver al listado: así
 * no hace falta resetear el formulario entre un alta y una edición.
 */
function FreightRateFormPanel({ zoneId, rate, products, isPending, onSubmit, onCancel }: FormPanelProps) {
    const {
        register,
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<FreightRateForm>({
        defaultValues: {
            zoneId,
            productId: rate?.productId,
            fuelType: rate?.fuelType ?? '',
            fuelMin: rate ? Number(rate.fuelMin) : undefined,
            pricePerPound: rate ? Number(rate.pricePerPound) : undefined
        }
    });

    return (
        <div className="flex flex-col gap-5">
            <button
                type="button"
                onClick={onCancel}
                className="inline-flex w-fit cursor-pointer items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle transition-colors hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
            >
                <ArrowLeft size={14} />
                Bandas de la zona
            </button>

            {products.length === 0 && (
                <p className="rounded-lg border border-line bg-canvas px-4 py-3 text-sm text-ink-muted">
                    No hay productos activos en el catálogo. Registra uno antes de cotizar una banda.
                </p>
            )}

            <form
                onSubmit={handleSubmit((data) => onSubmit(buildFreightRatePayload({ ...data, zoneId })))}
                noValidate
                className="flex flex-col gap-5"
            >
                <FreightRateFormComponent
                    register={register}
                    control={control}
                    errors={errors}
                    products={products}
                />

                <CustomFilledButton
                    label={rate ? "Guardar cambios" : "Cotizar banda"}
                    type="submit"
                    fullWitdh
                    disabled={isPending}
                />
            </form>
        </div>
    );
}

type Props = {
    zoneId: number;
    zoneName: string;
    /** Una zona dada de baja congela sus tarifas: se leen, pero no se cotizan ni se editan. */
    zoneActive: boolean;
    canWrite: boolean;
    modal: boolean;
    closeModal: () => void;
}

export function FreightRatesModal({ zoneId, zoneName, zoneActive, canWrite, modal, closeModal }: Props) {
    const notification = useNotification();
    const queryClient = useQueryClient();

    const [editing, setEditing] = useState<FreightRate | null>(null);
    const [showForm, setShowForm] = useState(false);

    const { data: rates, isLoading, isError, error } = useQuery({
        queryKey: ['getFreightRates', zoneId],
        queryFn: () => freightRateProvider.getFreightRates(zoneId.toString()),
        enabled: modal
    });

    const { data: productsPage } = useQuery({
        queryKey: ['getProducts', PRODUCTS_LIMIT, '1'],
        queryFn: () => productProvider.getProducts(PRODUCTS_LIMIT, '1'),
        enabled: modal && canWrite
    });

    /** Un producto inactivo devuelve 400 al cotizar: no llega al select. */
    const products: Option[] = (productsPage?.data ?? [])
        .filter((product) => product.status)
        .map((product) => ({ value: product.id, label: product.name }));

    const backToList = () => {
        setShowForm(false);
        setEditing(null);
    };

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['getFreightRates', zoneId] });
    };

    const { mutate: createRate, isPending: isCreating } = useMutation({
        mutationFn: (payload: FreightRateForm) => freightRateProvider.createFreightRate(payload),
        onSuccess: (message) => {
            notification.success(message);
            invalidate();
            backToList();
        },
        onError: (err) => notification.error(err.message)
    });

    const { mutate: updateRate, isPending: isUpdating } = useMutation({
        mutationFn: (payload: FreightRateForm) => freightRateProvider.updateFreightRateById(editing!.id.toString(), payload),
        onSuccess: (message) => {
            notification.success(message);
            invalidate();
            backToList();
        },
        onError: (err) => notification.error(err.message)
    });

    const { mutate: removeRate } = useMutation({
        mutationFn: (id: string) => freightRateProvider.deleteFreightRateById(id),
        onSuccess: (message) => {
            notification.success(message);
            invalidate();
        },
        onError: (err) => notification.error(err.message)
    });

    const handleClose = () => {
        backToList();
        closeModal();
    };

    const askToDelete = (rate: FreightRate) => {
        notification.question(
            `Eliminar la banda desde Q${Number(rate.fuelMin).toFixed(2)}`,
            "Eliminar",
            "La tarifa desaparece del listado y deja de aplicarse. No se puede restaurar: para recuperarla hay que cotizarla de nuevo.",
            () => removeRate(rate.id.toString())
        );
    };

    const openCreate = () => {
        setEditing(null);
        setShowForm(true);
    };

    const openEdit = (rate: FreightRate) => {
        setEditing(rate);
        setShowForm(true);
    };

    const groups = groupFreightRates(rates ?? []);
    const total = rates?.length ?? 0;

    return (
        <Modal
            modal={modal}
            closeModal={handleClose}
            title={`Tarifas de flete · ${zoneName}`}
            width="sm:max-w-3xl"
        >
            {showForm ? (
                <FreightRateFormPanel
                    zoneId={zoneId}
                    rate={editing}
                    products={products}
                    isPending={isCreating || isUpdating}
                    onSubmit={editing ? updateRate : createRate}
                    onCancel={backToList}
                />
            ) : (
                <div className="flex flex-col gap-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="max-w-[52ch] text-sm text-ink-muted">
                            Cada banda fija el precio de la libra desde un precio de combustible hacia arriba.
                            El techo lo marca la banda siguiente del mismo producto.
                        </p>

                        {canWrite && zoneActive && (
                            <CustomFilledButton
                                label="Cotizar banda"
                                type="button"
                                icon={<Plus size={16} />}
                                onClick={openCreate}
                            />
                        )}
                    </div>

                    {canWrite && !zoneActive && (
                        <p className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-ink">
                            La zona está dada de baja: sus tarifas quedan congeladas hasta reactivarla.
                            Se pueden leer y eliminar, pero no cotizar ni editar.
                        </p>
                    )}

                    {isLoading && <SpinnerComponent />}

                    {isError && (
                        <p className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
                            {error.message}
                        </p>
                    )}

                    {!isLoading && !isError && total === 0 && (
                        <div className="rounded-2xl border border-dashed border-line-strong px-6 py-12 text-center">
                            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                                Sin bandas
                            </p>

                            <p className="mx-auto mt-3 max-w-[34ch] font-display text-lg font-semibold tracking-tight text-ink">
                                Esta zona todavía no tiene ninguna tarifa cotizada.
                            </p>

                            <p className="mx-auto mt-2 max-w-[46ch] text-sm text-ink-muted">
                                Hasta que exista una banda, cotizar un flete a cualquier punto de esta zona falla.
                            </p>
                        </div>
                    )}

                    {!isLoading && total > 0 && (
                        <div className="flex flex-col gap-4">
                            {groups.map((group) => (
                                <section
                                    key={group.productId}
                                    className="overflow-hidden rounded-2xl border border-line"
                                >
                                    <header className="flex items-center justify-between gap-3 border-b border-line bg-canvas px-5 py-3">
                                        <span className="font-display text-[15px] font-semibold uppercase tracking-tight text-ink">
                                            {group.productName}
                                        </span>

                                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                                            {group.fuelTypes.reduce((count, entry) => count + entry.rates.length, 0)} bandas
                                        </span>
                                    </header>

                                    {group.fuelTypes.map((entry) => (
                                        <div key={entry.fuelType} className="border-b border-line px-5 py-4 last:border-b-0">
                                            <FreightFuelTypeTag fuelType={entry.fuelType} />

                                            <div className="mt-3 ml-1 border-l border-line-strong pl-4">
                                                {entry.rates.map((rate, index) => (
                                                    <div
                                                        key={rate.id}
                                                        className="flex items-center justify-between gap-4 border-b border-line py-3 last:border-b-0 last:pb-0 first:pt-0"
                                                    >
                                                        <FreightBandThreshold
                                                            fuelMin={rate.fuelMin}
                                                            nextFuelMin={entry.rates[index + 1]?.fuelMin ?? null}
                                                            isBase={index === 0}
                                                        />

                                                        <FreightPricePerPound value={rate.pricePerPound} />

                                                        <div className="hidden sm:block">
                                                            <FreightRateProvenance
                                                                registeredByName={rate.registeredByName}
                                                                updatedAt={rate.updatedAt}
                                                            />
                                                        </div>

                                                        {canWrite && (
                                                            <ActionsMenu
                                                                items={[
                                                                    ...(zoneActive
                                                                        ? [{
                                                                            label: "Editar",
                                                                            icon: <Pencil />,
                                                                            onClick: () => openEdit(rate)
                                                                        }]
                                                                        : []),
                                                                    {
                                                                        label: "Eliminar",
                                                                        icon: <Trash2 />,
                                                                        onClick: () => askToDelete(rate),
                                                                        danger: true
                                                                    }
                                                                ]}
                                                            />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </section>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </Modal>
    );
}
