type Props = {
    children: React.ReactNode;
}

export function Tbody({ children }: Props) {
    return (
        <tbody className="tbody">
            {children}
        </tbody>
    )
}
