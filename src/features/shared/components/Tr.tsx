type Props = {
    children: React.ReactNode;
}

export function Tr({children}: Props) {
  return (
     <tr className="tbody-tr">
        {children}
     </tr>
  )
}
