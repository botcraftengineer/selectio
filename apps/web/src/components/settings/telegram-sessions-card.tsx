"use client";

import { Badge, Button, Card } from "@selectio/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Plus, Trash2, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "~/trpc/react";
import { IntegrationIcon } from "../ui/integration-icon";
import { TelegramAuthDialog } from "./telegram-auth";

export function TelegramSessionsCard({ workspaceId }: { workspaceId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: sessions, isLoading } = useQuery(
    trpc.telegram.getSessions.queryOptions({ workspaceId }),
  );

  const deleteMutation = useMutation(
    trpc.telegram.deleteSession.mutationOptions({
      onSuccess: () => {
        toast.success("Сессия удалена");
        queryClient.invalidateQueries({
          queryKey: trpc.telegram.getSessions.queryKey({ workspaceId }),
        });
      },
      onError: (err) => {
        toast.error(err.message || "Не удалось удалить сессию");
      },
    }),
  );

  const handleDelete = (sessionId: string) => {
    if (confirm("Вы уверены, что хотите удалить эту сессию?")) {
      deleteMutation.mutate({ sessionId, workspaceId });
    }
  };

  return (
    <>
      {isLoading ? (
        <Card className="p-4 sm:p-6">
          <div className="text-sm text-muted-foreground">Загрузка...</div>
        </Card>
      ) : sessions && sessions.length > 0 ? (
        sessions.map((session) => (
          <Card key={session.id} className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                <div className="rounded-lg bg-muted p-2 sm:p-3 shrink-0">
                  <IntegrationIcon
                    type="telegram"
                    className="h-4 w-4 sm:h-5 sm:w-5"
                  />
                </div>
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <h3 className="font-semibold text-sm sm:text-base truncate">
                      {session.userInfo?.firstName} {session.userInfo?.lastName}
                    </h3>
                    {session.isActive ? (
                      <Badge variant="default" className="gap-1 w-fit">
                        <CheckCircle2 className="h-3 w-3" />
                        Активна
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1 w-fit">
                        <XCircle className="h-3 w-3" />
                        Неактивна
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">
                    {session.phone}
                    {session.userInfo?.username &&
                      ` • @${session.userInfo.username}`}
                  </p>
                  {session.lastUsedAt && (
                    <p className="text-xs text-muted-foreground">
                      Последнее использование:{" "}
                      {new Date(session.lastUsedAt).toLocaleString("ru-RU")}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 sm:shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(session.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="ml-2 hidden sm:inline">Удалить</span>
                </Button>
              </div>
            </div>
          </Card>
        ))
      ) : (
        <Card className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
              <div className="rounded-lg bg-muted p-2 sm:p-3 shrink-0">
                <IntegrationIcon
                  type="telegram"
                  className="h-4 w-4 sm:h-5 sm:w-5"
                />
              </div>
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <h3 className="font-semibold text-sm sm:text-base">
                    Telegram аккаунт
                  </h3>
                  <Badge variant="outline" className="w-fit">
                    Не подключен
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Подключите Telegram аккаунт для автоматизации работы с
                  кандидатами
                </p>
              </div>
            </div>
            <div className="flex gap-2 sm:shrink-0">
              <Button
                size="sm"
                onClick={() => setDialogOpen(true)}
                className="w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                Подключить
              </Button>
            </div>
          </div>
        </Card>
      )}

      <TelegramAuthDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        workspaceId={workspaceId}
      />
    </>
  );
}
