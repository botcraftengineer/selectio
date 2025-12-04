/**
 * Пользовательские промпты и шаблоны запросов
 */

export const USER_PROMPTS = {
  /**
   * Запрос на анализ резюме
   */
  ANALYZE_RESUME: (resumeText: string) =>
    `Проанализируй следующее резюме и выдели ключевые навыки, опыт работы и образование:\n\n${resumeText}`,

  /**
   * Запрос на генерацию описания вакансии
   */
  GENERATE_JOB_DESCRIPTION: (params: {
    title: string;
    requirements: string[];
    responsibilities: string[];
  }) =>
    `Создай привлекательное описание вакансии для позиции "${params.title}".
Требования: ${params.requirements.join(", ")}
Обязанности: ${params.responsibilities.join(", ")}`,

  /**
   * Запрос на сопоставление кандидата и вакансии
   */
  MATCH_CANDIDATE: (params: {
    candidateInfo: string;
    jobRequirements: string;
  }) =>
    `Оцени соответствие кандидата требованиям вакансии по шкале от 0 до 100.
    
Информация о кандидате:
${params.candidateInfo}

Требования вакансии:
${params.jobRequirements}

Предоставь оценку и краткое обоснование.`,

  /**
   * Запрос на извлечение контактной информации
   */
  EXTRACT_CONTACTS: (text: string) =>
    `Извлеки всю контактную информацию (email, телефон, социальные сети) из следующего текста:\n\n${text}`,
} as const;

export type UserPromptKey = keyof typeof USER_PROMPTS;
