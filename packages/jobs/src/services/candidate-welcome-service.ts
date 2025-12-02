import { eq } from "@selectio/db";
import { db } from "@selectio/db/client";
import {
  companySettings,
  responseScreening,
  vacancyResponse,
} from "@selectio/db/schema";
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

  const prompt = buildWelcomePrompt(response, screening, company);

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

interface ResponseWithVacancy {
  id: string;
  vacancyId: string;
  candidateName: string | null;
  about: string | null;
  vacancy: {
    title: string | null;
    description: string | null;
  } | null;
}

function buildWelcomePrompt(
  response: ResponseWithVacancy,
  screening: typeof responseScreening.$inferSelect | undefined,
  company: typeof companySettings.$inferSelect | undefined,
): string {
  const companyName = company?.name || "наша компания";
  const companyDescription = company?.description || "";
  const companyWebsite = company?.website || "";

  return `Ты — рекрутер компании "${companyName}". Напиши короткое персонализированное приветственное сообщение кандидату, который откликнулся на вакансию.

ИНФОРМАЦИЯ О КОМПАНИИ:
Название: ${companyName}
${companyDescription ? `Описание: ${companyDescription}` : ""}
${companyWebsite ? `Сайт: ${companyWebsite}` : ""}

ИНФОРМАЦИЯ О ВАКАНСИИ:
Позиция: ${response.vacancy?.title || "Не указана"}
${response.vacancy?.description ? `Описание: ${stripHtml(response.vacancy.description).result.substring(0, 200)}...` : ""}

ИНФОРМАЦИЯ О КАНДИДАТЕ:
ФИО: ${response.candidateName || "Кандидат"}
${response.about ? `О себе: ${response.about.substring(0, 150)}...` : ""}

РЕЗУЛЬТАТЫ СКРИНИНГА:
${
  screening
    ? `
Оценка: ${screening.score}/5
Анализ: ${screening.analysis || "Не указан"}
Уровень интереса: ${
        screening.score >= 4
          ? "высокий"
          : screening.score === 3
            ? "средний"
            : "базовый"
      }
`
    : "Скрининг не проведен"
}

ЗАДАЧА:
Напиши короткое (2-3 предложения) приветственное сообщение от лица живого рекрутера.

ТРЕБОВАНИЯ:
- Обращайся к кандидату ТОЛЬКО ПО ИМЕНИ (первое слово из ФИО)
- Сообщение должно быть максимально коротким и естественным
- Пиши как обычный человек в мессенджере, без формальностей
- Покажи заинтересованность, но без излишнего энтузиазма
- НЕ упоминай оценки, скрининг или автоматизацию
- НЕ используй шаблонные фразы типа "рады сообщить", "благодарим за отклик"
- В КОНЦЕ обязательно попроси кандидата ответить ГОЛОСОВЫМ СООБЩЕНИЕМ на один короткий вопрос
- Вопрос должен быть простым и релевантным позиции (например: "Почему вас заинтересовала эта позиция?" или "Какой опыт работы у вас самый интересный?")
- Укажи, что ответ нужен именно голосом
- НЕ добавляй подпись или имя отправителя

СТИЛЬ:
- Пиши как в обычной переписке: просто, по-человечески
- Используй эмодзи умеренно (1-2 максимум)
- Длина: 2-3 короткие предложения + просьба записать голосовое

ФОРМАТ ОТВЕТА:
Верни только текст сообщения без кавычек и дополнительных пояснений.`;
}
