type Props = {
    text: string;
}

export function Th({ text }: Props) {
    return (
        <th className="thead-th">
            {text}
        </th>
    )
}
