import type { PlacePredictionSchema, PlaceSchema } from "@/features/places/places";
import type { z } from "zod";

export type PlacePrediction = z.infer<typeof PlacePredictionSchema>;
export type Place = z.infer<typeof PlaceSchema>;
