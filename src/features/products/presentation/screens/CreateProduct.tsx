import { ProductFormComponent, ProductPageHeader, productProvider, type ProductForm } from "@/features/products/products";
import { CustomFilledButton, CustomForm, FadeInUp, useNotification } from "@/features/shared/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

export function CreateProduct() {
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ProductForm>();

    const { mutate, isPending } = useMutation({
        mutationFn: (payload: ProductForm) => productProvider.createProduct(payload),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getProducts'] });
            navigate('/productos');
        },
        onError: (err) => notification.error(err.message)
    });

    const onSubmit = (data: ProductForm) => mutate(data);

    return (
        <div className="flex flex-col gap-8">
            <ProductPageHeader
                title="Agregar producto"
                subtitle="El producto entra activo al catálogo: desde ese momento se puede elegir al armar un viaje."
            />

            <FadeInUp>
                <div className="max-w-2xl">
                    <CustomForm onSubmit={handleSubmit(onSubmit)}>
                        <ProductFormComponent
                            register={register}
                            errors={errors}
                        />

                        <CustomFilledButton
                            label="Agregar producto"
                            type="submit"
                            fullWitdh
                            disabled={isPending}
                        />
                    </CustomForm>
                </div>
            </FadeInUp>
        </div>
    );
}
