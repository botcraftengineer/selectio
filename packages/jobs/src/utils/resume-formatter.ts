import {
  buildFullResumeScreeningPrompt,
  formatResumeForScreening,
} from "@selectio/prompts";
import type {
  ResumeScreeningData,
  VacancyRequirements,
} from "../types/screening";

/**
 * Форматирует данные резюме для отправки в промпт скрининга
 * @deprecated Используйте formatResumeForScreening из @selectio/prompts
 */
export { formatResumeForScreening };

/**
 * Создает полный промпт для скрининга, объединяя требования вакансии и данные резюме
 * @deprecated Используйте buildFullResumeScreeningPrompt из @selectio/prompts
 */
export function buildFullScreeningPrompt(
  requirements: VacancyRequirements,
  resumeData: ResumeScreeningData,
): string {
  return buildFullResumeScreeningPrompt(requirements, resumeData);
}
