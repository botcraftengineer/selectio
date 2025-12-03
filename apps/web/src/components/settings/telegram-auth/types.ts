import { z } from "zod";

export const step1Schema = z.object({
  apiId: z.string().min(1, "API ID обязателен"),
  apiHash: z.string().min(1, "API Hash обязателен"),
  phone: z.string().min(1, "Номер телефона обязателен"),
});

export const step2Schema = z.object({
  phoneCode: z.string().min(1, "Код обязателен"),
});

export const step3Schema = z.object({
  password: z.string().min(1, "Пароль обязателен"),
});

export type Step1Values = z.infer<typeof step1Schema>;
export type Step2Values = z.infer<typeof step2Schema>;
export type Step3Values = z.infer<typeof step3Schema>;

export interface ApiData {
  apiId: number;
  apiHash: string;
  phone: string;
}
