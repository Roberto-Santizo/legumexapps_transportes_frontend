import type { LoginResponse, User } from "@/features/auth/auth";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface AuthState {
    isSignedIn: boolean;
    user?: User;
}

const initialState: AuthState = {
    isSignedIn: false,
    user: undefined
}

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        logout: (state) => {
            state.isSignedIn = false;
            state.user = undefined;
            localStorage.removeItem('AUTH_TOKEN');
        },
        login: (state, actions: PayloadAction<LoginResponse>) => {
            state.user = actions.payload.user;
            state.isSignedIn= true;
            localStorage.setItem('AUTH_TOKEN', actions.payload.token);
        }
    }
})

export const { logout, login } = authSlice.actions;
export default authSlice.reducer;