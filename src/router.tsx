import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ConfirmAccount, Login, Register } from "@/features/auth/auth";
import { ProtectedLayout, PublicLayout } from "@/features/shared/shared";

export default function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>
                <Route element={<PublicLayout />}>
                    <Route path="/" element={<Navigate to={'/login'} replace />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/confirmar-cuenta" element={<ConfirmAccount />} />
                </Route>

                <Route element={<ProtectedLayout />}>
                    <Route path="/dashboard" element={<div></div>} />
                </Route>
            </Routes>
        </BrowserRouter>
    )
}
