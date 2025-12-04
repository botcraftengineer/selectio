"use client";

import { Badge, Button, Card } from "@selectio/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Edit, Globe, Plus, Trash2, XCircle } from "lucide-react";
import type { AVAILABLE_INTEGRATIONS } from "~/lib/integrations";
import { useTRPC } from "~/trpc/react";

interface Integration {
  id: string;
  type: string;
  name: string;
  isActive: string;
  lastUsedAt: Date | null;
  hasCookies: boolean;
  hasCredentials: boolean;
  email?: string | null;
}

interface IntegrationCardProps {
  availableIntegration: (typeof AVAILABLE_INTEGRATIONS)[number];
  integration?: Integration;
  onEdit: () => void;
  workspaceId: string;
  userRole?: string;
}

const INTEGRATION_ICONS: Record<string, React.ReactNode> = {
  hh: <Globe className="h-5 w-5" />,
};

export function IntegrationCard({
  availableIntegration,
  integration,
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

  const isActive = integration?.isActive === "true";
  const isConnected = !!integration;

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-muted p-3">
            {INTEGRATION_ICONS[availableIntegration.type] || (
              <Globe className="h-5 w-5" />
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{availableIntegration.name}</h3>
              {isConnected ? (
                isActive ? (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Активна
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <XCircle className="h-3 w-3" />
                    Неактивна
                  </Badge>
                )
              ) : (
                <Badge variant="outline">Не подключена</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {availableIntegration.description}
            </p>
            {integration?.email && (
              <p className="text-xs text-muted-foreground">
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
              <div className="flex gap-2 text-xs text-muted-foreground">
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
        <div className="flex gap-2">
          {canEdit ? (
            isConnected ? (
              <>
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Edit className="h-4 w-4" />
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
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={onEdit}>
                <Plus className="h-4 w-4 mr-2" />
                Подключить
              </Button>
            )
          ) : (
            <Badge variant="secondary">Только для просмотра</Badge>
          )}
        </div>
      </div>
    </Card>
  );
}
