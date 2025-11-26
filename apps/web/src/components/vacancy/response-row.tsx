"use client";

import {
  HR_SELECTION_STATUS_LABELS,
  RESPONSE_STATUS_LABELS,
} from "@selectio/db/schema";
import { Badge, Button, Checkbox, TableCell, TableRow } from "@selectio/ui";
import { ExternalLink, User } from "lucide-react";
import type { VacancyResponse } from "~/types/vacancy";
import { ContactInfo } from "./contact-info";
import { ScreenResponseButton } from "./screen-response-button";

interface ResponseRowProps {
  response: VacancyResponse;
  accessToken: string | undefined;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
}

export function ResponseRow({
  response,
  accessToken,
  isSelected = false,
  onSelect,
}: ResponseRowProps) {
  const canSelect = response.status === "NEW";

  return (
    <TableRow>
      <TableCell>
        {canSelect && onSelect ? (
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
        {response.screening ? (
          <div className="flex items-center gap-2">
            <span
              className={`text-lg font-bold ${
                response.screening.score >= 4
                  ? "text-green-600"
                  : response.screening.score >= 3
                    ? "text-yellow-600"
                    : "text-red-600"
              }`}
            >
              {response.screening.score}/5
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
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
          {response.status === "NEW" && accessToken && (
            <ScreenResponseButton
              responseId={response.id}
              accessToken={accessToken}
              candidateName={response.candidateName || undefined}
            />
          )}
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
  );
}
