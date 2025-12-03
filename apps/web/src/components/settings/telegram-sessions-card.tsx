"use client";

import { Button, Card, CardContent, CardHeader, CardTitle } from "@selectio/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "~/trpc/react";
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
      deleteMutation.mutate({ sessionId });
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-medium">
            Telegram аккаунты
          </CardTitle>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Добавить аккаунт
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Загрузка...</div>
          ) : sessions && sessions.length > 0 ? (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">
                        {session.userInfo?.firstName}{" "}
                        {session.userInfo?.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {session.phone}
                        {session.userInfo?.username &&
                          ` • @${session.userInfo.username}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {session.isActive ? (
                          <span className="text-green-600">Активна</span>
                        ) : (
                          <span className="text-red-600">Неактивна</span>
                        )}
                        {session.lastUsedAt &&
                          ` • Последнее использование: ${new Date(
                            session.lastUsedAt,
                          ).toLocaleDateString()}`}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(session.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-8">
              Нет подключенных аккаунтов. Добавьте первый аккаунт для работы с
              Telegram.
            </div>
          )}
        </CardContent>
      </Card>

      <TelegramAuthDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        workspaceId={workspaceId}
      />
    </>
  );
}
