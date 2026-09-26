/**
 * La descarga del reporte de viajes (`GET /api/reports/trips`). No hay vista
 * previa ni historial: la API solo devuelve el `.xlsx`, generado en la misma
 * petición.
 *
 * Arranca con los filtros que ya tiene el listado —estado y búsqueda viajan
 * tal cual; las fechas se precargan y aquí sí son obligatorias—, para que el
 * archivo sea lo que el usuario está mirando, pero completo: sin paginar.
 *
 * El 400 de «excede 5000 viajes» no es un fallo: es una petición de acotar
 * el rango, y se pinta junto a las fechas en lugar de como un error suelto.
 */

import type { TripStatus, TripsReportField, TripsReportParams } from "@/features/trips/trips";
import {
    TRIPS_REPORT_TOO_LARGE_MESSAGE,
    TRIP_STATUS_LABELS,
    defaultTripsReportRange,
    getTripsReportFieldErrors,
    saveTripsReportFile,
    tripProvider,
    tripsReportFileName,
    tripsReportIncludesProducts,
    validateTripsReportRange
} from "@/features/trips/trips";
import { Modal, SpinnerComponent, useNotification } from "@/features/shared/shared";
import { useMutation } from "@tanstack/react-query";
import { Download, FileSpreadsheet } from "lucide-react";
import { useState } from "react";

type Props = {
    open: boolean;
    onClose: () => void;
    role?: string;
    /** Los filtros vigentes del listado. */
    search: string;
    status: string;
    dateFrom: string;
    dateTo: string;
}

export function TripsReportModal({ open, onClose, ...rest }: Props) {
    return (
        <Modal
            modal={open}
            closeModal={onClose}
            title="Descargar reporte de viajes"
            width="sm:max-w-lg"
        >
            {/* Se monta al abrir: cada apertura vuelve a leer los filtros del listado. */}
            {open && <TripsReportForm onClose={onClose} {...rest} />}
        </Modal>
    );
}

type FormProps = Omit<Props, 'open'>;

function TripsReportForm({ onClose, role, search, status, dateFrom, dateTo }: FormProps) {
    const notification = useNotification();
    const fallback = defaultTripsReportRange();

    const [range, setRange] = useState({
        dateFrom: dateFrom || fallback.dateFrom,
        dateTo: dateTo || fallback.dateTo,
    });
    const [fieldErrors, setFieldErrors] = useState<Partial<Record<TripsReportField, string>>>({});
    const [tooLarge, setTooLarge] = useState<string | null>(null);

    const { mutate: download, isPending } = useMutation({
        mutationFn: (params: TripsReportParams) => tripProvider.downloadTripsReport(params),
        onSuccess: (file, params) => {
            saveTripsReportFile(file, tripsReportFileName(params));
            notification.success("Reporte descargado");
            onClose();
        },
        onError: (err) => {
            const errors = getTripsReportFieldErrors(err);

            if (errors.length > 0) {
                setFieldErrors(Object.fromEntries(errors.map(({ field, message }) => [field, message])));
                return;
            }

            if (err.message.startsWith(TRIPS_REPORT_TOO_LARGE_MESSAGE)) {
                setTooLarge(err.message);
                notification.warning(err.message);
                return;
            }

            notification.error(err.message);
        }
    });

    const changeDate = (field: TripsReportField, value: string) => {
        setRange((current) => ({ ...current, [field]: value }));
        setFieldErrors((current) => ({ ...current, [field]: undefined }));
        setTooLarge(null);
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (isPending) return;

        const errors = validateTripsReportRange(range);

        if (errors.length > 0) {
            setFieldErrors(Object.fromEntries(errors.map(({ field, message }) => [field, message])));
            return;
        }

        download({ ...range, status, search });
    };

    const statusLabel = TRIP_STATUS_LABELS[status as TripStatus];
    const includesProducts = tripsReportIncludesProducts(role);
    const hasValidRange = validateTripsReportRange(range).length === 0;

    return (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
            <div className="grid gap-4 sm:grid-cols-2">
                <DateField
                    label="Recolección desde"
                    value={range.dateFrom}
                    error={fieldErrors.dateFrom}
                    onChange={(value) => changeDate('dateFrom', value)}
                />

                <DateField
                    label="Hasta"
                    value={range.dateTo}
                    min={range.dateFrom || undefined}
                    error={fieldErrors.dateTo}
                    onChange={(value) => changeDate('dateTo', value)}
                />
            </div>

            {tooLarge && (
                <p role="alert" className="rounded-lg border border-line-strong bg-canvas px-4 py-3 text-sm text-ink">
                    {tooLarge}. Reduce el rango o filtra por estado u orden en el listado.
                </p>
            )}

            <div className="flex flex-col gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                    Filtros del listado que se aplican
                </span>

                {statusLabel || search ? (
                    <div className="flex flex-wrap gap-2">
                        {statusLabel && <FilterChip label="Estado" value={statusLabel} />}
                        {search && <FilterChip label="Orden o contenedor" value={search} />}
                    </div>
                ) : (
                    <p className="text-sm text-ink-muted">
                        Ninguno: salen todos los viajes que ves en el listado dentro del rango.
                    </p>
                )}
            </div>

            <div className="flex flex-col gap-2 rounded-xl bg-ink-deep px-5 py-4 text-canvas">
                <span className="flex items-center gap-2 font-mono text-[13px] break-all">
                    <FileSpreadsheet size={16} aria-hidden className="shrink-0" />
                    {hasValidRange ? tripsReportFileName(range) : "viajes-AAAA-MM-DD_AAAA-MM-DD.xlsx"}
                </span>

                <p className="text-xs text-canvas/70">
                    Una fila por viaje, de la recolección más reciente a la más antigua.
                    {includesProducts
                        ? " 24 columnas, con los productos y el total de cajas al final."
                        : " 22 columnas, sin el detalle de productos."}
                    {" "}Máximo 5000 viajes por archivo.
                </p>
            </div>

            <div className="flex flex-wrap justify-end gap-3">
                <button
                    type="button"
                    onClick={onClose}
                    className="cursor-pointer rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-canvas focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                >
                    Cancelar
                </button>

                <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-ink/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-ink/40 disabled:shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                >
                    {isPending ? (
                        <>
                            <SpinnerComponent />
                            Generando reporte
                        </>
                    ) : (
                        <>
                            <Download size={16} aria-hidden />
                            Descargar Excel
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}

type DateFieldProps = {
    label: string;
    value: string;
    min?: string;
    error?: string;
    onChange: (value: string) => void;
}

function DateField({ label, value, min, error, onChange }: DateFieldProps) {
    return (
        <label className="flex flex-col gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                {label}
            </span>

            <input
                type="date"
                value={value}
                min={min}
                required
                aria-invalid={Boolean(error)}
                onChange={(event) => onChange(event.target.value)}
                className="text_form_field"
            />

            {error && <span className="text-xs text-danger">{error}</span>}
        </label>
    );
}

function FilterChip({ label, value }: { label: string; value: string }) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas px-3 py-1 text-xs text-ink">
            <span className="text-ink-subtle">{label}:</span>
            <span className="font-medium">{value}</span>
        </span>
    );
}
