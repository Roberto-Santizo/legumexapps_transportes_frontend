type Props = {
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    children: React.ReactNode;
    className?: string;
}

export function CustomForm({ onSubmit, children, className }: Props) {
    return (
        <form
            onSubmit={onSubmit}
            noValidate
            className={`flex flex-col gap-6 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm ${className ?? ""}`}
        >
            {children}
        </form>
    )
}
