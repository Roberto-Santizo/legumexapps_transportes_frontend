type Props = {
    title: string;
    subtitle: string;
}

export function Title({ title, subtitle }: Props) {
    return (
        <div>
            <h1 className="text-[26px] font-semibold tracking-tight text-ink">
                {title}
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
                {subtitle}
            </p>
        </div>
    )
}
