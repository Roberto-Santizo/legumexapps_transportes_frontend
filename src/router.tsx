import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ConfirmAccount, Login, Register } from "@/features/auth/auth";

export default function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>
                <Route>
                    <Route path="/" element={<Navigate to={'/login'} replace />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/confirmar-cuenta" element={<ConfirmAccount />} />
                </Route>
            </Routes>
        </BrowserRouter>
    )
}
