"use client";

import {
  Button,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@selectio/ui";
import { ExternalLink, User } from "lucide-react";
import type { VacancyResponse } from "~/types/vacancy";
import { ContactInfo } from "./contact-info";

interface ResponseTableProps {
  responses: VacancyResponse[];
}

export function ResponseTable({ responses }: ResponseTableProps) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Кандидат</TableHead>
            <TableHead>Опыт работы</TableHead>
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
                <div className="max-w-md">
                  {response.experience ? (
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <button
                          type="button"
                          className="text-left text-sm text-muted-foreground hover:underline cursor-pointer line-clamp-2"
                        >
                          {response.experience}
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
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Не указан
                    </span>
                  )}
                </div>
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
                <a
                  href={response.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </a>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
