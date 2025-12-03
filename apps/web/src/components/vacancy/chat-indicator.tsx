import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@selectio/ui";
import { MessageCircle } from "lucide-react";
import Link from "next/link";

interface ChatIndicatorProps {
  messageCount: number;
  conversationId: string;
  workspaceSlug: string;
}

export function ChatIndicator({
  messageCount,
  conversationId,
  workspaceSlug,
}: ChatIndicatorProps) {
  if (messageCount === 0) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={`/${workspaceSlug}/chat/${conversationId}`}
            className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 transition-colors hover:bg-blue-100"
            onClick={(e) => e.stopPropagation()}
          >
            <MessageCircle className="h-3 w-3 text-blue-600" />
            <span className="text-xs font-medium text-blue-600">
              {messageCount}
            </span>
          </Link>
        </TooltipTrigger>
        <TooltipContent>
          <p>Диалог активен</p>
          <p className="text-xs text-muted-foreground">
            Сообщений: {messageCount}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
