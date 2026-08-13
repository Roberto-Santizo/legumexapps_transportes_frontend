import { ProductFormComponent, ProductPageHeader, ProductStatus, productProvider, type ProductForm } from "@/features/products/products";
import { CustomFilledButton, CustomForm, ErrorComponent, FadeInUp, useNotification } from "@/features/shared/shared";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

export function UpdateProduct() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();

    const { data: product, isLoading, isError, error } = useQuery({
        queryKey: ['getProductById', id],
        queryFn: () => productProvider.getProductById(id!),
        enabled: Boolean(id)
    });

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<ProductForm>();

    useEffect(() => {
        if (product) {
            setValue('name', product.name);
        }
    }, [product, setValue]);

    const { mutate, isPending } = useMutation({
        mutationFn: (payload: ProductForm) => productProvider.updateProductById(id!, payload),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getProducts'] });
            queryClient.invalidateQueries({ queryKey: ['getProductById', id] });
            navigate('/productos');
        },
        onError: (err) => notification.error(err.message)
    });

    const onSubmit = (data: ProductForm) => mutate(data);

    if (isError) return <ErrorComponent message={error.message} />

    return (
        <div className="flex flex-col gap-8">
            <ProductPageHeader
                title="Editar producto"
                subtitle="Corrige el nombre con el que aparece en el catálogo. El cambio se refleja en los viajes que lo usan."
            >
                {product && <ProductStatus status={product.status} />}
            </ProductPageHeader>

            {isLoading && (
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                    Cargando producto
                </p>
            )}

            {!isLoading && product && (
                <FadeInUp>
                    <div className="max-w-2xl">
                        <CustomForm onSubmit={handleSubmit(onSubmit)}>
                            <ProductFormComponent
                                register={register}
                                errors={errors}
                            />

                            <CustomFilledButton
                                label="Guardar cambios"
                                type="submit"
                                fullWitdh
                                disabled={isPending}
                            />
                        </CustomForm>
                    </div>
                </FadeInUp>
            )}
        </div>
    );
}
