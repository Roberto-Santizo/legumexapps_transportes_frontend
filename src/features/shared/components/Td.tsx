type Props = {
    children: React.ReactNode;
    className?: string;

}
export function Td({ children, className }: Props) {
    return (
        <td className={`tbody-td ${className}`}>
            {children}
        </td>
    )
}
