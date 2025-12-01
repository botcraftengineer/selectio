"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Skeleton,
} from "@selectio/ui";
import { IconCheck, IconCopy, IconRefresh } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "~/trpc/react";

export function useInviteLinkModal(workspaceId: string) {
  const [showModal, setShowModal] = useState(false);

  return {
    setShowInviteLinkModal: setShowModal,
    InviteLinkModal: () => (
      <InviteLinkModalContent
        open={showModal}
        onOpenChange={setShowModal}
        workspaceId={workspaceId}
      />
    ),
  };
}

function InviteLinkModalContent({
  open,
  onOpenChange,
  workspaceId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  // Получение существующей ссылки
  const { data: invite, isLoading } = useQuery(
    (trpc.workspace as any).getInviteLink.queryOptions({ workspaceId }),
  );

  // Создание новой ссылки
  const createInvite = useMutation(
    (trpc.workspace as any).createInviteLink.mutationOptions({
      onSuccess: () => {
        toast.success("Ссылка создана");
        queryClient.invalidateQueries(
          (trpc.workspace as any).getInviteLink.pathFilter(),
        );
      },
      onError: (err: Error) => {
        toast.error(err.message || "Не удалось создать ссылку");
      },
    }),
  );

  // Автоматическое создание ссылки при открытии, если её нет
  useEffect(() => {
    if (open && !isLoading && !invite && !createInvite.isPending) {
      createInvite.mutate({ workspaceId, role: "member" });
    }
  }, [open, isLoading, invite, createInvite, workspaceId]);

  const inviteLink =
    invite && "token" in invite
      ? `${window.location.origin}/invite/${invite.token}`
      : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success("Ссылка скопирована");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Не удалось скопировать ссылку");
    }
  };

  const handleRegenerate = () => {
    createInvite.mutate({ workspaceId, role: "member" });
  };

  const formatExpiryDate = (date: Date) => {
    return new Date(date).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Ссылка для приглашения</DialogTitle>
          <DialogDescription>
            Поделитесь этой ссылкой с людьми, которых хотите пригласить в
            workspace
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {isLoading || createInvite.isPending ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-4 w-64" />
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <Input value={inviteLink} readOnly className="flex-1" />
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  className="gap-2"
                  disabled={!inviteLink}
                >
                  {copied ? (
                    <>
                      <IconCheck className="h-4 w-4" />
                      Скопировано
                    </>
                  ) : (
                    <>
                      <IconCopy className="h-4 w-4" />
                      Копировать
                    </>
                  )}
                </Button>
              </div>
              {invite && "expiresAt" in invite && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Ссылка действительна до{" "}
                    {formatExpiryDate(invite.expiresAt as Date)}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRegenerate}
                    className="gap-2"
                    disabled={createInvite.isPending}
                  >
                    <IconRefresh className="h-4 w-4" />
                    Создать новую ссылку
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
