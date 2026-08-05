import { useEffect, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import { useController, type Control, type FieldValues, type Path, type RegisterOptions } from "react-hook-form";
import { ImageUp, X } from "lucide-react";

const IMAGE_ACCEPT: Record<string, string[]> = {
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
};

type Props<T extends FieldValues> = {
  name: Path<T>;
  control: Control<T>;
  label?: string;
  accept?: Record<string, string[]>;
  multiple?: boolean;
  validation?: RegisterOptions<T, Path<T>>;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileFormField<T extends FieldValues>({
  name,
  control,
  label,
  accept = IMAGE_ACCEPT,
  multiple = false,
  validation,
}: Props<T>) {
  const {
    field,
    fieldState: { error },
  } = useController({ name, control, rules: validation });

  const files = useMemo<File[]>(() => {
    if (multiple) {
      return Array.isArray(field.value) ? (field.value as File[]) : [];
    }
    const value: unknown = field.value;
    return value instanceof File ? [value] : [];
  }, [field.value, multiple]);

  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);

  useEffect(() => {
    return () => previews.forEach((url) => URL.revokeObjectURL(url));
  }, [previews]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    accept,
    multiple,
    onDrop: (acceptedFiles: File[]) => {
      if (!acceptedFiles.length) return;
      field.onChange(multiple ? acceptedFiles : acceptedFiles[0]);
    },
  });

  const removeFile = (index: number) => {
    if (!multiple) {
      field.onChange(null);
      return;
    }
    field.onChange(files.filter((_, i) => i !== index));
  };

  const rejectionMessage = fileRejections.length
    ? "Solo se permiten imágenes PNG, JPG o JPEG."
    : undefined;

  const errorMessage = error?.message ?? rejectionMessage;

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-sm font-medium text-gray-700" htmlFor={name}>
          {label}
        </label>
      )}

      <div
        {...getRootProps()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-surface px-6 py-8 text-center transition-colors ${
          isDragActive
            ? "border-ink bg-canvas"
            : errorMessage
              ? "border-danger"
              : "border-line-strong hover:border-ink-subtle"
        }`}
      >
        <input {...getInputProps()} id={name} />

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
            isDragActive ? "bg-ink text-canvas" : "bg-canvas text-ink-muted"
          }`}
        >
          <ImageUp className="h-5 w-5" />
        </div>

        <div>
          <p className="text-sm font-medium text-ink">
            {isDragActive
              ? "Suelta la imagen aquí"
              : files.length
                ? "Haz clic o arrastra para reemplazar"
                : multiple
                  ? "Subir imágenes"
                  : "Subir imagen"}
          </p>

          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-subtle">
            PNG · JPG · JPEG
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <ul className="flex flex-col gap-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center gap-3 rounded-lg border border-line bg-surface p-2"
            >
              <img
                src={previews[index]}
                alt={file.name}
                className="h-12 w-12 shrink-0 rounded-md border border-line object-cover"
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{file.name}</p>
                <p className="text-xs text-ink-muted">{formatSize(file.size)}</p>
              </div>

              <button
                type="button"
                aria-label={`Quitar ${file.name}`}
                onClick={() => removeFile(index)}
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-ink-subtle transition-colors hover:bg-canvas hover:text-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-red-400 text-xs">{errorMessage}</p>
    </div>
  );
}
