"use client";

import { Badge, Button, Card } from "@selectio/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Edit, Plus, Trash2, XCircle } from "lucide-react";
import type { AVAILABLE_INTEGRATIONS } from "~/lib/integrations";
import { useTRPC } from "~/trpc/react";
import { IntegrationIcon } from "../ui/integration-icon";

interface IntegrationCardProps {
  availableIntegration: (typeof AVAILABLE_INTEGRATIONS)[number];
  integration?: {
    id: string;
    type: string;
    name: string;
    isActive: boolean;
    lastUsedAt: Date | null;
    hasCookies: boolean;
    hasCredentials: boolean;
    email?: string | null;
  };
  onCreate: () => void;
  onEdit: () => void;
  workspaceId: string;
  userRole?: string;
}

export function IntegrationCard({
  availableIntegration,
  integration,
  onCreate,
  onEdit,
  workspaceId,
  userRole,
}: IntegrationCardProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const canEdit = userRole === "owner" || userRole === "admin";

  const deleteMutation = useMutation(
    trpc.integration.delete.mutationOptions({
      onSuccess: () => {
        // Инвалидируем все запросы integration.list
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey[0] === "integration" && query.queryKey[1] === "list",
        });
      },
    }),
  );

  const isActive = integration?.isActive === true;
  const isConnected = !!integration;

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
          <div className="rounded-lg bg-muted p-2 sm:p-3 shrink-0">
            <IntegrationIcon
              type={availableIntegration.type as "hh" | "telegram"}
              className="h-4 w-4 sm:h-5 sm:w-5"
            />
          </div>
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <h3 className="font-semibold text-sm sm:text-base">
                {availableIntegration.name}
              </h3>
              {isConnected ? (
                isActive ? (
                  <Badge variant="default" className="gap-1 w-fit">
                    <CheckCircle2 className="h-3 w-3" />
                    Активна
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1 w-fit">
                    <XCircle className="h-3 w-3" />
                    Неактивна
                  </Badge>
                )
              ) : (
                <Badge variant="outline" className="w-fit">
                  Не подключена
                </Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {availableIntegration.description}
            </p>
            {integration?.email && (
              <p className="text-xs text-muted-foreground truncate">
                Email: {integration.email}
              </p>
            )}
            {integration?.lastUsedAt && (
              <p className="text-xs text-muted-foreground">
                Последнее использование:{" "}
                {new Date(integration.lastUsedAt).toLocaleString("ru-RU")}
              </p>
            )}
            {isConnected && (
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {integration.hasCredentials && (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Credentials
                  </span>
                )}
                {integration.hasCookies && (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Cookies
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2 sm:shrink-0">
          {canEdit ? (
            isConnected ? (
              <>
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Edit className="h-4 w-4" />
                  <span className="ml-2 hidden sm:inline">Изменить</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    deleteMutation.mutate({
                      type: availableIntegration.type,
                      workspaceId,
                    })
                  }
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="ml-2 hidden sm:inline">Удалить</span>
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={onCreate} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Подключить
              </Button>
            )
          ) : (
            <Badge variant="secondary" className="whitespace-nowrap">
              Только для просмотра
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}
