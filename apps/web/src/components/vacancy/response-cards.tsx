"use client";

import {
  HR_SELECTION_STATUS_LABELS,
  RESPONSE_STATUS_LABELS,
} from "@selectio/db/schema";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
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

interface ResponseCardsProps {
  responses: VacancyResponse[];
  workspaceSlug: string;
}

export function ResponseCards({
  responses,
  workspaceSlug,
}: ResponseCardsProps) {
  return (
    <div className="grid gap-4 md:hidden">
      {responses.map((response) => (
        <Card key={response.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
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
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {new Date(response.createdAt).toLocaleDateString("ru-RU")}
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                {RESPONSE_STATUS_LABELS[response.status]}
              </Badge>
              {response.hrSelectionStatus && (
                <Badge variant="secondary">
                  {HR_SELECTION_STATUS_LABELS[response.hrSelectionStatus]}
                </Badge>
              )}
            </div>
            {response.experience && (
              <div>
                <h4 className="text-sm font-medium mb-1">Опыт работы</h4>
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <button
                      type="button"
                      className="text-left text-sm text-muted-foreground hover:underline cursor-pointer"
                    >
                      {response.experience.length > 120
                        ? `${response.experience.slice(0, 120)}...`
                        : response.experience}
                    </button>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80">
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Опыт работы</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {response.experience}
                      </p>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </div>
            )}
            {response.contacts && typeof response.contacts === "object" ? (
              <div>
                <h4 className="text-sm font-medium mb-2">Контакты</h4>
                <ContactInfo contacts={response.contacts} size="md" />
              </div>
            ) : null}
            <div className="pt-2 border-t">
              <ResponseActions
                responseId={response.id}
                resumeUrl={response.resumeUrl}
                candidateName={response.candidateName}
                telegramUsername={response.telegramUsername}
                phone={response.phone}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
