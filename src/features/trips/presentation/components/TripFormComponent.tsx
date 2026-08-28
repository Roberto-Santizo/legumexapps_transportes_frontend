/**
 * Los doce campos del viaje, agrupados como se dicta un viaje por teléfono: qué
 * carga es y de quién, cuándo sale, por dónde va y qué hay que saber al
 * llevarla.
 *
 * Tres cosas que el formulario dice y la API no:
 *
 * - **La orden y el contenedor no son únicos.** Dos viajes pueden compartirlos
 *   y no hay forma de exigir lo contrario, así que no se avisa de duplicados:
 *   sería una promesa falsa.
 * - **Los catálogos se filtran por lo que la API acepta**, no por lo que
 *   existe: un punto de partida inactivo o un puerto inactivo pasan la
 *   validación `exists:` y los para el service con un 400. Ofrecerlos sería
 *   mandar al usuario contra un error evitable.
 * - **El embarque no puede ser anterior a la recolección**, y en la edición esa
 *   comparación **solo la hace el front**: el backend únicamente la aplica
 *   cuando las dos fechas viajan en el mismo cuerpo.
 */

import { Controller, useWatch, type Control, type FieldErrors, type UseFormRegister, type UseFormSetValue } from "react-hook-form";
import type { TripFormValues } from "@/features/trips/trips";
import {
    TRIP_CATALOG_LIMIT,
    TRIP_STATUSES,
    TRIP_TEXT_MAX_LENGTH,
    TripRouteSection,
    isShipDateBeforeRecolection,
    nowForInput
} from "@/features/trips/trips";
import { SelectFormField, TextAreaFormField, TextFormField } from "@/features/shared/shared";
import { PackingListSummaryField } from "@/features/packing-lists/packing-lists";
import { clientProvider } from "@/features/clients/clients";
import { departurePointProvider } from "@/features/departure-points/departure-points";
import { locationProvider } from "@/features/locations/locations";
import { shippingLineProvider } from "@/features/shipping-lines/shipping-lines";
import { useQuery } from "@tanstack/react-query";

type Props = {
    register: UseFormRegister<TripFormValues>;
    control: Control<TripFormValues>;
    errors: FieldErrors<TripFormValues>;
    setValue: UseFormSetValue<TripFormValues>;
    /**
     * En la edición aparece `status` —el único campo que el alta no acepta— y
     * las dos fechas dejan de exigir futuro: editar un viaje ya arrancado no
     * obliga a reprogramarlo.
     */
    isUpdate?: boolean;
    /**
     * Cambia el campo de la orden por el buscador de packing list, que rellena
     * el contenedor y el destino final. Solo en el alta: en la edición el viaje
     * ya tiene esos tres campos decididos y volver a buscar la orden los
     * pisaría sin que nadie lo haya pedido.
     */
    enablePackingListLookup?: boolean;
    /** Los fallos del buscador no tienen campo al que anclarse: los avisa la pantalla. */
    onError?: (message: string) => void;
}

/**
 * La orden y el contenedor se validan igual se tecleen a mano o los traiga el
 * packing list, así que las reglas viven fuera del marcado y no se duplican.
 */
const ORDER_VALIDATION = {
    required: "La orden es obligatoria",
    maxLength: {
        value: TRIP_TEXT_MAX_LENGTH,
        message: `La orden no puede superar los ${TRIP_TEXT_MAX_LENGTH} caracteres`
    }
} as const;

const CONTAINER_VALIDATION = {
    required: "El contenedor es obligatorio",
    maxLength: {
        value: TRIP_TEXT_MAX_LENGTH,
        message: `El contenedor no puede superar los ${TRIP_TEXT_MAX_LENGTH} caracteres`
    }
} as const;

function Fieldset({ legend, hint, children }: { legend: string; hint: string; children: React.ReactNode }) {
    return (
        <fieldset className="flex flex-col gap-4">
            <legend className="flex flex-col gap-1 pb-2">
                <span className="font-display text-base font-semibold tracking-tight text-ink">
                    {legend}
                </span>

                <span className="text-sm text-ink-muted">{hint}</span>
            </legend>

            {children}
        </fieldset>
    );
}

