/**
 * La facturación del alta: el interruptor y, si está encendido, el adjunto.
 *
 * No es un checkbox ni un switch porque ninguno de los dos puede estar sin
 * responder: los dos nacen apagados y «apagado» aquí es una respuesta —«este
 * gasto no se facturó»— que el usuario todavía no ha dado. Son dos opciones que
 * empiezan vacías y hay que elegir una, como el resto de campos obligatorios.
 *
 * El archivo se limpia solo al elegir «Sin factura»: mandarlo con el
 * interruptor apagado no da error, el backend responde 201 y lo descarta sin
 * avisar. Es la trampa del dominio y se cierra aquí, no en el datasource.
 *
 * Y todo esto solo existe en el alta: `is_invoiced` e `invoice` son inmutables
 * y el PATCH los ignora respondiendo 200 sin guardar nada.
 */

import type { VehicleExpenseForm } from "@/features/vehicle-expenses/vehicle-expenses";
import {
    isValidInvoiceFile,
    VEHICLE_EXPENSE_INVOICE_ACCEPT,
    VEHICLE_EXPENSE_INVOICE_MAX_SIZE
} from "@/features/vehicle-expenses/vehicle-expenses";
import { FileText, ImageUp, Paperclip, X } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { useController, type Control } from "react-hook-form";

type Props = {
    control: Control<VehicleExpenseForm>;
}

export function VehicleExpenseInvoiceField({ control }: Props) {
    const {
        field: invoiced,
        fieldState: { error: invoicedError }
    } = useController({
        name: 'isInvoiced',
        control,
        rules: {
            /** `false` es una respuesta válida: `required` la rechazaría como si faltara. */
            validate: (value) =>
                typeof value === 'boolean' || "Indica si el gasto fue facturado"
        }
    });

    const {
        field: invoice,
        fieldState: { error: invoiceError }
    } = useController({
        name: 'invoice',
        control,
        rules: {
            validate: (value) => {
                if (invoiced.value !== true) return true;
                if (!(value instanceof File)) return "Adjunta la factura del gasto";
                if (!isValidInvoiceFile(value)) return "La factura debe ser un archivo JPG, PNG o PDF";
                if (value.size > VEHICLE_EXPENSE_INVOICE_MAX_SIZE) return "La factura no puede pesar más de 3 MB";

                return true;
            }
        }
    });

    const chooseInvoiced = (value: boolean) => {
        invoiced.onChange(value);

        /** Sin factura no hay archivo: se suelta antes de que llegue al backend. */
        if (!value) invoice.onChange(null);
    };

    const file = invoice.value instanceof File ? invoice.value : null;

    return (
        <div className="flex flex-col gap-3">
            <span className="text-sm font-medium text-gray-700">
                ¿El gasto fue facturado?
            </span>

            <div className="flex flex-wrap gap-2">
                <InvoicedChoice
                    label="Con factura"
                    selected={invoiced.value === true}
                    onSelect={() => chooseInvoiced(true)}
                />

                <InvoicedChoice
                    label="Sin factura"
                    selected={invoiced.value === false}
                    onSelect={() => chooseInvoiced(false)}
                />
            </div>

            {invoiced.value === true && (
                <>
                    <InvoiceDropzone
                        file={file}
                        onSelect={(selected) => invoice.onChange(selected)}
                        onRemove={() => invoice.onChange(null)}
                        invalid={Boolean(invoiceError)}
                    />

                    <p className="text-xs text-ink-subtle">
                        La factura se fija al registrar el gasto: después no se puede cambiar ni quitar.
                    </p>
                </>
            )}

            <p className="text-red-400 text-xs">
                {invoicedError?.message ?? invoiceError?.message}
            </p>
        </div>
    );
}

type ChoiceProps = {
    label: string;
    selected: boolean;
    onSelect: () => void;
}

function InvoicedChoice({ label, selected, onSelect }: ChoiceProps) {
    return (
        <button
            type="button"
            onClick={onSelect}
            aria-pressed={selected}
            className={`cursor-pointer rounded-lg border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 ${selected
                ? "border-ink bg-ink-deep text-canvas"
                : "border-line-strong bg-surface text-ink-muted hover:border-ink-subtle hover:text-ink"
                }`}
        >
            {label}
        </button>
    );
}

type DropzoneProps = {
    file: File | null;
    onSelect: (file: File) => void;
    onRemove: () => void;
    invalid: boolean;
}

/**
 * Acepta imagen y PDF, así que no hay miniatura: un PDF no se previsualiza y
 * dar dos tratamientos distintos según el archivo confundiría más de lo que
 * ayuda. Se muestran el nombre y el peso, que es lo que el usuario reconoce.
 */
function InvoiceDropzone({ file, onSelect, onRemove, invalid }: DropzoneProps) {
    const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
        accept: VEHICLE_EXPENSE_INVOICE_ACCEPT,
        multiple: false,
        maxSize: VEHICLE_EXPENSE_INVOICE_MAX_SIZE,
        onDrop: (accepted: File[]) => {
            if (accepted.length) onSelect(accepted[0]);
        }
    });

    /**
     * Dropzone descarta el archivo grande o del tipo equivocado antes de que
     * llegue a `onDrop`, así que sin esto el usuario suelta la factura y no
     * pasa nada: ni archivo ni explicación.
     */
    const rejection = fileRejections[0]?.errors[0];
    const rejectionMessage = rejection && (rejection.code === 'file-too-large'
        ? "La factura no puede pesar más de 3 MB"
        : "La factura debe ser un archivo JPG, PNG o PDF");

    if (file) {
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

    return (
        <div className="flex flex-col gap-2">
            <div
                {...getRootProps()}
                className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-surface px-6 py-8 text-center transition-colors ${isDragActive
                    ? "border-ink bg-canvas"
                    : invalid || rejectionMessage
                        ? "border-danger"
                        : "border-line-strong hover:border-ink-subtle"
                    }`}
            >
                <input {...getInputProps()} />

                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-canvas text-ink-muted">
                    <ImageUp className="h-5 w-5" />
                </span>

                <div>
                    <p className="text-sm font-medium text-ink">
                        {isDragActive ? "Suelta la factura aquí" : "Adjunta la factura"}
                    </p>

                    <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-subtle">
                        JPG · PNG · PDF · máx. 3 MB
                    </p>
                </div>
            </div>

            {rejectionMessage && (
                <p className="text-red-400 text-xs">{rejectionMessage}</p>
            )}
        </div>
    );
}
