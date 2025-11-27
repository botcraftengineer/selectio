"use client";

import {
  Badge,
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@selectio/ui";
import { CheckCircle2, XCircle } from "lucide-react";

interface ScreeningResult {
  score: number;
  detailedScore: number;
  analysis: string;
  questions?: string[];
  greeting?: string;
}

interface ScreeningResultModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: ScreeningResult | null;
  candidateName?: string;
}

export function ScreeningResultModal({
  open,
  onOpenChange,
  result,
  candidateName,
}: ScreeningResultModalProps) {
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

  return (
    <Sheet open={open && !!result} onOpenChange={onOpenChange} modal>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg overflow-y-auto p-0"
      >
        {result && (
          <>
            <div className="p-6">
              <SheetHeader>
                <SheetTitle>Результат оценки кандидата</SheetTitle>
                <SheetDescription>
                  {candidateName || "Кандидат без имени"}
                </SheetDescription>
              </SheetHeader>
            </div>

            <div className="px-6 pb-6 space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Общая оценка
                    </p>
                    <p
                      className={`text-3xl font-bold ${getScoreColor(result.score)}`}
                    >
                      {result.score}/5
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={result.score >= 3 ? "default" : "destructive"}
                      className="text-sm"
                    >
                      {getScoreLabel(result.score)}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border bg-primary/5">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Детальная оценка
                    </p>
                    <p className="text-3xl font-bold text-primary">
                      {result.detailedScore}/100
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      Для определения
                      <br />
                      победителя
                    </p>
                  </div>
                </div>
              </div>

              {result.greeting && (
                <div>
                  <h3 className="font-semibold mb-3">
                    Приветственное предложение
                  </h3>
                  <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-950/20">
                    <p className="text-sm leading-relaxed">{result.greeting}</p>
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  {result.score >= 3 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  Анализ
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {result.analysis}
                </p>
              </div>

              {result.questions && result.questions.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">
                    Вопросы для собеседования ({result.questions.length})
                  </h3>
                  <ul className="space-y-3">
                    {result.questions.map((question, idx) => (
                      <li
                        key={`question-${question.slice(0, 20)}-${idx}`}
                        className="flex gap-3 p-3 rounded-lg border bg-card"
                      >
                        <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium">
                          {idx + 1}
                        </span>
                        <span className="text-sm leading-relaxed">
                          {question}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-4">
                <Button onClick={() => onOpenChange(false)} className="w-full">
                  Закрыть
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
