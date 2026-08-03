import type { AuthDatasource, AuthRepository, ConfirmAccountForm, LoginForm, LoginResponse, RegisterForm } from "@/features/auth/auth";

export class AuthRepositoryImpl implements AuthRepository {
    constructor(private datasource: AuthDatasource) { }
    
    confirmAccount(payload: ConfirmAccountForm): Promise<string> {
        return this.datasource.confirmAccount(payload);
    }

    register(payload: RegisterForm): Promise<string> {
        return this.datasource.register(payload);
    }

    login(payload: LoginForm): Promise<LoginResponse> {
        return this.datasource.login(payload);
    }

}