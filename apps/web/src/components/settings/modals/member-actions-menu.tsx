"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@selectio/ui";
import { IconMail, IconTrash, IconUserMinus, IconX } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "~/trpc/react";

interface Member {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "member";
  status: "active" | "invited";
}

type DialogType = "remove" | "cancel-invite" | null;

export function useMemberActionsMenu({
  member,
  workspaceId,
  canManage,
  isCurrentUser,
}: {
  member: Member;
  workspaceId: string;
  canManage: boolean;
  isCurrentUser: boolean;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [dialogType, setDialogType] = useState<DialogType>(null);

  return {
    setShowMemberActionsMenu: setShowMenu,
    MemberActionsMenu: () => (
      <>
        <MemberActionsDropdown
          open={showMenu}
          onOpenChange={setShowMenu}
          member={member}
          workspaceId={workspaceId}
          canManage={canManage}
          isCurrentUser={isCurrentUser}
          onAction={setDialogType}
        />
        <RemoveMemberDialog
          open={dialogType === "remove"}
          onOpenChange={(open) => setDialogType(open ? "remove" : null)}
          member={member}
          workspaceId={workspaceId}
        />
        <CancelInviteDialog
          open={dialogType === "cancel-invite"}
          onOpenChange={(open) => setDialogType(open ? "cancel-invite" : null)}
          member={member}
          workspaceId={workspaceId}
        />
      </>
    ),
  };
}

function MemberActionsDropdown({
  open,
  onOpenChange,
  member,
  workspaceId,
  canManage,
  isCurrentUser,
  onAction,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: Member;
  workspaceId: string;
  canManage: boolean;
  isCurrentUser: boolean;
  onAction: (action: DialogType) => void;
  children?: ReactNode;
}) {
  const trpc = useTRPC();

  const resendInvite = useMutation(
    trpc.workspace.resendInvite.mutationOptions({
      onSuccess: () => {
        toast.success("Приглашение отправлено повторно");
        onOpenChange(false);
      },
      onError: (err) => {
        toast.error(err.message || "Не удалось отправить приглашение");
      },
    }),
  );

  const handleResendInvite = () => {
    resendInvite.mutate({
      workspaceId,
      email: member.email,
      role: member.role,
    });
  };

  const handleRemove = () => {
    onOpenChange(false);
    onAction("remove");
  };

  const handleCancelInvite = () => {
    onOpenChange(false);
    onAction("cancel-invite");
  };

  const isInvited = member.status === "invited";

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {isInvited && canManage && (
          <>
            <DropdownMenuItem
              onClick={handleResendInvite}
              disabled={resendInvite.isPending}
            >
              <IconMail className="mr-2 h-4 w-4" />
              Отправить повторно
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCancelInvite}>
              <IconX className="mr-2 h-4 w-4" />
              Отменить приглашение
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {isCurrentUser && !isInvited && (
          <DropdownMenuItem onClick={handleRemove}>
            <IconUserMinus className="mr-2 h-4 w-4" />
            Покинуть workspace
          </DropdownMenuItem>
        )}

        {canManage && !isCurrentUser && (
          <DropdownMenuItem
            onClick={handleRemove}
            className="text-destructive focus:text-destructive"
          >
            <IconTrash className="mr-2 h-4 w-4" />
            Удалить участника
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RemoveMemberDialog({
  open,
  onOpenChange,
  member,
  workspaceId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: Member;
  workspaceId: string;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const removeUser = useMutation(
    trpc.workspace.removeUser.mutationOptions({
      onSuccess: () => {
        toast.success(`${member.name} удален из workspace`);
        onOpenChange(false);
        queryClient.invalidateQueries(trpc.workspace.members.pathFilter());
      },
      onError: (err) => {
        toast.error(err.message || "Не удалось удалить участника");
      },
    }),
  );

  const handleRemove = () => {
    removeUser.mutate({
      workspaceId,
      userId: member.id,
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Удалить участника?</AlertDialogTitle>
          <AlertDialogDescription>
            Вы уверены, что хотите удалить{" "}
            <span className="font-medium">{member.name}</span> из workspace? Это
            действие нельзя отменить.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={removeUser.isPending}>
            Отмена
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRemove}
            disabled={removeUser.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {removeUser.isPending ? "Удаление..." : "Удалить"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function CancelInviteDialog({
  open,
  onOpenChange,
  member,
  workspaceId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: Member;
  workspaceId: string;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const cancelInvite = useMutation(
    trpc.workspace.cancelInvite.mutationOptions({
      onSuccess: () => {
        toast.success("Приглашение отменено");
        onOpenChange(false);
        queryClient.invalidateQueries(trpc.workspace.members.pathFilter());
      },
      onError: (err) => {
        toast.error(err.message || "Не удалось отменить приглашение");
      },
    }),
  );

  const handleCancel = () => {
    cancelInvite.mutate({
      workspaceId,
      email: member.email,
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Отменить приглашение?</AlertDialogTitle>
          <AlertDialogDescription>
            Вы уверены, что хотите отменить приглашение для{" "}
            <span className="font-medium">{member.email}</span>?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={cancelInvite.isPending}>
            Отмена
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancel}
            disabled={cancelInvite.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {cancelInvite.isPending ? "Отмена..." : "Отменить приглашение"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
