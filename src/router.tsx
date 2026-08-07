import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { CompleteProfile } from "@/features/carriers/carriers";
import { ConfirmAccount, Login, Register } from "@/features/auth/auth";
import { CreateFuelPrice, IndexFuelPrices, ShowFuelPrice, UpdateFuelPrice } from "@/features/fuel-prices/fuel-prices";
import { CreateVehicle, IndexVehicles, ShowVehicle, UpdateVehicle } from "@/features/vehicles/vehicles";
import { Dashboard } from "@/features/dashboard/dashboard";
import { Profile, ProtectedLayout, PublicLayout } from "@/features/shared/shared";

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

                <Route path="/completar-perfil" element={<CompleteProfile />} />

                <Route element={<ProtectedLayout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/perfil" element={<Profile />} />
                </Route>

                <Route element={<ProtectedLayout />}>
                    <Route path="/vehiculos" element={<IndexVehicles />} />
                    <Route path="/vehiculos/crear" element={<CreateVehicle />} />
                    <Route path="/vehiculos/:id" element={<ShowVehicle />} />
                    <Route path="/vehiculos/:id/editar" element={<UpdateVehicle />} />
                </Route>

                <Route element={<ProtectedLayout />}>
                    <Route path="/gasolina-precios" element={<IndexFuelPrices />} />
                    <Route path="/gasolina-precios/crear" element={<CreateFuelPrice />} />
                    <Route path="/gasolina-precios/:id" element={<ShowFuelPrice />} />
                    <Route path="/gasolina-precios/:id/editar" element={<UpdateFuelPrice />} />
                </Route>
            </Routes>
        </BrowserRouter>
    )
}
