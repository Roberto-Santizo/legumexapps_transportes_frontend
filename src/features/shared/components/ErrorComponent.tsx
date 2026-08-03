import { AlertCircle } from "lucide-react";

interface ErrorComponentProps {
    message: string;
}

export function ErrorComponent({ message }: ErrorComponentProps) {
    const string = 'Ha ocurrido un error :(';

    return (
        <div className="flex min-h-screen items-center justify-center p-6">
            <div className="w-full max-w-md rounded-2xl border border-red-100 bg-white p-8 shadow-sm">
                <div className="flex flex-col items-center text-center">
                    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
                        <AlertCircle className="h-7 w-7 text-red-500" />
                    </div>

                    <h2 className="text-xl font-semibold text-gray-900">
                        {string}
                    </h2>

                    <p className="mt-3 text-sm leading-6 text-gray-500">
                        {message}
                    </p>
                </div>
            </div>
        </div>
    );
}