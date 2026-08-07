import { ProductMoment, ProductName, ProductStatus, productProvider, type Product } from "@/features/products/products";
import { ActionsMenu, CustomFilledButton, ErrorComponent, FadeInUp, Pagination, Table, Tbody, Td, Th, Thead, Title, Tr, useNotification, usePagination } from "@/features/shared/shared";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";

export function IndexProducts() {
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const { page, rowsPerPage } = usePagination(searchParams);

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['getProducts', page, rowsPerPage],
        queryFn: () => productProvider.getProducts(rowsPerPage.toString(), page.toString())
    });

    const { mutate } = useMutation({
        mutationFn: (id: string) => productProvider.deleteProductById(id),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getProducts'] });
        },
        onError: (err) => notification.error(err.message)
    });

    const askToDelete = (product: Product) => {
        notification.question(
            `Eliminar ${product.name}`,
            "Eliminar",
            "El producto sale del catálogo y deja de estar disponible al armar un viaje.",
            () => mutate(product.id.toString())
        );
    };

    if (isError) return <ErrorComponent message={error.message} />

    const products = data?.data ?? [];

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <Title
                    title="Productos"
                    subtitle="El catálogo de lo que se transporta. Cada viaje se arma eligiendo de aquí."
                />

                <CustomFilledButton
                    label="Agregar producto"
                    type="button"
                    icon={<Plus size={16} />}
                    onClick={() => navigate('/productos/crear')}
                />
            </div>

            {isLoading && (
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                    Cargando productos
                </p>
            )}

            {!isLoading && products.length === 0 && (
                <FadeInUp>
                    <div className="rounded-2xl border border-dashed border-line-strong bg-surface px-8 py-14 text-center">
                        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                            Sin registros
                        </p>

                        <p className="mx-auto mt-3 max-w-[34ch] font-display text-xl font-semibold tracking-tight text-ink">
                            El catálogo está vacío.
                        </p>

                        <p className="mx-auto mt-2 max-w-[42ch] text-sm text-ink-muted">
                            Agrega el primer producto para poder armar viajes con él.
                        </p>

                        <div className="mt-6 flex justify-center">
                            <CustomFilledButton
                                label="Agregar producto"
                                type="button"
                                icon={<Plus size={16} />}
                                onClick={() => navigate('/productos/crear')}
                            />
                        </div>
                    </div>
                </FadeInUp>
            )}

            {!isLoading && products.length > 0 && (
                <FadeInUp>
                    <Table>
                        <Thead>
                            <Th text="Producto" />
                            <Th text="Estado" />
                            <Th text="Registró" />
                            <Th text="Fecha" />
                            <Th text="" />
                        </Thead>

                        <Tbody>
                            {products.map((product) => (
                                <Tr key={product.id}>
                                    <Td>
                                        <ProductName name={product.name} />
                                    </Td>

                                    <Td>
                                        <ProductStatus status={product.status} />
                                    </Td>

                                    <Td>
                                        {product.registeredByName}
                                    </Td>

                                    <Td>
                                        <ProductMoment value={product.createdAt} />
                                    </Td>

                                    <Td className="text-right">
                                        <ActionsMenu
                                            items={[
                                                {
                                                    label: "Ver detalle",
                                                    icon: <Eye />,
                                                    onClick: () => navigate(`/productos/${product.id}`)
                                                },
                                                {
                                                    label: "Editar",
                                                    icon: <Pencil />,
                                                    onClick: () => navigate(`/productos/${product.id}/editar`)
                                                },
                                                {
                                                    label: "Eliminar",
                                                    icon: <Trash2 />,
                                                    onClick: () => askToDelete(product),
                                                    danger: true
                                                }
                                            ]}
                                        />
                                    </Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>

                    <Pagination
                        page={page}
                        rowsPerPage={rowsPerPage}
                        count={data?.total ?? 0}
                        setSearchParams={setSearchParams}
                    />
                </FadeInUp>
            )}
        </div>
    );
}
