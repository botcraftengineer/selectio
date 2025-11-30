import { Avatar, AvatarFallback } from "@selectio/ui";
import { User } from "lucide-react";

interface ChatHeaderProps {
  candidateName: string;
  candidateEmail?: string;
  avatarUrl?: string;
}

export function ChatHeader({
  candidateName,
  candidateEmail,
  avatarUrl,
}: ChatHeaderProps) {
  const initials = candidateName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex items-center gap-3 px-4 py-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary/10 text-primary">
            {initials || <User className="h-5 w-5" />}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold truncate">{candidateName}</h1>
          {candidateEmail && (
            <p className="text-xs text-muted-foreground truncate">
              {candidateEmail}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
