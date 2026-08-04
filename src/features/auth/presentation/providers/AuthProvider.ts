import { type AuthRepository, type ConfirmAccountForm, type LoginForm, type RegisterForm } from "@/features/auth/auth";
import { AuthDatasourceImpl, AuthRepositoryImpl } from "@/features/auth/infrastructure/infrastructure";
import api from "@/config/http/axios";

export class AuthProvider {
    constructor(private repository: AuthRepository) { }

    login(payload: LoginForm) {
        return this.repository.login(payload);
    }

    register(payload: RegisterForm) {
        return this.repository.register(payload);
    }

    confirmAccount(payload: ConfirmAccountForm){
        return this.repository.confirmAccount(payload);
    }

    checkStatus(){
        return this.repository.checkStatus();
    }
}

const datasource = new AuthDatasourceImpl(api);
const repository = new AuthRepositoryImpl(datasource);
export const authProvider = new AuthProvider(repository);