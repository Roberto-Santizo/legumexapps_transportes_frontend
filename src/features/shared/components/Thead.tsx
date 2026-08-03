type Props = {
    children: React.ReactNode;
}

export function Thead({ children }: Props) {
    return (
        <thead className="thead">
            <tr>
                {children}
            </tr>
        </thead>
    )
}
