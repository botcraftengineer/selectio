import {
  Badge,
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@selectio/ui";
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";

interface VacancyAnalyticsProps {
  totalResponses: number;
  processedResponses: number;
  highScoreResponses: number;
  topScoreResponses: number;
  avgScore: number;
}

interface VacancyRequirementsData {
  summary?: string;
  job_title?: string;
  languages?: string[];
  tech_stack?: string[];
  location_type?: string;
  experience_years?: {
    min?: number;
    max?: number;
    description?: string;
  };
  nice_to_have_skills?: string[];
  keywords_for_matching?: string[];
  mandatory_requirements?: string[];
}

interface VacancyRequirementsProps {
  requirements: unknown;
}

export function VacancyAnalytics({
  totalResponses,
  processedResponses,
  highScoreResponses,
  topScoreResponses,
  avgScore,
}: VacancyAnalyticsProps) {
  const processedPercentage =
    totalResponses > 0
      ? Math.round((processedResponses / totalResponses) * 100)
      : 0;

  const highScorePercentage =
    processedResponses > 0
      ? Math.round((highScoreResponses / processedResponses) * 100)
      : 0;

  const topScorePercentage =
    processedResponses > 0
      ? Math.round((topScoreResponses / processedResponses) * 100)
      : 0;

  const isGrowingProcessed = processedPercentage >= 50;
  const isGrowingHighScore = highScorePercentage >= 30;
  const isGrowingTopScore = topScorePercentage >= 15;
  const isGoodAvgScore = avgScore >= 3.0;

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Обработано откликов</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {processedResponses}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {isGrowingProcessed ? <IconTrendingUp /> : <IconTrendingDown />}
              {processedPercentage}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {isGrowingProcessed ? "Хороший прогресс" : "Требует обработки"}
            {isGrowingProcessed ? (
              <IconTrendingUp className="size-4" />
            ) : (
              <IconTrendingDown className="size-4" />
            )}
          </div>
          <div className="text-muted-foreground">
            из {totalResponses} всего откликов
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Скоринг ≥ 3</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {highScoreResponses}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {isGrowingHighScore ? <IconTrendingUp /> : <IconTrendingDown />}
              {highScorePercentage}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {isGrowingHighScore ? "Качественные кандидаты" : "Мало подходящих"}
            {isGrowingHighScore ? (
              <IconTrendingUp className="size-4" />
            ) : (
              <IconTrendingDown className="size-4" />
            )}
          </div>
          <div className="text-muted-foreground">от обработанных откликов</div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Скоринг ≥ 4</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {topScoreResponses}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {isGrowingTopScore ? <IconTrendingUp /> : <IconTrendingDown />}
              {topScorePercentage}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {isGrowingTopScore ? "Отличные результаты" : "Нужно больше"}
            {isGrowingTopScore ? (
              <IconTrendingUp className="size-4" />
            ) : (
              <IconTrendingDown className="size-4" />
            )}
          </div>
          <div className="text-muted-foreground">
            топовые кандидаты для интервью
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Средний балл</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {processedResponses > 0 ? avgScore.toFixed(1) : "—"}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {isGoodAvgScore ? <IconTrendingUp /> : <IconTrendingDown />}
              {processedResponses > 0 ? "из 5.0" : "—"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {isGoodAvgScore ? "Качество выше среднего" : "Требует улучшения"}
            {isGoodAvgScore ? (
              <IconTrendingUp className="size-4" />
            ) : (
              <IconTrendingDown className="size-4" />
            )}
          </div>
          <div className="text-muted-foreground">общая оценка кандидатов</div>
        </CardFooter>
      </Card>
    </div>
  );
}

export function VacancyRequirements({
  requirements,
}: VacancyRequirementsProps) {
  if (!requirements) {
    return null;
  }

  const data = requirements as VacancyRequirementsData;

  return (
    <div className="rounded-lg border bg-linear-to-t from-primary/5 to-card dark:bg-card p-6 shadow-xs space-y-6">
      <h2 className="text-xl font-semibold">Сгенерированные требования</h2>

      {data.summary && (
        <div className="rounded-lg border bg-card/50 p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            Краткое описание
          </h3>
          <p className="text-sm leading-relaxed">{data.summary}</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {data.job_title && (
          <div className="rounded-lg border bg-card/50 p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Должность
            </h3>
            <p className="text-sm font-semibold">{data.job_title}</p>
          </div>
        )}

        {data.location_type && (
          <div className="rounded-lg border bg-card/50 p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Формат работы
            </h3>
            <p className="text-sm font-semibold">{data.location_type}</p>
          </div>
        )}

        {data.experience_years && (
          <div className="rounded-lg border bg-card/50 p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Опыт работы
            </h3>
            <p className="text-sm font-semibold">
              {data.experience_years.description ||
                `${data.experience_years.min}${data.experience_years.max ? `-${data.experience_years.max}` : "+"} лет`}
            </p>
          </div>
        )}
      </div>

      {data.mandatory_requirements &&
        data.mandatory_requirements.length > 0 && (
          <div className="rounded-lg border bg-card/50 p-4 space-y-3">
            <h3 className="text-lg font-semibold text-primary">
              Обязательные требования
            </h3>
            <ul className="space-y-2 pl-5">
              {data.mandatory_requirements.map((req, index) => (
                <li
                  key={index}
                  className="text-sm text-muted-foreground list-disc leading-relaxed"
                >
                  {req}
                </li>
              ))}
            </ul>
          </div>
        )}

      {data.tech_stack && data.tech_stack.length > 0 && (
        <div className="rounded-lg border bg-card/50 p-4 space-y-3">
          <h3 className="text-lg font-semibold text-primary">
            Технологический стек
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.tech_stack.map((tech, index) => (
              <Badge key={index} variant="secondary">
                {tech}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {data.nice_to_have_skills && data.nice_to_have_skills.length > 0 && (
        <div className="rounded-lg border bg-card/50 p-4 space-y-3">
          <h3 className="text-lg font-semibold text-primary">Будет плюсом</h3>
          <ul className="space-y-2 pl-5">
            {data.nice_to_have_skills.map((skill, index) => (
              <li
                key={index}
                className="text-sm text-muted-foreground list-disc leading-relaxed"
              >
                {skill}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.languages && data.languages.length > 0 && (
        <div className="rounded-lg border bg-card/50 p-4 space-y-3">
          <h3 className="text-lg font-semibold text-primary">Языки</h3>
          <div className="flex flex-wrap gap-2">
            {data.languages.map((lang, index) => (
              <Badge key={index} variant="outline">
                {lang}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {data.keywords_for_matching && data.keywords_for_matching.length > 0 && (
        <div className="rounded-lg border bg-card/50 p-4 space-y-3">
          <h3 className="text-lg font-semibold text-primary">
            Ключевые слова для поиска
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.keywords_for_matching.map((keyword, index) => (
              <Badge key={index} variant="outline">
                {keyword}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
