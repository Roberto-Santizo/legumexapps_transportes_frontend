import { ApiResponseSchema } from "@/features/shared/shared";
import { AuthDatasource, LoginResponseSchema, type ConfirmAccountForm, type LoginForm, type LoginResponse, type RegisterForm } from "@/features/auth/auth";
import { isAxiosError, type AxiosInstance } from "axios";

export class AuthDatasourceImpl implements AuthDatasource {
    constructor(private api: AxiosInstance) { }

    async checkStatus(): Promise<LoginResponse> {
         try {
            const url = '/auth/check-status';
            const { data } = await this.api.get(url);
            const response = LoginResponseSchema.safeParse(data['data']);

            if (response.success) {
                return response.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(error.response?.data.message);

            throw new Error("Error no controlado.");
        }
    }

    async confirmAccount(payload: ConfirmAccountForm): Promise<string> {
        try {
            const url = '/auth/confirm-account';
            const { data } = await this.api.post(url, payload);
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(error.response?.data.message);

            throw new Error("Error no controlado.");
        }
    }

    async register(payload: RegisterForm): Promise<string> {
        try {
            const url = '/auth/register';
            const { data } = await this.api.post(url, payload);
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(error.response?.data.message);

            throw new Error("Error no controlado.");
        }
    }


    async login(payload: LoginForm): Promise<LoginResponse> {
        try {
            const url = '/auth/login';
            const { data } = await this.api.post(url, payload);
            const response = LoginResponseSchema.safeParse(data['data']);

            if (response.success) {
                return response.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(error.response?.data.message);

            throw new Error("Error no controlado.");
        }
    }
}