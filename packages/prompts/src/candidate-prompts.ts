/**
 * Промпты для коммуникации с кандидатами
 */

export interface WelcomeMessageContext {
  companyName: string;
  companyDescription?: string;
  companyWebsite?: string;
  vacancyTitle: string | null;
  vacancyDescription?: string;
  candidateName: string | null;
  candidateAbout?: string;
  screeningScore?: number;
  screeningAnalysis?: string;
}

/**
 * Промпт для генерации приветственного сообщения кандидату
 */
export function buildCandidateWelcomePrompt(
  context: WelcomeMessageContext,
): string {
  const {
    companyName,
    companyDescription,
    companyWebsite,
    vacancyTitle,
    vacancyDescription,
    candidateName,
    candidateAbout,
    screeningScore,
    screeningAnalysis,
  } = context;

  return `Ты — рекрутер компании "${companyName}". Напиши короткое персонализированное приветственное сообщение кандидату, который откликнулся на вакансию.

ИНФОРМАЦИЯ О КОМПАНИИ:
Название: ${companyName}
${companyDescription ? `Описание: ${companyDescription}` : ""}
${companyWebsite ? `Сайт: ${companyWebsite}` : ""}

ИНФОРМАЦИЯ О ВАКАНСИИ:
Позиция: ${vacancyTitle || "Не указана"}
${vacancyDescription ? `Описание: ${vacancyDescription.substring(0, 200)}...` : ""}

ИНФОРМАЦИЯ О КАНДИДАТЕ:
ФИО: ${candidateName || "Кандидат"}
${candidateAbout ? `О себе: ${candidateAbout.substring(0, 150)}...` : ""}

РЕЗУЛЬТАТЫ СКРИНИНГА:
${
  screeningScore
    ? `
Оценка: ${screeningScore}/5
Анализ: ${screeningAnalysis || "Не указан"}
Уровень интереса: ${
        screeningScore >= 4
          ? "высокий"
          : screeningScore === 3
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

/**
 * Промпт для извлечения Telegram username из контактов
 */
export function buildTelegramUsernameExtractionPrompt(
  contactsJson: string,
): string {
  return `Ты — ассистент для извлечения данных. Твоя задача — найти и извлечь Telegram username из предоставленной контактной информации.

Контактные данные:
${contactsJson}

Инструкции:
1. Ищи любое поле, которое может содержать Telegram username (например, "telegram", "messenger", "social", "contacts" и т.д.)
2. Telegram username обычно начинается с @ или указывается без @
3. Telegram username может содержать только буквы (a-z, A-Z), цифры (0-9) и подчёркивания (_)
4. Telegram username должен быть длиной минимум 5 символов
5. Если ты нашёл валидный Telegram username, верни ТОЛЬКО username БЕЗ символа @
6. Если Telegram username не найден, верни точно: null

Примеры:
- Если найдено "@john_doe", верни: john_doe
- Если найдено "telegram: @alice123", верни: alice123
- Если найдено "tg: bob_smith", верни: bob_smith
- Если Telegram не найден, верни: null

Верни ТОЛЬКО username или null, ничего больше.`;
}
