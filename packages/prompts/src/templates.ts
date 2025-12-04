/**
 * Шаблоны для форматирования промптов
 */

export interface PromptTemplate {
  system: string;
  user: string;
}

/**
 * Создает полный промпт из системного и пользовательского сообщений
 */
export function createPrompt(system: string, user: string): PromptTemplate {
  return { system, user };
}

/**
 * Форматирует промпт с параметрами
 */
export function formatPrompt(
  template: string,
  params: Record<string, string | number>,
): string {
  return Object.entries(params).reduce(
    (result, [key, value]) =>
      result.replace(new RegExp(`{{${key}}}`, "g"), String(value)),
    template,
  );
}

/**
 * Шаблоны промптов для различных сценариев
 */
export const PROMPT_TEMPLATES = {
  /**
   * Шаблон для анализа текста
   */
  TEXT_ANALYSIS: {
    system:
      "Ты - эксперт по анализу текстов. Отвечай структурированно и по делу.",
    user: "Проанализируй следующий текст:\n\n{{text}}\n\nФокус анализа: {{focus}}",
  },

  /**
   * Шаблон для генерации контента
   */
  CONTENT_GENERATION: {
    system:
      "Ты - креативный копирайтер. Создавай качественный и привлекательный контент.",
    user: "Создай {{contentType}} на тему: {{topic}}\n\nТребования: {{requirements}}",
  },

  /**
   * Шаблон для извлечения данных
   */
  DATA_EXTRACTION: {
    system: "Ты - эксперт по извлечению структурированных данных из текста.",
    user: "Извлеки {{dataType}} из следующего текста:\n\n{{text}}",
  },
} as const;

export type PromptTemplateKey = keyof typeof PROMPT_TEMPLATES;
