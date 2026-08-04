import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@/config/config";

export function CompleteProfile() {
  const isSignedIn = useSelector((state: RootState) => state.auth.isSignedIn);
  const user = useSelector((state: RootState) => state.auth.user);

  if (!isSignedIn) return <Navigate to={'/login'} replace />

  if (user?.role !== "carrier" || user.carrierId !== null) {
    return <Navigate to={'/dashboard'} replace />
  }

  return <div />;
}
