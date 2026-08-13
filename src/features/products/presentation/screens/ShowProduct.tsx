import { ProductMoment, ProductName, ProductPageHeader, ProductStatus, productProvider } from "@/features/products/products";
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

export function ShowProduct() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();

    const { data: product, isLoading, isError, error } = useQuery({
        queryKey: ['getProductById', id],
        queryFn: () => productProvider.getProductById(id!),
        enabled: Boolean(id)
    });

    const { mutate } = useMutation({
        mutationFn: () => productProvider.deleteProductById(id!),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getProducts'] });
            navigate('/productos');
        },
        onError: (err) => notification.error(err.message)
    });

    const askToDelete = () => {
        if (!product) return;

        notification.question(
            `Eliminar ${product.name}`,
            "Eliminar",
            "El producto sale del catálogo y deja de estar disponible al armar un viaje.",
            () => mutate()
        );
    };

    if (isError) return <ErrorComponent message={error.message} />

    return (
        <div className="flex flex-col gap-8">
            <ProductPageHeader
                title="Detalle del producto"
                subtitle="Cómo aparece en el catálogo y quién lo registró."
            >
                {product && (
                    <div className="flex items-center gap-2">
                        <CustomFilledButton
                            label="Editar"
                            type="button"
                            icon={<Pencil size={16} />}
                            onClick={() => navigate(`/productos/${product.id}/editar`)}
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
            </ProductPageHeader>

            {isLoading && (
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                    Cargando producto
                </p>
            )}

            {!isLoading && product && (
                <FadeInUp>
                    <div className="max-w-4xl overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
                        <div className="grid lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
                            {/* El nombre se rotula igual que en la tabla: es el dato por el que se abre esta ficha. */}
                            <div className="flex flex-col justify-center gap-3 bg-ink-deep px-7 py-9 text-canvas">
                                <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-canvas/50">
                                    Registro {product.id}
                                </span>

                                <ProductName name={product.name} size="lg" />
                            </div>

                            <div className="flex flex-col gap-6 p-6 sm:p-8">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
                                        {product.name}
                                    </h2>

                                    <ProductStatus status={product.status} />
                                </div>

                                <dl className="grid gap-x-8 sm:grid-cols-2">
                                    <Field label="Registró">
                                        {product.registeredByName}
                                    </Field>

                                    <Field label="Fecha de registro">
                                        <ProductMoment value={product.createdAt} withTime />
                                    </Field>

                                    <Field label="Última actualización">
                                        <ProductMoment value={product.updatedAt} withTime />
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
