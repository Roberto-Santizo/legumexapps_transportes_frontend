import type React from "react";

type Props = {
    children: React.ReactNode;
}

export function Table({ children }: Props) {
    return (
        <div className="table-wrapper">
            <table className="table">
                {children}
            </table>
        </div>
    )
}
