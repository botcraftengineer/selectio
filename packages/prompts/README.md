# @selectio/prompts

Пакет для управления промптами AI-ассистентов в проекте Selectio.

## Установка

```bash
bun add @selectio/prompts
```

## Использование

### Системные промпты

```typescript
import { SYSTEM_PROMPTS } from "@selectio/prompts";

const systemMessage = SYSTEM_PROMPTS.RESUME_ANALYZER;
```

### Промпты для вакансий

```typescript
import { buildVacancyRequirementsExtractionPrompt } from "@selectio/prompts";

const prompt = buildVacancyRequirementsExtractionPrompt(
  "Senior Frontend Developer",
  "Описание вакансии..."
);
```

### Промпты для скрининга

```typescript
import { 
  buildResponseScreeningPrompt,
  buildFullResumeScreeningPrompt 
} from "@selectio/prompts";

// Скрининг отклика
const prompt = buildResponseScreeningPrompt(responseData, requirements);

// Скрининг резюме
const resumePrompt = buildFullResumeScreeningPrompt(requirements, resumeData);
```

### Промпты для интервью

```typescript
import { 
  buildInterviewQuestionPrompt,
  buildInterviewScoringPrompt 
} from "@selectio/prompts";

// Генерация следующего вопроса
const questionPrompt = buildInterviewQuestionPrompt(interviewContext);

// Финальный скоринг
const scoringPrompt = buildInterviewScoringPrompt(scoringContext);
```

### Промпты для кандидатов

```typescript
import { 
  buildCandidateWelcomePrompt,
  buildTelegramUsernameExtractionPrompt 
} from "@selectio/prompts";

// Приветственное сообщение
const welcomePrompt = buildCandidateWelcomePrompt(welcomeContext);

// Извлечение Telegram username
const extractPrompt = buildTelegramUsernameExtractionPrompt(contactsJson);
```

### Шаблоны промптов

```typescript
import { PROMPT_TEMPLATES, formatPrompt } from "@selectio/prompts";

const template = PROMPT_TEMPLATES.TEXT_ANALYSIS.user;
const prompt = formatPrompt(template, {
  text: "Текст для анализа",
  focus: "ключевые навыки"
});
```

## Структура

- `system-prompts.ts` - системные промпты для различных AI-ассистентов
- `user-prompts.ts` - пользовательские промпты и запросы
- `templates.ts` - шаблоны и утилиты для работы с промптами
- `vacancy-prompts.ts` - промпты для работы с вакансиями
- `screening-prompts.ts` - промпты для скрининга откликов и резюме
- `interview-prompts.ts` - промпты для проведения интервью
- `candidate-prompts.ts` - промпты для коммуникации с кандидатами

## Добавление новых промптов

1. Добавьте новый промпт в соответствующий файл
2. Экспортируйте его через `index.ts`
3. Обновите типы при необходимости
