import { z } from "zod";

export const accountFormSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Имя должно содержать минимум 2 символа." })
    .max(30, { message: "Имя не должно превышать 30 символов." }),
  image: z
    .string()
    .refine(
      (val) => !val || val.startsWith("data:image/"),
      "Изображение должно быть в формате data URL",
    )
    .nullable()
    .optional(),
});

export type AccountFormValues = z.infer<typeof accountFormSchema>;
