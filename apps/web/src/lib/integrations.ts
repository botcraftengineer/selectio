export const AVAILABLE_INTEGRATIONS = [
  {
    type: "hh",
    name: "HeadHunter",
    description: "Автоматизация откликов на вакансии на hh.ru",
    fields: ["email", "password"],
  },
] as const;

export type IntegrationType = (typeof AVAILABLE_INTEGRATIONS)[number]["type"];
