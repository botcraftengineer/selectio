import { eq } from "@selectio/db";
import { db } from "@selectio/db/client";
import {
  companySettings,
  responseScreening,
  vacancyResponse,
} from "@selectio/db/schema";
import { buildCandidateWelcomePrompt } from "@selectio/prompts";
import { stripHtml } from "string-strip-html";
import { generateText } from "../lib/ai-client";

/**
 * Генерирует персонализированное приветственное сообщение для кандидата
 */
export async function generateWelcomeMessage(responseId: string) {
  console.log(
    `👋 Генерация приветственного сообщения для отклика ${responseId}`,
  );

  const response = await db.query.vacancyResponse.findFirst({
    where: eq(vacancyResponse.id, responseId),
    with: {
      vacancy: true,
    },
  });

  if (!response) {
    throw new Error(`Отклик ${responseId} не найден`);
  }

  const screening = await db.query.responseScreening.findFirst({
    where: eq(responseScreening.responseId, responseId),
  });

  const [company] = await db.select().from(companySettings).limit(1);

  const prompt = buildCandidateWelcomePrompt({
    companyName: company?.name || "наша компания",
    companyDescription: company?.description || undefined,
    companyWebsite: company?.website || undefined,
    vacancyTitle: response.vacancy?.title || null,
    vacancyDescription: response.vacancy?.description
      ? stripHtml(response.vacancy.description).result.substring(0, 200)
      : undefined,
    candidateName: response.candidateName,
    candidateAbout: response.about?.substring(0, 150) || undefined,
    screeningScore: screening?.score,
    screeningAnalysis: screening?.analysis || undefined,
  });

  console.log(`📤 Отправка запроса в AI для генерации приветствия`);

  const { text } = await generateText({
    prompt,
    temperature: 0.7,
    generationName: "candidate-welcome",
    entityId: responseId,
    metadata: {
      responseId,
      vacancyId: response.vacancyId,
      candidateName: response.candidateName,
    },
  });

  console.log(`📥 Приветственное сообщение сгенерировано`);

  let finalMessage = text.trim();

  // Добавляем ссылку на вакансию
  if (response.vacancy) {
    finalMessage += `\n\n🔗 Ссылка на вакансию: https://hh.ru/vacancy/${response.vacancy.id}`;
  }

  return finalMessage;
}
