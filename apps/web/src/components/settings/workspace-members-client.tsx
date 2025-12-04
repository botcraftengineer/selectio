"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@selectio/ui";
import {
  IconDots,
  IconLink,
  IconSearch,
  IconUserPlus,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useInviteLinkModal } from "~/components/settings/modals/invite-link-modal";
import { useInviteMemberModal } from "~/components/settings/modals/invite-member-modal";
import { useMemberActionsMenu } from "~/components/settings/modals/member-actions-menu";
import { useTRPC } from "~/trpc/react";

type MemberRole = "owner" | "admin" | "member";

interface WorkspaceMember {
  userId: string;
  workspaceId: string;
  role: MemberRole;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function MembersLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-9 w-9" />
        </div>
      </div>

      {/* Filters Skeleton */}
      <div className="flex gap-3">
        <Skeleton className="h-10 w-[140px]" />
        <Skeleton className="h-10 w-full max-w-sm ml-auto" />
      </div>

      {/* Table Skeleton */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Имя</TableHead>
              <TableHead>Роль</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }, (_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton loader, order never changes
              <TableRow key={`skeleton-row-${i}`}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Skeleton className="h-10 w-[120px]" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-8 w-8" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Stats Skeleton */}
      <Skeleton className="h-4 w-48" />
    </div>
  );
}

export function WorkspaceMembersClient({
  workspaceId,
  currentUserId,
}: {
  workspaceId: string;
  currentUserId: string;
}) {
  const trpc = useTRPC();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<MemberRole | "all">("all");

  const { InviteMemberModal, setShowInviteMemberModal } =
    useInviteMemberModal(workspaceId);
  const { InviteLinkModal, setShowInviteLinkModal } =
    useInviteLinkModal(workspaceId);

  // Получение участников
  const { data: members, isLoading } = useQuery(
    trpc.workspace.members.queryOptions({ workspaceId }),
  );

  // Определение роли текущего пользователя
  const currentUserRole = useMemo(() => {
    return members?.find((m: WorkspaceMember) => m.userId === currentUserId)
      ?.role;
  }, [members, currentUserId]);

  const isOwner = currentUserRole === "owner";
  const isAdmin = currentUserRole === "admin";
  const canManageMembers = isOwner || isAdmin;

  // Фильтрация участников
  const filteredMembers = useMemo(() => {
    if (!members) return [];

    return members.filter((member: WorkspaceMember) => {
      const matchesSearch =
        member.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.user.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === "all" || member.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [members, searchQuery, roleFilter]);

  if (isLoading) {
    return <MembersLoadingSkeleton />;
  }

  return (
    <>
      <InviteMemberModal />
      <InviteLinkModal />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Участники</h2>
            <p className="text-sm text-muted-foreground">
              Управляйте участниками workspace
            </p>
          </div>
          {canManageMembers && (
            <div className="flex gap-2">
              <Button
                onClick={() => setShowInviteMemberModal(true)}
                className="gap-2"
              >
                <IconUserPlus className="h-4 w-4" />
                Пригласить участника
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowInviteLinkModal(true)}
                className="gap-2"
              >
                <IconLink className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <Select
            value={roleFilter}
            onValueChange={(v) => setRoleFilter(v as MemberRole | "all")}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Роль" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все роли</SelectItem>
              <SelectItem value="owner">Владелец</SelectItem>
              <SelectItem value="admin">Администратор</SelectItem>
              <SelectItem value="member">Участник</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative flex-1 max-w-sm ml-auto">
            <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Поиск по имени или email"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Members Table */}
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Имя</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Участники не найдены
                  </TableCell>
                </TableRow>
              ) : (
                filteredMembers.map((member: WorkspaceMember) => (
                  <MemberRow
                    key={member.userId}
                    member={member}
                    workspaceId={workspaceId}
                    currentUserId={currentUserId}
                    canManageMembers={canManageMembers}
                    isOwner={isOwner}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Stats */}
        <div className="text-sm text-muted-foreground">
          Показано {filteredMembers.length} из {members?.length || 0} участников
        </div>
      </div>
    </>
  );
}

function MemberRow({
  member,
  workspaceId,
  currentUserId,
  canManageMembers,
  isOwner,
}: {
  member: WorkspaceMember;
  workspaceId: string;
  currentUserId: string;
  canManageMembers: boolean;
  isOwner: boolean;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const isCurrentUser = member.userId === currentUserId;

  const { MemberActionsMenu, setShowMemberActionsMenu } = useMemberActionsMenu({
    member: {
      id: member.userId,
      name: member.user.name,
      email: member.user.email,
      role: member.role,
      status: "active",
    },
    workspaceId,
    canManage: canManageMembers,
    isCurrentUser,
  });

  const initials = getInitials(member.user.name);

  const updateRole = useMutation(
    trpc.workspace.updateUserRole.mutationOptions({
      onSuccess: () => {
        toast.success("Роль обновлена");
        queryClient.invalidateQueries(trpc.workspace.members.pathFilter());
      },
      onError: (err) => {
        toast.error(err.message || "Не удалось обновить роль");
      },
    }),
  );

  const handleRoleChange = (newRole: MemberRole) => {
    updateRole.mutate({
      workspaceId,
      userId: member.userId,
      role: newRole,
    });
  };

  const canChangeRole = isOwner && !isCurrentUser;

  return (
    <>
      <MemberActionsMenu />
      <TableRow>
        <TableCell>
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={member.user.image || ""}
                alt={member.user.name}
              />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{member.user.name}</div>
              <div className="text-sm text-muted-foreground">
                {member.user.email}
              </div>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <Select
            value={member.role}
            onValueChange={handleRoleChange}
            disabled={!canChangeRole || updateRole.isPending}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="owner">Владелец</SelectItem>
              <SelectItem value="admin">Администратор</SelectItem>
              <SelectItem value="member">Участник</SelectItem>
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell>
          {(canManageMembers || isCurrentUser) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMemberActionsMenu(true)}
              className="h-8 w-8 p-0"
            >
              <IconDots className="h-4 w-4" />
            </Button>
          )}
        </TableCell>
      </TableRow>
    </>
  );
}
