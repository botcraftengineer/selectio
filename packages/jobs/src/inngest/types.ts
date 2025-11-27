import { z } from "zod";

/**
 * Zod schemas for Inngest event payloads
 */

// Schema for vacancy requirements extraction event data
export const vacancyRequirementsExtractDataSchema = z.object({
  vacancyId: z.string().min(1, "Vacancy ID is required"),
  description: z.string().min(1, "Description is required"),
});

// Schema for response screening event data
export const responseScreenDataSchema = z.object({
  responseId: z.string().min(1, "Response ID is required"),
});

/**
 * Inngest event schemas using Zod
 * Each event must have a 'data' field containing the payload
 */
export const inngestEventSchemas = {
  "vacancy/requirements.extract": {
    data: vacancyRequirementsExtractDataSchema,
  },
  "response/screen": {
    data: responseScreenDataSchema,
  },
};

/**
 * Type inference from Zod schemas
 */
export type VacancyRequirementsExtractPayload = z.infer<
  typeof vacancyRequirementsExtractDataSchema
>;
export type ResponseScreenPayload = z.infer<typeof responseScreenDataSchema>;
