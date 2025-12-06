import { z } from "zod";

// Data table item validation schema
export const dataTableItemSchema = z.object({
  id: z.number(),
  header: z.string().min(1, "Заголовок обязателен"),
  type: z.string().min(1, "Тип обязателен"),
  status: z.string().min(1, "Статус обязателен"),
  target: z.string().min(1, "Цель обязательна"),
  limit: z.string().min(1, "Лимит обязателен"),
  reviewer: z.string().min(1, "Проверяющий обязателен"),
});

export type DataTableItemData = z.infer<typeof dataTableItemSchema>;

// Data table inline edit schemas
export const targetFormSchema = z.object({
  target: z.string().min(1, "Цель обязательна"),
});

export type TargetFormData = z.infer<typeof targetFormSchema>;

export const limitFormSchema = z.object({
  limit: z.string().min(1, "Лимит обязателен"),
});

export type LimitFormData = z.infer<typeof limitFormSchema>;
