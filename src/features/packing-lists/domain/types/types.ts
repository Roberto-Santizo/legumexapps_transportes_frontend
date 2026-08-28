import type { PackingListProductSummarySchema, PackingListSummarySchema, PackingListTotalsSchema } from "@/features/packing-lists/packing-lists";
import type { z } from "zod";

export type PackingListProductSummary = z.infer<typeof PackingListProductSummarySchema>;
export type PackingListTotals = z.infer<typeof PackingListTotalsSchema>;
export type PackingListSummary = z.infer<typeof PackingListSummarySchema>;
