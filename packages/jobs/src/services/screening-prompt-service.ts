import { eq } from "@selectio/db";
import { db } from "@selectio/db/client";
import { vacancy } from "@selectio/db/schema";
import { buildVacancyRequirementsExtractionPrompt } from "@selectio/prompts";
import { generateText } from "../lib/ai-client";
import { vacancyRequirementsSchema } from "../schemas/vacancy-requirements.schema";
import type { VacancyRequirements } from "../types/screening";
import { extractJsonFromText } from "../utils/json-extractor";

/**
 * Извлекает и структурирует требования вакансии через AI
 */
export async function extractVacancyRequirements(
  vacancyId: string,
  description: string,
): Promise<VacancyRequirements> {
  console.log(`🎯 Генерация требований для вакансии ${vacancyId}`);

  const vacancyData = await db.query.vacancy.findFirst({
    where: eq(vacancy.id, vacancyId),
  });

  if (!vacancyData) {
    throw new Error(`Вакансия ${vacancyId} не найдена`);
  }

  const prompt = buildVacancyRequirementsExtractionPrompt(
    vacancyData.title,
    description,
  );

  console.log(`📤 Отправка запроса в AI для извлечения требований`);

  const { text } = await generateText({
    prompt,
    temperature: 0.1,
    generationName: "extract-vacancy-requirements",
    entityId: vacancyId,
    metadata: {
      vacancyId,
      title: vacancyData.title,
    },
  });

  console.log(`📥 Получен ответ от AI`);

  const requirements = parseRequirements(text);

  await db
    .update(vacancy)
    .set({ requirements })
    .where(eq(vacancy.id, vacancyId));

  console.log(`✅ Требования сохранены для вакансии ${vacancyId}`);

  return requirements;
}

export async function getVacancyRequirements(
  vacancyId: string,
): Promise<VacancyRequirements | null> {
  const vacancyData = await db.query.vacancy.findFirst({
    where: eq(vacancy.id, vacancyId),
  });

  return (vacancyData?.requirements as VacancyRequirements) ?? null;
}

/**
 * Парсит ответ AI в структурированные требования
 */
function parseRequirements(response: string): VacancyRequirements {
  try {
    const extracted = extractJsonFromText(response);

    if (!extracted) {
      throw new Error("JSON не найден в ответе AI");
    }

    const validated = vacancyRequirementsSchema.parse(extracted);
    return validated as VacancyRequirements;
  } catch (error) {
    console.error(`❌ Ошибка парсинга требований:`, error);
    throw error;
  }
}
