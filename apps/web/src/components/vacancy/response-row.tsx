"use client";

import {
  HR_SELECTION_STATUS_LABELS,
  RESPONSE_STATUS_LABELS,
} from "@selectio/db/schema";
import {
  Badge,
  Checkbox,
  TableCell,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@selectio/ui";
import { Send, User } from "lucide-react";
import { ResponseActions } from "~/components/response";
import type { VacancyResponse } from "~/types/vacancy";
import { ChatIndicator } from "./chat-indicator";
import { ContactInfo } from "./contact-info";
import { ScreenResponseButton } from "./screen-response-button";
import { ScreeningHoverCard } from "./screening-hover-card";

interface ResponseRowProps {
  response: VacancyResponse;
  workspaceSlug: string;
  accessToken: string | undefined;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
}

export function ResponseRow({
  response,
  workspaceSlug,
  accessToken,
  isSelected = false,
  onSelect,
}: ResponseRowProps) {
  return (
    <TableRow>
      <TableCell>
        {onSelect ? (
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onSelect(response.id)}
          />
        ) : (
          <div className="w-4" />
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-medium flex items-center gap-2">
              {response.candidateName || "Без имени"}
              {response.welcomeSentAt && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="rounded-full bg-green-100 p-1">
                        <Send className="h-3 w-3 text-green-600" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Приветствие отправлено</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(response.welcomeSentAt).toLocaleString(
                          "ru-RU",
                        )}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {response.conversation && (
                <ChatIndicator
                  messageCount={response.conversation.messages.length}
                  conversationId={response.conversation.id}
                  workspaceSlug={workspaceSlug}
                />
              )}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge
          variant={
            response.status === "NEW"
              ? "default"
              : response.status === "EVALUATED"
                ? "secondary"
                : response.status === "COMPLETED"
                  ? "default"
                  : response.status === "SKIPPED"
                    ? "destructive"
                    : "outline"
          }
          className="whitespace-nowrap"
        >
          {RESPONSE_STATUS_LABELS[response.status]}
        </Badge>
      </TableCell>
      <TableCell>
        {response.screening ? (
          <ScreeningHoverCard screening={response.screening} />
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            Не оценен
          </Badge>
        )}
      </TableCell>
      <TableCell>
        {response.telegramInterviewScoring ? (
          <ScreeningHoverCard screening={response.telegramInterviewScoring} />
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            Не оценен
          </Badge>
        )}
      </TableCell>
      <TableCell>
        {response.hrSelectionStatus ? (
          <Badge variant="secondary" className="whitespace-nowrap">
            {HR_SELECTION_STATUS_LABELS[response.hrSelectionStatus]}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </TableCell>
      <TableCell>
        <ContactInfo contacts={response.contacts} size="sm" />
      </TableCell>
      <TableCell>
        <div className="text-sm text-muted-foreground">
          {response.respondedAt
            ? new Date(response.respondedAt).toLocaleDateString("ru-RU", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })
            : "—"}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          {response.status === "NEW" && accessToken && (
            <ScreenResponseButton
              responseId={response.id}
              accessToken={accessToken}
              candidateName={response.candidateName || undefined}
            />
          )}
          <ResponseActions
            responseId={response.id}
            resumeUrl={response.resumeUrl}
            candidateName={response.candidateName}
            telegramUsername={response.telegramUsername}
            phone={response.phone}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}
