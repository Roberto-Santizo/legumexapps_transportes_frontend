import type { Zone, ZoneForm } from "@/features/zones/zones";
import { ZoneFormComponent, ZonePageHeader, ZoneStatus, buildZonePayload, zoneProvider } from "@/features/zones/zones";
import { CustomFilledButton, CustomForm, ErrorComponent, FadeInUp, useNotification } from "@/features/shared/shared";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

type FormProps = {
    zone: Zone;
    isPending: boolean;
    onSubmit: (payload: ZoneForm) => void;
}

/**
 * El formulario se monta con la zona ya cargada y no antes: el editor encuadra
 * el mapa sobre el polígono al montarse, así que necesita el trazado desde el
 * primer render, no en un efecto posterior.
 */
function UpdateZoneForm({ zone, isPending, onSubmit }: FormProps) {
    const {
        register,
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<ZoneForm>({
        defaultValues: {
            name: zone.name,
            description: zone.description ?? '',
            color: zone.color,
            area: zone.area
        }
    });

    return (
        <FadeInUp>
            <div className="max-w-4xl">
                <CustomForm onSubmit={handleSubmit((data) => onSubmit(buildZonePayload(data)))}>
                    <ZoneFormComponent
                        register={register}
                        control={control}
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
    );
}

export function UpdateZone() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();

    const { data: zone, isLoading, isError, error } = useQuery({
        queryKey: ['getZoneById', id],
        queryFn: () => zoneProvider.getZoneById(id!),
        enabled: Boolean(id)
    });

    const { mutate, isPending } = useMutation({
        mutationFn: (payload: ZoneForm) => zoneProvider.updateZoneById(id!, payload),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getZones'] });
            queryClient.invalidateQueries({ queryKey: ['getZoneById', id] });
            navigate('/zonas');
        },
        onError: (err) => notification.error(err.message)
    });

    if (isError) return <ErrorComponent message={error.message} />

    return (
        <div className="flex flex-col gap-8">
            <ZonePageHeader
                title="Editar zona"
                subtitle="Redibujar el área sustituye el trazado entero: el anterior no se guarda en ningún sitio."
            >
                {zone && <ZoneStatus status={zone.status} />}
            </ZonePageHeader>

            {isLoading && (
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                    Cargando zona
                </p>
            )}

            {!isLoading && zone && (
                <UpdateZoneForm
                    zone={zone}
                    isPending={isPending}
                    onSubmit={mutate}
                />
            )}
        </div>
    );
}
