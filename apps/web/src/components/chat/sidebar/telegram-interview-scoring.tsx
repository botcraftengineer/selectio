import { Progress } from "@selectio/ui";
import { Star } from "lucide-react";

interface TelegramInterviewScoringProps {
  score: number | null;
  detailedScore: number | null;
  analysis?: string | null;
}

const getScoreColor = (score: number) => {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  return "text-red-600";
};

const getProgressColor = (score: number) => {
  if (score >= 80) return "bg-green-600";
  if (score >= 60) return "bg-yellow-600";
  return "bg-red-600";
};

export function TelegramInterviewScoring({
  score,
  detailedScore,
  analysis,
}: TelegramInterviewScoringProps) {
  if (!score && !detailedScore) {
    return null;
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Telegram интервью</h2>
      <div className="space-y-3">
        {score !== null && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Общая оценка</p>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              <span className="text-2xl font-bold text-yellow-600">
                {score}
              </span>
              <span className="text-sm text-muted-foreground">из 5</span>
            </div>
          </div>
        )}

        {detailedScore !== null && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              Детальная оценка
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`text-2xl font-bold ${getScoreColor(detailedScore)}`}
              >
                {detailedScore}
              </span>
              <span className="text-sm text-muted-foreground">из 100</span>
            </div>
            <Progress
              value={detailedScore}
              indicatorClassName={getProgressColor(detailedScore)}
              className="h-2"
            />
          </div>
        )}

        {analysis && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Анализ</p>
            <div
              className="text-sm prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: analysis }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
