import { FUEL_TYPE_LABELS, FuelPriceFigure, FuelPriceMoment, FuelPricePageHeader, FuelPriceStatus, fuelPriceProvider } from "@/features/fuel-prices/fuel-prices";
import { CustomFilledButton, ErrorComponent, FadeInUp, useNotification } from "@/features/shared/shared";
import { Pencil, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import type { ReactNode } from "react";

type FieldProps = {
    label: string;
    children: ReactNode;
}

function Field({ label, children }: FieldProps) {
    return (
        <div className="border-t border-line py-3.5">
            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                {label}
            </dt>
            <dd className="mt-1.5 text-sm text-ink">{children}</dd>
        </div>
    );
}

export function ShowFuelPrice() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();

    const { data: fuelPrice, isLoading, isError, error } = useQuery({
        queryKey: ['getFuelPriceById', id],
        queryFn: () => fuelPriceProvider.getFuelPriceById(id!),
        enabled: Boolean(id)
    });

    const { mutate } = useMutation({
        mutationFn: () => fuelPriceProvider.deleteFuelPriceById(id!),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getFuelPrices'] });
            navigate('/gasolina-precios');
        },
        onError: (err) => notification.error(err.message)
    });

    const askToDelete = () => {
        if (!fuelPrice) return;

        const label = FUEL_TYPE_LABELS[fuelPrice.fuelType] ?? fuelPrice.fuelType;

        notification.question(
            `Eliminar precio de ${label}`,
            "Eliminar",
            fuelPrice.status === 'active'
                ? "Es el precio vigente: al borrarlo, este combustible se queda sin precio para costear viajes."
                : "El registro sale del historial de precios.",
            () => mutate()
        );
    };

    if (isError) return <ErrorComponent message={error.message} />

    return (
        <div className="flex flex-col gap-8">
            <FuelPricePageHeader
                title="Detalle del precio"
                subtitle="El precio registrado para este combustible y quién lo capturó."
            >
                {fuelPrice && (
                    <div className="flex items-center gap-2">
                        <CustomFilledButton
                            label="Editar"
                            type="button"
                            icon={<Pencil size={16} />}
                            onClick={() => navigate(`/gasolina-precios/${fuelPrice.id}/editar`)}
                        />

                        <button
                            type="button"
                            onClick={askToDelete}
                            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm font-medium text-danger transition-colors hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-danger/20"
                        >
                            <Trash2 size={16} />
                            Eliminar
                        </button>
                    </div>
                )}
            </FuelPricePageHeader>

            {isLoading && (
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                    Cargando precio
                </p>
            )}

            {!isLoading && fuelPrice && (
                <FadeInUp>
                    <div className="max-w-4xl overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
                        <div className="grid lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
                            {/* El precio se rotula igual que en la pizarra: es el dato por el que se abre esta ficha. */}
                            <div className="flex flex-col justify-center gap-3 bg-ink-deep px-7 py-9 text-canvas">
                                <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-canvas/50">
                                    {FUEL_TYPE_LABELS[fuelPrice.fuelType] ?? fuelPrice.fuelType}
                                </span>

                                <FuelPriceFigure price={fuelPrice.price} size="lg" />
                            </div>

                            <div className="flex flex-col gap-6 p-6 sm:p-8">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div>
                                        <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
                                            {FUEL_TYPE_LABELS[fuelPrice.fuelType] ?? fuelPrice.fuelType}
                                        </h2>

                                        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-subtle">
                                            Registro {fuelPrice.id}
                                        </p>
                                    </div>

                                    <FuelPriceStatus status={fuelPrice.status} />
                                </div>

                                <dl className="grid gap-x-8 sm:grid-cols-2">
                                    <Field label="Registró">
                                        {fuelPrice.registeredByName}
                                    </Field>

                                    <Field label="Fecha de registro">
                                        <FuelPriceMoment value={fuelPrice.createdAt} withTime />
                                    </Field>
                                </dl>
                            </div>
                        </div>
                    </div>
                </FadeInUp>
            )}
        </div>
    );
}
