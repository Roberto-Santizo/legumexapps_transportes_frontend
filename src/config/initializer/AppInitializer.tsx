import { AUTH_SESSION_QUERY_KEY } from '@/config/initializer/session';
import { authProvider, login, logout, type LoginResponse } from '@/features/auth/auth';
import { useDispatch } from "react-redux";
import { useEffect } from "react";
import { useQuery } from '@tanstack/react-query';
import type { AppDispatch } from '@/config/store/store';

export const AppInitializer = ({ children }: { children: React.ReactNode }) => {
    const dispatch = useDispatch<AppDispatch>();

    const { data, isPending, isError } = useQuery<LoginResponse | null>({
        queryKey: AUTH_SESSION_QUERY_KEY,
        queryFn: () => {
            const token = localStorage.getItem("AUTH_TOKEN");

            if (!token) return null;

            return authProvider.checkStatus();
        },
        retry: false,
        refetchOnWindowFocus: false,
        staleTime: Infinity,
    });

    useEffect(() => {
        if (isPending) return;

        if (isError || !data) {
            dispatch(logout());
            return;
        }

        dispatch(login(data));
    }, [data, isPending, isError, dispatch]);

    if (isPending) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-canvas">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-primary" />
                <span className="sr-only">Cargando...</span>
            </div>
        );
    }

    return <>{children}</>;
}
