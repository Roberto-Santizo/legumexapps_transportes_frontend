import { BarChartDatumSchema, FileResponseSchema } from '@/features/shared/shared';
import type { ReactNode } from 'react';
import z, { type ZodSchema } from 'zod';

export type Option = {
    label: string;
    value: number | string;
};

export type FileForm = {
    file: File
}

export type DynamicFormValues = Record<string, number | string>;
export type FileResponse = z.infer<typeof FileResponseSchema>;
export type BarChartDatum = z.infer<typeof BarChartDatumSchema>;

export type ToastVariant = "success" | "error" | "warning" | "info" | "question";

export type ToastAction = {
    label: string;
    onClick: () => void;
};

export type ToastItem = {
    id: string;
    variant: ToastVariant;
    message: string;
    description?: string;
    action?: ToastAction;
    duration: number;
};


export type UseUrlFiltersProps<T> = {
    schema: ZodSchema<T>;
    defaults: T;
}

type Column<T> = {
    header: string;
    key: keyof T;
    width?: number;
};

export interface ExportExcelOptions<T> {
    fileName: string;
    sheetName: string;
    columns: Column<T>[];
    data: T[];
}

export type UserRole = "administrator" | "carrier" | "pilot";

export type NavItem = {
    to: string;
    text: string;
    icon: ReactNode;
    roles?: UserRole[];
    disabled?: boolean;
};