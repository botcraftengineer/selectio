import { Button } from "@selectio/ui";
import { Loader2, Send, Sparkles } from "lucide-react";

interface BulkActionsBarProps {
  selectedCount: number;
  isSendingWelcome: boolean;
  isProcessing: boolean;
  onSendWelcome: () => void;
  onBulkScreen: () => void;
}

export function BulkActionsBar({
  selectedCount,
  isSendingWelcome,
  isProcessing,
  onSendWelcome,
  onBulkScreen,
}: BulkActionsBarProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-b bg-muted/50 px-4 py-3">
      <p className="text-sm font-medium">Выбрано: {selectedCount}</p>
      <div className="flex gap-2">
        <Button
          onClick={onSendWelcome}
          disabled={isSendingWelcome}
          size="sm"
          variant="outline"
        >
          {isSendingWelcome ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          Отправить приветствие
        </Button>
        <Button onClick={onBulkScreen} disabled={isProcessing} size="sm">
          {isProcessing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          Оценить выбранные
        </Button>
      </div>
    </div>
  );
}
