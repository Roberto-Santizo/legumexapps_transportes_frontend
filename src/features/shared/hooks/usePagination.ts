export const usePagination = (searchParams: URLSearchParams) => {
    const page = Number(searchParams.get('page')) || 0;
    const rowsPerPage = Number(searchParams.get('limit')) || 10;

    return {
        page,
        rowsPerPage
    }
}
