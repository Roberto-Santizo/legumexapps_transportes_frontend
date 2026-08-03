import type { ConfirmAccountForm, LoginForm, LoginResponse, RegisterForm } from "@/features/auth/auth";

export abstract class AuthRepository {
    abstract register(payload: RegisterForm): Promise<string>;
    abstract login(payload: LoginForm): Promise<LoginResponse>;
    abstract confirmAccount(payload: ConfirmAccountForm): Promise<string>;
}