/**
 * Промпты для скрининга откликов и резюме
 */

export interface VacancyRequirements {
  job_title: string;
  summary: string;
  mandatory_requirements: string[];
  nice_to_have_skills: string[];
  tech_stack: string[];
  experience_years: {
    min: number | null;
    description: string;
  };
  languages: Array<{
    language: string;
    level: string;
  }>;
  location_type: string;
  keywords_for_matching: string[];
}

export interface ResponseData {
  candidateName: string | null;
  experience: string | null;
  education: string | null;
  about: string | null;
  languages: string | null;
  courses: string | null;
}

/**
 * Промпт для скрининга отклика кандидата
 */
export function buildResponseScreeningPrompt(
  response: ResponseData,
  requirements: VacancyRequirements,
): string {
  return `Ты — эксперт по подбору персонала. Оцени соответствие резюме кандидата требованиям вакансии.

ТРЕБОВАНИЯ ВАКАНСИИ:
Позиция: ${requirements.job_title}
Описание: ${requirements.summary}

Обязательные требования:
${requirements.mandatory_requirements.map((r) => `- ${r}`).join("\n")}

Желательные навыки:
${requirements.nice_to_have_skills.map((s) => `- ${s}`).join("\n")}

Технологический стек: ${requirements.tech_stack.join(", ")}

Опыт: ${requirements.experience_years.description}

Языки: ${requirements.languages.map((l) => `${l.language} (${l.level})`).join(", ")}

РЕЗЮМЕ КАНДИДАТА:
Имя: ${response.candidateName || "Не указано"}

Опыт работы:
${response.experience || "Не указан"}

Образование:
${response.education || "Не указано"}

О себе:
${response.about || "Не указано"}

Языки:
${response.languages || "Не указаны"}

Курсы:
${response.courses || "Не указаны"}

ЗАДАЧА:
1. Оцени соответствие резюме требованиям по двум шкалам:
   
   a) Общая оценка (score) от 1 до 5:
   - 1: Совершенно не подходит
   - 2: Слабое соответствие
   - 3: Среднее соответствие
   - 4: Хорошее соответствие
   - 5: Отличное соответствие
   
   b) Детальная оценка (detailedScore) от 0 до 100:
   - Более точная оценка для определения победителя среди кандидатов
   - Учитывай все нюансы: опыт, навыки, образование, языки, мотивацию
   - Эта оценка поможет ранжировать кандидатов с одинаковым score

2. Напиши краткий анализ (2-3 предложения): что подходит, чего не хватает.

ФОРМАТ ОТВЕТА (JSON):
Верни ответ СТРОГО в формате валидного JSON без Markdown-разметки.

{
  "score": число от 1 до 5,
  "detailedScore": число от 0 до 100,
  "analysis": "Краткий анализ соответствия"
}`;
}

export interface ResumeScreeningData {
  experience: string;
  education?: string;
  skills?: string;
  about?: string;
  languages?: string;
  courses?: string;
}

/**
 * Форматирует данные резюме для скрининга
 */
export function formatResumeForScreening(
  resumeData: ResumeScreeningData,
): string {
  const sections: string[] = [];

  sections.push(`ОПЫТ РАБОТЫ:\n${resumeData.experience}`);

  if (resumeData.education) {
    sections.push(`\nОБРАЗОВАНИЕ:\n${resumeData.education}`);
  }

  if (resumeData.skills) {
    sections.push(`\nНАВЫКИ:\n${resumeData.skills}`);
  }

  if (resumeData.about) {
    sections.push(`\nО СЕБЕ:\n${resumeData.about}`);
  }

  if (resumeData.languages) {
    sections.push(`\nЯЗЫКИ:\n${resumeData.languages}`);
  }

  if (resumeData.courses) {
    sections.push(`\nКУРСЫ И СЕРТИФИКАТЫ:\n${resumeData.courses}`);
  }

  return sections.join("\n");
}

/**
 * Создает полный промпт для скрининга резюме
 */
export function buildFullResumeScreeningPrompt(
  requirements: VacancyRequirements,
  resumeData: ResumeScreeningData,
): string {
  const formattedResume = formatResumeForScreening(resumeData);

  return `Ты эксперт по подбору персонала. Оцени резюме кандидата на соответствие требованиям вакансии.

ВАКАНСИЯ: ${requirements.job_title}

ОПИСАНИЕ: ${requirements.summary}

ОБЯЗАТЕЛЬНЫЕ ТРЕБОВАНИЯ:
${requirements.mandatory_requirements.map((r, i) => `${i + 1}. ${r}`).join("\n")}

ЖЕЛАТЕЛЬНЫЕ НАВЫКИ:
${requirements.nice_to_have_skills.map((s, i) => `${i + 1}. ${s}`).join("\n")}

ТЕХНОЛОГИИ: ${requirements.tech_stack.join(", ")}

ОПЫТ: ${requirements.experience_years.description}

ЯЗЫКИ: ${requirements.languages.map((l) => `${l.language} (${l.level})`).join(", ")}

ЛОКАЦИЯ: ${requirements.location_type}

РЕЗЮМЕ КАНДИДАТА:

${formattedResume}

ФОРМАТ ОТВЕТА (только JSON):
{
  "match_percentage": число от 0 до 100,
  "recommendation": "invite" | "reject" | "need_info",
  "strengths": ["сильная сторона 1", "сильная сторона 2"],
  "weaknesses": ["слабая сторона 1", "слабая сторона 2"],
  "summary": "краткое резюме"
}`;
}
