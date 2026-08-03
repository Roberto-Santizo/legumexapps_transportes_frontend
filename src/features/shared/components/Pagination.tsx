import { TablePagination } from "@mui/material";
import type { SetURLSearchParams } from "react-router-dom";

interface PaginationProps {
    page: number;
    rowsPerPage: number;
    count: number;
    setSearchParams: SetURLSearchParams;
}

export function Pagination({ page, rowsPerPage, count, setSearchParams }: PaginationProps) {
    const handleChangePage = (_: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => {
        setSearchParams((params) => {
            params.set('page', newPage.toString());
            return params;
        });
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const newLimit = parseInt(event.target.value, 10);
        setSearchParams((params) => {
            params.set('limit', newLimit.toString());
            params.set('page', '0');
            return params;
        });
    };

    return (
        <TablePagination
            labelRowsPerPage="Registros por Página"
            labelDisplayedRows={function defaultLabelDisplayedRows({ from, to, count }) { return `${from}–${to} de ${count !== -1 ? count : `more than ${to}`}`; }}
            component="div"
            count={count}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            className="shadow mt-5"
        />
    )
}
