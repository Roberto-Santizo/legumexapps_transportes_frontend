import type { ReactNode } from "react";

type Props = {
    icon: ReactNode;
    onClick: () => void;
}

export function CustomNavTable({ icon, onClick } : Props) {
  return (
    <div onClick={() => onClick()} className="cursor-pointer text-ink-muted hover:text-ink">
        {icon}
    </div>
  )
}
