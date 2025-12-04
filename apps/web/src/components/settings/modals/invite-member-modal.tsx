"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@selectio/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { useTRPC } from "~/trpc/react";

export function useInviteMemberModal(workspaceId: string) {
  const [showModal, setShowModal] = useState(false);

  return {
    setShowInviteMemberModal: setShowModal,
    InviteMemberModal: () => (
      <InviteMemberModalContent
        open={showModal}
        onOpenChange={setShowModal}
        workspaceId={workspaceId}
      />
    ),
  };
}

function InviteMemberModalContent({
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
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"owner" | "admin" | "member">("member");

  const addUser = useMutation(
    trpc.workspace.addUser.mutationOptions({
      onSuccess: () => {
        toast.success("Приглашение отправлено");
        setEmail("");
        setRole("member");
        onOpenChange(false);
        queryClient.invalidateQueries(trpc.workspace.members.pathFilter());
      },
      onError: (err) => {
        toast.error(err.message || "Не удалось отправить приглашение");
      },
    }),
  );

  const handleInvite = () => {
    const emailTrimmed = email.trim();

    const emailSchema = z.email("Введите корректный email");
    const result = emailSchema.safeParse(emailTrimmed);

    if (!result.success) {
      toast.error(
        result.error.issues[0]?.message || "Введите корректный email",
      );
      return;
    }

    addUser.mutate({
      workspaceId,
      email: result.data,
      role,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Пригласить участника</DialogTitle>
          <DialogDescription>Отправьте приглашение по email</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleInvite();
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Пользователь получит приглашение на указанный email
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role">Роль</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as "owner" | "admin" | "member")}
            >
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">Владелец</SelectItem>
                <SelectItem value="admin">Администратор</SelectItem>
                <SelectItem value="member">Участник</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={addUser.isPending}
          >
            Отмена
          </Button>
          <Button onClick={handleInvite} disabled={addUser.isPending}>
            {addUser.isPending ? "Отправка..." : "Отправить приглашение"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
