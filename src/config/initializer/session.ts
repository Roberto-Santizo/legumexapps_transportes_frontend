import { queryClient } from "@/config/query/queryClient";
import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

export const AUTH_SESSION_QUERY_KEY = ["auth", "check-status"] as const;

/**
 * Hook para revalidar la sesión desde cualquier componente:
 * vuelve a ejecutar `checkStatus()` y sincroniza el resultado con Redux.
 */
export function useRefreshSession() {
    const client = useQueryClient();

    return useCallback(
        () => client.invalidateQueries({ queryKey: AUTH_SESSION_QUERY_KEY }),
        [client]
    );
}

/** Misma revalidación, para código fuera de React (interceptores, callbacks sueltos). */
export function refreshSession() {
    return queryClient.invalidateQueries({ queryKey: AUTH_SESSION_QUERY_KEY });
}
