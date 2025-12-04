import { eq } from "@selectio/db";
import { db } from "@selectio/db/client";
import { responseScreening, vacancyResponse } from "@selectio/db/schema";
import { buildResponseScreeningPrompt } from "@selectio/prompts";
import { generateText } from "../lib/ai-client";
import { responseScreeningResultSchema } from "../schemas/response-screening.schema";
import { extractJsonFromText } from "../utils/json-extractor";
import { getVacancyRequirements } from "./screening-prompt-service";
/**
 * Скринит отклик и генерирует вопросы для кандидата
 */
export async function screenResponse(responseId: string) {
  console.log(`🎯 Скрининг отклика ${responseId}`);
  const response = await db.query.vacancyResponse.findFirst({
    where: eq(vacancyResponse.id, responseId),
  });

  if (!response) {
    throw new Error(`Отклик ${responseId} не найден`);
  }

  const requirements = await getVacancyRequirements(response.vacancyId);

  if (!requirements) {
    throw new Error(`Требования для вакансии ${response.vacancyId} не найдены`);
  }

  const prompt = buildResponseScreeningPrompt(
    {
      candidateName: response.candidateName,
      experience: response.experience,
      education: response.education,
      about: response.about,
      languages: response.languages,
      courses: response.courses,
    },
    requirements,
  );

  console.log(`📤 Отправка запроса в AI для скрининга`);

  const { text } = await generateText({
    prompt,
    temperature: 0.3,
    generationName: "screen-response",
    entityId: responseId,
    metadata: {
      responseId,
      vacancyId: response.vacancyId,
    },
  });
  console.log(`📥 Получен ответ от AI`);

  const result = parseScreeningResult(text);

  // Проверяем, существует ли уже запись скрининга для этого отклика
  const existingScreening = await db.query.responseScreening.findFirst({
    where: eq(responseScreening.responseId, responseId),
  });

  if (existingScreening) {
    // Обновляем существующую запись
    await db
      .update(responseScreening)
      .set({
        score: result.score,
        detailedScore: result.detailedScore,
        analysis: result.analysis,
      })
      .where(eq(responseScreening.responseId, responseId));
  } else {
    // Создаем новую запись
    await db.insert(responseScreening).values({
      responseId,
      score: result.score,
      detailedScore: result.detailedScore,
      analysis: result.analysis,
    });
  }

  await db
    .update(vacancyResponse)
    .set({ status: "EVALUATED" })
    .where(eq(vacancyResponse.id, responseId));

  console.log(
    `✅ Результат скрининга сохранен: оценка ${result.score}/5 (${result.detailedScore}/100)`,
  );

  return result;
}

function parseScreeningResult(text: string) {
  try {
    const extracted = extractJsonFromText(text);

    if (!extracted) {
      throw new Error("JSON не найден в ответе AI");
    }

    const validated = responseScreeningResultSchema.parse(extracted);
    return validated;
  } catch (error) {
    console.error(`❌ Ошибка парсинга результата скрининга:`, error);
    throw error;
  }
}
