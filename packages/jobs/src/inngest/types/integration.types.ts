import { z } from "zod";

/**
 * Integration-related event schemas
 */

export const verifyHHIntegrationDataSchema = z.object({
  integrationId: z.string().min(1, "Требуется идентификатор интеграции"),
  workspaceId: z.string().min(1, "Требуется идентификатор рабочей области"),
});

/**
 * Type inference
 */
export type VerifyHHIntegrationPayload = z.infer<
  typeof verifyHHIntegrationDataSchema
>;
