import { logout, login, authProvider } from '@/features/auth/auth';
import { useDispatch } from "react-redux";
import { useEffect, useState } from "react";

export const AppInitializer = ({ children }: { children: React.ReactNode }) => {
    const dispatch = useDispatch();
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const initAuth = async () => {
            try {
                const token = localStorage.getItem("AUTH_TOKEN");

                if (!token) {
                    dispatch(logout());
                    return;
                }

                const user = await authProvider.checkStatus();
                dispatch(login(user));

            } catch (error) {
                dispatch(logout());
            } finally {
                setLoading(false);
            }
        }
        initAuth();
    });

    if (loading) {
        return <p>Cargando...</p>;
    }

    return <>{children}</>;
}