export function TripFormComponent({
    register,
    control,
    errors,
    setValue,
    isUpdate = false,
    enablePackingListLookup = false,
    onError
}: Props) {
    const { data: clients, isLoading: isLoadingClients } = useQuery({
        queryKey: ['getClients', TRIP_CATALOG_LIMIT, '0', ''],
        queryFn: () => clientProvider.getClients(TRIP_CATALOG_LIMIT, '0', {})
    });

    const { data: shippingLines, isLoading: isLoadingShippingLines } = useQuery({
        queryKey: ['getShippingLines', TRIP_CATALOG_LIMIT, '0', ''],
        queryFn: () => shippingLineProvider.getShippingLines(TRIP_CATALOG_LIMIT, '0', {})
    });

    const { data: departurePoints, isLoading: isLoadingDeparturePoints } = useQuery({
        queryKey: ['getDeparturePoints', TRIP_CATALOG_LIMIT, '0'],
        queryFn: () => departurePointProvider.getDeparturePoints(TRIP_CATALOG_LIMIT, '0')
    });

    const { data: ports, isLoading: isLoadingPorts } = useQuery({
        queryKey: ['getLocations', TRIP_CATALOG_LIMIT, '0', 'port'],
        queryFn: () => locationProvider.getLocations(TRIP_CATALOG_LIMIT, '0', 'port')
    });

    /** Solo los activos: un inactivo pasa `exists:` y lo rechaza el service con 400. */
    const activeDeparturePoints = (departurePoints?.data ?? []).filter((point) => point.status);
    const activePorts = (ports?.data ?? []).filter((port) => port.status);

    /**
     * `useWatch` y no `watch()`: el React Compiler memoiza este componente
     * —todas sus props son estables— y `watch()` solo se reevalua al
     * renderizar, asi que la comparacion de fechas se quedaba con el valor
     * viejo. La suscripcion tiene que nacer dentro del componente que la usa.
     */
    const recolectionDate = useWatch({ control, name: 'recolectionDate' });

    /** El `min` solo aplica en el alta: el `PATCH` no exige fecha futura. */
    const minDateTime = isUpdate ? undefined : nowForInput();

    return (
        <>
            <Fieldset
                legend="La carga"
                hint="La orden y el contenedor se guardan en mayúsculas. Ninguno de los dos es único: dos viajes pueden compartirlos."
            >
                {enablePackingListLookup && (
                    <>
                        {/* El buscador es el campo de la orden, no un extra al lado. */}
                        <Controller
                            control={control}
                            name="order"
                            rules={ORDER_VALIDATION}
                            render={({ field }) => (
                                <PackingListSummaryField
                                    order={field.value ?? ''}
                                    onOrderChange={field.onChange}
                                    onSummaryFound={(summary) => {
                                        /* La orden que vale es la guardada, no la tecleada. */
                                        field.onChange(summary.order);
                                        setValue('container', summary.container, { shouldDirty: true, shouldValidate: true });
                                        setValue('destination', summary.destination, { shouldDirty: true, shouldValidate: true });
                                    }}
                                    onError={onError}
                                    errorMessage={errors.order?.message}
                                />
                            )}
                        />

                        <div className="flex flex-col gap-2">
                            <TextFormField<TripFormValues>
                                label="Contenedor"
                                name="container"
                                type="text"
                                placeholder="MSKU 483920 1"
                                register={register}
                                errorMessage={errors.container?.message}
                                validation={CONTAINER_VALIDATION}
                            />

                            <p className="text-xs text-ink-muted">
                                Se rellena al buscar la orden. Puedes corregirlo.
                            </p>
                        </div>
                    </>
                )}

                {!enablePackingListLookup && (
                    <div className="grid gap-4 sm:grid-cols-2">
                        <TextFormField<TripFormValues>
                            label="Orden"
                            name="order"
                            type="text"
                            placeholder="ORD-2026 0148"
                            register={register}
                            errorMessage={errors.order?.message}
                            validation={ORDER_VALIDATION}
                        />

                        <TextFormField<TripFormValues>
                            label="Contenedor"
                            name="container"
                            type="text"
                            placeholder="MSKU 483920 1"
                            register={register}
                            errorMessage={errors.container?.message}
                            validation={CONTAINER_VALIDATION}
                        />
                    </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                    <SelectFormField<TripFormValues>
                        label="Cliente"
                        name="clientId"
                        options={(clients?.data ?? []).map((client) => ({
                            value: client.id,
                            label: `${client.code} · ${client.name}`
                        }))}
                        errorMessage={errors.clientId?.message}
                        control={control}
                        validation={{ required: "El cliente es obligatorio" }}
                    />

                    <SelectFormField<TripFormValues>
                        label="Naviera"
                        name="shippingLineId"
                        options={(shippingLines?.data ?? []).map((line) => ({
                            value: line.id,
                            label: line.name
                        }))}
                        errorMessage={errors.shippingLineId?.message}
                        control={control}
                        validation={{ required: "La naviera es obligatoria" }}
                    />
                </div>

                {(isLoadingClients || isLoadingShippingLines) && (
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                        Cargando catálogos
                    </p>
                )}

                <TextFormField<TripFormValues>
                    label="Transporte"
                    name="transport"
                    type="text"
                    placeholder="Ej: Premium"
                    register={register}
                    errorMessage={errors.transport?.message}
                    validation={{
                        required: "El transporte es obligatorio",
                        maxLength: {
                            value: TRIP_TEXT_MAX_LENGTH,
                            message: `El transporte no puede superar los ${TRIP_TEXT_MAX_LENGTH} caracteres`
                        }
                    }}
                />

                <p className="text-xs text-ink-muted">
                    El transporte es descriptivo: no tiene relación con el vehículo que
                    asigne después la empresa transportista.
                </p>
            </Fieldset>

            <Fieldset
                legend="Las fechas"
                hint="Lo planificado. El arranque y el cierre reales los pone el servidor cuando el piloto los marca."
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    <TextFormField<TripFormValues>
                        label="Recolección"
                        name="recolectionDate"
                        type="datetime-local"
                        placeholder=""
                        register={register}
                        errorMessage={errors.recolectionDate?.message}
                        validation={{
                            required: "La fecha de recolección es obligatoria",
                            validate: (value) =>
                                isUpdate || !minDateTime || String(value) > minDateTime ||
                                "La fecha de recolección debe ser futura"
                        }}
                    />

                    <TextFormField<TripFormValues>
                        label="Embarque"
                        name="shipDate"
                        type="datetime-local"
                        placeholder=""
                        register={register}
                        errorMessage={errors.shipDate?.message}
                        validation={{
                            required: "La fecha de embarque es obligatoria",
                            validate: {
                                future: (value) =>
                                    isUpdate || !minDateTime || String(value) > minDateTime ||
                                    "La fecha de embarque debe ser futura",
                                afterRecolection: (value) =>
                                    !isShipDateBeforeRecolection(recolectionDate, String(value)) ||
                                    "La fecha de embarque no puede ser anterior a la de recolección"
                            }
                        }}
                    />
                </div>
            </Fieldset>

            <Fieldset
                legend="El trayecto"
                hint="El puerto sale del catálogo; el destino final en el extranjero es texto libre y se guarda tal como se teclea."
            >
                <TripRouteSection
                    control={control}
                    departurePoints={activeDeparturePoints}
                    ports={activePorts}
                    onPolylineChange={(polyline) =>
                        setValue('polyline', polyline, { shouldValidate: false })}
                    polylineErrorMessage={errors.polyline?.message}
                    departurePointErrorMessage={errors.departurePointId?.message}
                    locationErrorMessage={errors.locationId?.message}
                    isLoadingCatalogs={isLoadingDeparturePoints || isLoadingPorts}
                />

                {/* La ruta no se teclea: la resuelve la sección de arriba. */}
                <input
                    type="hidden"
                    {...register('polyline', {
                        required: "Calcula la ruta antes de guardar el viaje"
                    })}
                />

                <TextFormField<TripFormValues>
                    label="Destino final"
                    name="destination"
                    type="text"
                    placeholder="Rotterdam, Países Bajos"
                    register={register}
                    errorMessage={errors.destination?.message}
                    validation={{
                        required: "El destino final es obligatorio",
                        maxLength: {
                            value: TRIP_TEXT_MAX_LENGTH,
                            message: `El destino final no puede superar los ${TRIP_TEXT_MAX_LENGTH} caracteres`
                        }
                    }}
                />

                {/* El destino se rellena arriba, en otro fieldset: conviene decirlo. */}
                {enablePackingListLookup && (
                    <p className="text-xs text-ink-muted">
                        Se rellena al buscar la orden, con el destino del CTPAT. Puedes corregirlo.
                    </p>
                )}
            </Fieldset>

            <Fieldset
                legend="Las instrucciones"
                hint="Si el viaje lo ejecuta otra empresa, este es el único canal que hay para decirle cómo tratar la carga."
            >
                <TextAreaFormField<TripFormValues>
                    label="Observaciones"
                    name="observations"
                    placeholder="Carga refrigerada a -2 °C. Presentarse en garita con la orden impresa."
                    rows={4}
                    register={register}
                    errorMessage={errors.observations?.message}
                    validation={{ required: "Las observaciones son obligatorias" }}
                />

                {isUpdate && (
                    <>
                        <SelectFormField<TripFormValues>
                            label="Estado"
                            name="status"
                            options={TRIP_STATUSES}
                            errorMessage={errors.status?.message}
                            control={control}
                            validation={{ required: "El estado del viaje es obligatorio" }}
                        />

                        <p className="text-xs text-ink-muted">
                            El estado se mueve a mano y en cualquier orden: no toca las fechas
                            de arranque ni de cierre, así que puede quedar contradiciéndolas.
                        </p>
                    </>
                )}
            </Fieldset>
        </>
    );
}
