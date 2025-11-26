"use client";

import {
  HR_SELECTION_STATUS_LABELS,
  RESPONSE_STATUS_LABELS,
} from "@selectio/db/schema";
import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@selectio/ui";
import { useRealtimeTaskTrigger } from "@trigger.dev/react-hooks";
import { ExternalLink, Sparkles, User } from "lucide-react";
import { useEffect, useState } from "react";
import { createTriggerPublicToken } from "~/actions/trigger";
import type { VacancyResponse } from "~/types/vacancy";
import { ContactInfo } from "./contact-info";

interface ResponseTableProps {
  responses: VacancyResponse[];
}

export function ResponseTable({ responses }: ResponseTableProps) {
  const [accessToken, setAccessToken] = useState<string | undefined>();

  useEffect(() => {
    createTriggerPublicToken("screen-response").then((result) => {
      if (result.success) {
        setAccessToken(result.token);
      }
    });
  }, []);

  const { submit, isLoading } = useRealtimeTaskTrigger("screen-response", {
    accessToken,
  });

  const handleScreenResponse = (responseId: string) => {
    submit({ responseId });
  };

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Кандидат</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>Отбор HR</TableHead>
            <TableHead>Контакты</TableHead>
            <TableHead>Дата отклика</TableHead>
            <TableHead className="text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {responses.map((response) => (
            <TableRow key={response.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">
                      {response.candidateName || "Без имени"}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="whitespace-nowrap">
                  {RESPONSE_STATUS_LABELS[response.status]}
                </Badge>
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
                  {new Date(response.createdAt).toLocaleDateString("ru-RU", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleScreenResponse(response.id)}
                    disabled={isLoading}
                  >
                    <Sparkles className="h-4 w-4 mr-1" />
                    {isLoading ? "Оценка..." : "Оценить"}
                  </Button>
                  <a
                    href={response.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
