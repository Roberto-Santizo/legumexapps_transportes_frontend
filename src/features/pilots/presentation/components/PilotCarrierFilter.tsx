/**
 * El filtro por empresa solo se pinta a `administrator` y `manager`: a un
 * `carrier` el backend se lo ignora en silencio —le devuelve 200 con sus
 * propios pilotos— y enseñárselo sería prometer algo que no hace.
 *
 * El valor vive en la URL para que la vista filtrada se pueda compartir y
 * sobreviva a un refresco.
 */

import { carrierProvider } from "@/features/carriers/carriers";
import type { SetURLSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

/** El catálogo de transportistas no pagina en la práctica: se pide entero. */
const CARRIERS_LIMIT = '500';

type Props = {
    /** Cadena vacía = todas las empresas. */
    carrierId: string;
    setSearchParams: SetURLSearchParams;
}

export function PilotCarrierFilter({ carrierId, setSearchParams }: Props) {
    const { data } = useQuery({
        queryKey: ['getCarriers', CARRIERS_LIMIT],
        queryFn: () => carrierProvider.getCarriers(CARRIERS_LIMIT, '0')
    });

    const carriers = data?.data ?? [];

    /** Cambiar de empresa devuelve el listado a la primera página. */
    const selectCarrier = (value: string) => {
        setSearchParams((params) => {
            if (value) {
                params.set('carrierId', value);
            } else {
                params.delete('carrierId');
            }

            params.set('page', '0');
            return params;
        });
    };

    return (
        <label className="flex flex-col gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                Empresa
            </span>

            <select
                value={carrierId}
                onChange={(event) => selectCarrier(event.target.value)}
                className="text_form_field min-w-[16rem] cursor-pointer"
            >
                <option value="">Todas las empresas</option>

                {carriers.map((carrier) => (
                    <option key={carrier.id} value={carrier.id}>
                        {carrier.name}
                    </option>
                ))}
            </select>
        </label>
    );
}
