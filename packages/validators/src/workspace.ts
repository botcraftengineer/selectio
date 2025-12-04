import { z } from "zod";

// Общая схема для workspaceId
export const workspaceIdSchema = z.string().regex(/^ws_[0-9a-f]{32}$/);

// Общая схема для UUIDv7
export const uuidv7Schema = z.uuidv7();

export const createWorkspaceSchema = z.object({
  name: z.string().min(1, "Название обязательно").max(100),
  slug: z
    .string()
    .min(1, "Slug обязателен")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug может содержать только буквы, цифры и дефис"),
  description: z.string().max(500).optional(),
  website: z.string().url("Некорректный URL").optional().or(z.literal("")),
  logo: z
    .string()
    .refine(
      (val) => !val || val.startsWith("data:image/"),
      "Logo must be a valid data URL",
    )
    .optional()
    .or(z.literal("")),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  description: z.string().max(500).optional(),
  website: z.string().url().optional().or(z.literal("")),
  logo: z
    .string()
    .refine(
      (val) => !val || val.startsWith("data:image/"),
      "Logo must be a valid data URL",
    )
    .optional()
    .or(z.literal("")),
});

export const addUserToWorkspaceSchema = z.object({
  workspaceId: workspaceIdSchema,
  email: z.string().email("Некорректный email"),
  role: z.enum(["owner", "admin", "member"]).default("member"),
});

export const updateUserRoleSchema = z.object({
  workspaceId: workspaceIdSchema,
  userId: z.string(),
  role: z.enum(["owner", "admin", "member"]),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type AddUserToWorkspaceInput = z.infer<typeof addUserToWorkspaceSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
