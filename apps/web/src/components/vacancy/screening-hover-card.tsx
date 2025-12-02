"use client";

import {
  Badge,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@selectio/ui";
import { CheckCircle2, Info, XCircle } from "lucide-react";

interface ScreeningData {
  score: number;
  detailedScore: number;
  analysis: string | null;
  questions: unknown;
  greeting: string | null;
}

interface ScreeningHoverCardProps {
  screening: ScreeningData;
}

export function ScreeningHoverCard({ screening }: ScreeningHoverCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 4) return "text-green-600";
    if (score >= 3) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 4) return "Отличное соответствие";
    if (score === 3) return "Среднее соответствие";
    if (score === 2) return "Слабое соответствие";
    return "Не подходит";
  };

  const questions = Array.isArray(screening.questions)
    ? (screening.questions as string[])
    : [];

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 4) return "default";
    if (score >= 3) return "secondary";
    return "destructive";
  };

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
        >
          <Badge
            variant={getScoreBadgeVariant(screening.score)}
            className="gap-1.5 font-semibold"
          >
            <span>{screening.score}/5</span>
            <span className="opacity-70">·</span>
            <span className="font-normal">{screening.detailedScore}/100</span>
          </Badge>
          <Info className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </HoverCardTrigger>
      <HoverCardContent
        className="w-96 max-h-[600px] overflow-y-auto"
        side="left"
      >
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              Оценка кандидата
            </h4>
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Общая оценка
                </p>
                <p
                  className={`text-2xl font-bold ${getScoreColor(screening.score)}`}
                >
                  {screening.score}/5
                </p>
              </div>
              <Badge
                variant={screening.score >= 3 ? "default" : "destructive"}
                className="text-xs"
              >
                {getScoreLabel(screening.score)}
              </Badge>
            </div>
            <div className="mt-2 p-3 rounded-lg border bg-primary/5">
              <p className="text-sm text-muted-foreground mb-1">
                Детальная оценка
              </p>
              <p className="text-2xl font-bold text-primary">
                {screening.detailedScore}/100
              </p>
            </div>
          </div>

          {screening.analysis && (
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                {screening.score >= 3 ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                Анализ
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {screening.analysis}
              </p>
            </div>
          )}

          {screening.greeting && (
            <div>
              <h4 className="font-semibold mb-2">Приветствие</h4>
              <div className="p-3 rounded-lg border bg-blue-50 dark:bg-blue-950/20">
                <p className="text-sm leading-relaxed">{screening.greeting}</p>
              </div>
            </div>
          )}

          {questions.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">
                Вопросы ({questions.length})
              </h4>
              <ul className="space-y-2">
                {questions.map((question, idx) => (
                  <li
                    key={`question-${question.slice(0, 20)}-${idx}`}
                    className="flex gap-2 p-2 rounded-lg border bg-card text-sm"
                  >
                    <span className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{question}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
