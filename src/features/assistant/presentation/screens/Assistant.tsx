import { ASSISTANT_FALLBACK_ROUTE, AssistantPanel, canUseAssistant } from "@/features/assistant/assistant";
import type { RootState } from "@/config/config";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

/**
 * Apartado de Inteligencia Artificial. Hoy tiene una sola pieza, el
 * asistente del tablero; las que vengan se montan aquí al lado.
 *
 * `pilot` recibe 403 del endpoint y un `carrier` sin empresa también, pero
 * ese último nunca llega: `ProtectedLayout` lo manda a completar el perfil.
 */
export function Assistant() {
    const user = useSelector((state: RootState) => state.auth.user);

    if (!user || !canUseAssistant(user.role, user.carrierId)) {
        return <Navigate to={ASSISTANT_FALLBACK_ROUTE} replace />;
    }

    return <AssistantPanel key={user.id} userId={user.id} userName={user.name} />;
}
