/**
 * El comprobante de un gasto emergente: opcional en el alta y, en la
 * corrección, con tres salidas para el que ya existe —dejarlo, cambiarlo o
 * quitarlo—.
 *
 * Cambiarlo y quitarlo se excluyen aquí y no en el datasource: mandar un
 * archivo nuevo con `removeReceipt: true` es 422, así que elegir un archivo
 * apaga el «quitar» y viceversa.
 */

import type { TripEmergencyExpense, TripEmergencyExpenseFormValues } from "@/features/trips/trips";
import {
    TRIP_EMERGENCY_RECEIPT_ACCEPT,
    TRIP_EMERGENCY_RECEIPT_MAX_SIZE,
    isTripEmergencyReceiptImage,
    validateTripEmergencyReceipt
} from "@/features/trips/trips";
import { FileText, ImageUp, Paperclip, Undo2, X } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { useController, type Control } from "react-hook-form";

type Props = {
    control: Control<TripEmergencyExpenseFormValues>;
    /** El gasto que se corrige, o nada en el alta. */
    current?: Pick<TripEmergencyExpense, 'receiptUrl' | 'receiptType'>;
}

export function TripEmergencyReceiptField({ control, current }: Props) {
    const {
        field: receipt,
        fieldState: { error }
    } = useController({
        name: 'receipt',
        control,
        rules: { validate: validateTripEmergencyReceipt }
    });

    const { field: removeReceipt } = useController({ name: 'removeReceipt', control });

    const file = receipt.value instanceof File ? receipt.value : null;
    const hasCurrent = Boolean(current?.receiptUrl);

    const selectFile = (selected: File) => {
        receipt.onChange(selected);
        removeReceipt.onChange(false);
    };

    return (
        <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-gray-700">
                Comprobante (opcional)
            </span>

            {file ? (
                <SelectedReceipt file={file} onRemove={() => receipt.onChange(null)} />
            ) : hasCurrent && !removeReceipt.value ? (
                <div className="flex flex-col gap-2">
                    <CurrentReceipt url={current!.receiptUrl!} type={current!.receiptType} onRemove={() => removeReceipt.onChange(true)} />
                    <ReceiptDropzone label="Reemplazar el comprobante" onSelect={selectFile} invalid={Boolean(error)} />
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {hasCurrent && (
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-danger/40 bg-danger/5 px-3 py-2.5">
                            <p className="text-sm text-danger">
                                El comprobante actual se borrará al guardar.
                            </p>

                            <button
                                type="button"
                                onClick={() => removeReceipt.onChange(false)}
                                className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-ink transition-colors hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                            >
                                <Undo2 size={14} />
                                Conservarlo
                            </button>
                        </div>
                    )}

                    <ReceiptDropzone label="Adjunta el comprobante" onSelect={selectFile} invalid={Boolean(error)} />
                </div>
            )}

            {error?.message && <p className="text-red-400 text-xs">{error.message}</p>}
        </div>
    );
}

type CurrentProps = {
    url: string;
    type: TripEmergencyExpense['receiptType'];
    onRemove: () => void;
}

function CurrentReceipt({ url, type, onRemove }: CurrentProps) {
    return (
        <div className="flex items-center gap-3 rounded-lg border border-line bg-surface p-3">
            <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="flex min-w-0 flex-1 items-center gap-3 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
            >
                {isTripEmergencyReceiptImage(type) ? (
                    <img src={url} alt="Comprobante actual" className="h-10 w-10 shrink-0 rounded-md border border-line object-cover" />
                ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-canvas text-ink-muted">
                        <FileText className="h-4 w-4" />
                    </span>
                )}

                <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium text-ink">Comprobante actual</span>
                    <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-subtle">
                        {type ?? "archivo"} · abrir
                    </span>
                </span>
            </a>

            <button
                type="button"
                onClick={onRemove}
                className="shrink-0 cursor-pointer rounded-md px-2 py-1 text-sm font-medium text-danger transition-colors hover:bg-danger/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-danger/30"
            >
                Quitar
            </button>
        </div>
    );
}

type SelectedProps = {
    file: File;
    onRemove: () => void;
}

function SelectedReceipt({ file, onRemove }: SelectedProps) {
    return (
        <div className="flex items-center gap-3 rounded-lg border border-line bg-surface p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-canvas text-ink-muted">
                {file.type === 'application/pdf'
                    ? <FileText className="h-4 w-4" />
                    : <Paperclip className="h-4 w-4" />}
            </span>

            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{file.name}</p>

                <p className="font-mono text-[11px] tracking-[0.12em] text-ink-subtle">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
            </div>

            <button
                type="button"
                aria-label={`Quitar ${file.name}`}
                onClick={onRemove}
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-ink-subtle transition-colors hover:bg-canvas hover:text-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}

type DropzoneProps = {
    label: string;
    onSelect: (file: File) => void;
    invalid: boolean;
}

function ReceiptDropzone({ label, onSelect, invalid }: DropzoneProps) {
    const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
        accept: TRIP_EMERGENCY_RECEIPT_ACCEPT,
        multiple: false,
        maxSize: TRIP_EMERGENCY_RECEIPT_MAX_SIZE,
        onDrop: (accepted: File[]) => {
            if (accepted.length) onSelect(accepted[0]);
        }
    });

    /** Dropzone descarta el archivo antes de `onDrop`: sin esto, soltarlo no diría nada. */
    const rejection = fileRejections[0]?.errors[0];
    const rejectionMessage = rejection && (rejection.code === 'file-too-large'
        ? "El comprobante no puede pesar más de 3 MB"
        : "El comprobante debe ser un archivo jpg, jpeg, png o pdf");

    return (
        <div className="flex flex-col gap-2">
            <div
                {...getRootProps()}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border border-dashed bg-surface px-4 py-3 transition-colors ${isDragActive
                    ? "border-ink bg-canvas"
                    : invalid || rejectionMessage
                        ? "border-danger"
                        : "border-line-strong hover:border-ink-subtle"
                    }`}
            >
                <input {...getInputProps()} />

                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-canvas text-ink-muted">
                    <ImageUp className="h-4 w-4" />
                </span>

                <div className="flex flex-col">
                    <span className="text-sm font-medium text-ink">
                        {isDragActive ? "Suelta el comprobante aquí" : label}
                    </span>

                    <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-subtle">
                        JPG · PNG · PDF · máx. 3 MB
                    </span>
                </div>
            </div>

            {rejectionMessage && <p className="text-red-400 text-xs">{rejectionMessage}</p>}
        </div>
    );
}
