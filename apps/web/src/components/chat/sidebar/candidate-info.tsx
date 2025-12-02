interface CandidateInfoProps {
  candidateName: string | null;
  chatId: string;
}

export function CandidateInfo({ candidateName, chatId }: CandidateInfoProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">О кандидате</h2>
      <div className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Имя</p>
          <p className="text-sm font-medium">{candidateName ?? "Не указано"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Telegram</p>
          <p className="text-sm font-medium">@{chatId}</p>
        </div>
      </div>
    </div>
  );
}
