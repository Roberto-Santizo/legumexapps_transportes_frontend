/**
 * Datos de demostración del tablero. Reemplazar por consultas al API cuando
 * exista el endpoint de operación diaria.
 */

export type CorridorStation = {
    label: string;
    position: number;
};

export type TripStatus = "en_ruta" | "alerta" | "detenido";

export type CorridorTrip = {
    plate: string;
    carrier: string;
    product: string;
    progress: number;
    eta: string;
    celsius: number;
    status: TripStatus;
};

export type OperationStat = {
    label: string;
    value: string;
    unit?: string;
    detail: string;
};

export type ColdChainReading = {
    time: string;
    celsius: number;
};

export type ComplianceWeek = {
    week: string;
    onTimeRate: number;
    trips: number;
    late: number;
};

export type AttentionSeverity = "critico" | "advertencia";

export type AttentionItem = {
    id: string;
    plate: string;
    carrier: string;
    reason: string;
    since: string;
    severity: AttentionSeverity;
};

/** Tramos del corredor de exportación: la carga siempre recorre estos cuatro puntos. */
export const CORRIDOR_STATIONS: CorridorStation[] = [
    { label: "Finca", position: 0 },
    { label: "Acopio", position: 33.33 },
    { label: "Planta", position: 66.67 },
    { label: "Puerto", position: 100 },
];

export const CORRIDOR_TRIPS: CorridorTrip[] = [
    {
        plate: "P-256WNC",
        carrier: "Refrigerados del Sur",
        product: "Arveja dulce",
        progress: 96,
        eta: "12:35",
        celsius: 5.0,
        status: "en_ruta",
    },
    {
        plate: "P-482BQT",
        carrier: "Transportes Xelajú",
        product: "Arveja china",
        progress: 82,
        eta: "14:20",
        celsius: 4.2,
        status: "en_ruta",
    },
    {
        plate: "C-119HDF",
        carrier: "Refrigerados del Sur",
        product: "Ejote francés",
        progress: 55,
        eta: "16:05",
        celsius: 6.8,
        status: "en_ruta",
    },
    {
        plate: "P-733KLM",
        carrier: "Transportes Xelajú",
        product: "Mini zanahoria",
        progress: 34,
        eta: "18:40",
        celsius: 9.4,
        status: "alerta",
    },
    {
        plate: "C-908RPT",
        carrier: "Logística Altiplano",
        product: "Brócoli",
        progress: 18,
        eta: "21:15",
        celsius: 3.1,
        status: "detenido",
    },
];

export const OPERATION_STATS: OperationStat[] = [
    {
        label: "Viajes en ruta",
        value: "18",
        detail: "5 dentro del corredor de exportación",
    },
    {
        label: "Carga en tránsito",
        value: "42.6",
        unit: "t",
        detail: "134 tarimas rumbo a Puerto Quetzal",
    },
    {
        label: "A tiempo · 7 días",
        value: "94",
        unit: "%",
        detail: "Meta de la temporada: 95 %",
    },
    {
        label: "Requieren atención",
        value: "5",
        detail: "1 crítica y 4 advertencias",
    },
];

/** Termógrafo del furgón P-733KLM durante las últimas 24 horas. */
export const COLD_CHAIN_READINGS: ColdChainReading[] = [
    { time: "00:00", celsius: 4.1 },
    { time: "02:00", celsius: 3.8 },
    { time: "04:00", celsius: 3.9 },
    { time: "06:00", celsius: 4.4 },
    { time: "08:00", celsius: 5.0 },
    { time: "10:00", celsius: 5.6 },
    { time: "12:00", celsius: 6.9 },
    { time: "14:00", celsius: 8.6 },
    { time: "16:00", celsius: 9.4 },
    { time: "18:00", celsius: 7.2 },
    { time: "20:00", celsius: 5.4 },
    { time: "22:00", celsius: 4.6 },
];

export const COLD_CHAIN_RANGE = { min: 2, max: 8 };

export const COMPLIANCE_WEEKS: ComplianceWeek[] = [
    { week: "S23", onTimeRate: 96, trips: 68, late: 3 },
    { week: "S24", onTimeRate: 92, trips: 61, late: 5 },
    { week: "S25", onTimeRate: 97, trips: 70, late: 2 },
    { week: "S26", onTimeRate: 95, trips: 74, late: 4 },
    { week: "S27", onTimeRate: 91, trips: 66, late: 6 },
    { week: "S28", onTimeRate: 96, trips: 72, late: 3 },
    { week: "S29", onTimeRate: 98, trips: 77, late: 2 },
    { week: "S30", onTimeRate: 94, trips: 71, late: 4 },
];

/** Viajes demorados que la operación tolera por semana antes de escalar. */
export const COMPLIANCE_LATE_LIMIT = 4;

export const ATTENTION_ITEMS: AttentionItem[] = [
    {
        id: "1",
        plate: "P-733KLM",
        carrier: "Transportes Xelajú",
        reason: "Temperatura en 9.4 °C, fuera del rango de la carga",
        since: "hace 40 min",
        severity: "critico",
    },
    {
        id: "2",
        plate: "C-908RPT",
        carrier: "Logística Altiplano",
        reason: "Sin reporte de posición desde el acopio de Tecpán",
        since: "hace 2 h 10 min",
        severity: "advertencia",
    },
    {
        id: "3",
        plate: "P-702JHT",
        carrier: "Logística Altiplano",
        reason: "Demora de 1 h 25 min en la báscula de planta",
        since: "hace 25 min",
        severity: "advertencia",
    },
    {
        id: "4",
        plate: "C-441VTG",
        carrier: "Transportes Xelajú",
        reason: "Guía de remisión sin firmar en planta",
        since: "hace 3 h",
        severity: "advertencia",
    },
    {
        id: "5",
        plate: "P-118QRS",
        carrier: "Refrigerados del Sur",
        reason: "La licencia del piloto vence en 5 días",
        since: "hace 1 día",
        severity: "advertencia",
    },
];
