import z from "zod";

export const ApiResponseSchema = z.object({
    statusCode: z.number(),
    message: z.string(),

});

export const ApiPaginatedResponseSchema = ApiResponseSchema.extend({
    total: z.number().optional(),
    currentPage: z.number().optional(),
    perPage: z.number().optional()
});

export const FileResponseSchema = z.object({
    file: z.base64(),
    fileName: z.string()
});

export const BarChartDatumSchema = z.object({
    label: z.string(),
    value: z.number()
});