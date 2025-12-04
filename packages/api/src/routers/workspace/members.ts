import { workspaceRepository } from "@selectio/db";
import { sendEmail } from "@selectio/emails";
import {
  addUserToWorkspaceSchema,
  updateUserRoleSchema,
  workspaceIdSchema,
} from "@selectio/validators";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure } from "../../trpc";

export const workspaceMembers = {
  // Пригласить пользователя в workspace (создать приглашение, не добавлять сразу)
  addUser: protectedProcedure
    .input(addUserToWorkspaceSchema)
    .mutation(async ({ input, ctx }) => {
      // Проверка доступа
      const access = await workspaceRepository.checkAccess(
        input.workspaceId,
        ctx.session.user.id,
      );

      if (!access || (access.role !== "owner" && access.role !== "admin")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Недостаточно прав для приглашения пользователей",
        });
      }

      // Находим пользователя по email
      const user = await workspaceRepository.findUserByEmail(input.email);
      const userId = user?.id || null;

      // Проверка, не является ли пользователь уже участником
      if (userId) {
        const existingMember = await workspaceRepository.checkAccess(
          input.workspaceId,
          userId,
        );

        if (existingMember) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Пользователь уже является участником workspace",
          });
        }
      }

      // Проверка, нет ли уже активного приглашения для этого email
      const existingInvite = await workspaceRepository.findInviteByEmail(
        input.workspaceId,
        input.email,
      );

      if (existingInvite) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Приглашение для этого email уже существует",
        });
      }

      // Создаём персональное приглашение (НЕ добавляем в user_workspaces)
      const invite = await workspaceRepository.createPersonalInvite(
        input.workspaceId,
        ctx.session.user.id,
        input.email,
        userId,
        input.role,
      );

      // Получаем данные workspace для email
      const workspace = await workspaceRepository.findById(input.workspaceId);

      if (workspace) {
        const { env } = await import("@selectio/config");
        const inviteLink = `${env.APP_URL}/invite/${invite.token}`;

        // Отправляем email с приглашением
        const { WorkspaceInviteEmail } = await import("@selectio/emails");

        await sendEmail({
          to: [input.email],
          subject: `Приглашение в ${workspace.name}`,
          react: WorkspaceInviteEmail({
            workspaceName: workspace.name,
            workspaceLogo: workspace.logo || undefined,
            inviterName: ctx.session.user.name || ctx.session.user.email,
            inviteLink,
            role: input.role,
          }),
        });
      }

      return invite;
    }),

  // Создать invite link
  createInviteLink: protectedProcedure
    .input(
      z.object({
        workspaceId: workspaceIdSchema,
        role: z.enum(["owner", "admin", "member"]).default("member"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Проверка доступа
      const access = await workspaceRepository.checkAccess(
        input.workspaceId,
        ctx.session.user.id,
      );

      if (!access || (access.role !== "owner" && access.role !== "admin")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Недостаточно прав для создания приглашений",
        });
      }

      const invite = await workspaceRepository.createInviteLink(
        input.workspaceId,
        ctx.session.user.id,
        input.role,
      );

      return invite;
    }),

  // Получить активный invite link
  getInviteLink: protectedProcedure
    .input(z.object({ workspaceId: workspaceIdSchema }))
    .query(async ({ input, ctx }) => {
      // Проверка доступа
      const access = await workspaceRepository.checkAccess(
        input.workspaceId,
        ctx.session.user.id,
      );

      if (!access) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Нет доступа к workspace",
        });
      }

      const invite = await workspaceRepository.getActiveInviteLink(
        input.workspaceId,
      );

      return invite;
    }),

  // Получить информацию о приглашении по токену
  getInviteByToken: protectedProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const invite = await workspaceRepository.getInviteByToken(input.token);

      if (!invite) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Приглашение не найдено",
        });
      }

      return invite;
    }),

  // Принять приглашение
  acceptInvite: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const invite = await workspaceRepository.getInviteByToken(input.token);

      if (!invite) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Приглашение не найдено",
        });
      }

      // Проверка срока действия
      if (new Date(invite.expiresAt) < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Срок действия приглашения истек",
        });
      }

      // Проверка персонального приглашения
      if (
        invite.invitedUserId &&
        invite.invitedUserId !== ctx.session.user.id
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Это приглашение предназначено для другого пользователя",
        });
      }

      // Проверка, не является ли пользователь уже участником
      const existingMember = await workspaceRepository.checkAccess(
        invite.workspaceId,
        ctx.session.user.id,
      );

      if (existingMember) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Вы уже являетесь участником этого workspace",
        });
      }

      // Добавить пользователя в workspace
      await workspaceRepository.addUser(
        invite.workspaceId,
        ctx.session.user.id,
        invite.role,
      );

      // Удалить использованное приглашение
      await workspaceRepository.deleteInviteByToken(input.token);

      return { success: true, workspace: invite.workspace };
    }),

  // Удалить пользователя из workspace
  removeUser: protectedProcedure
    .input(
      z.object({
        workspaceId: workspaceIdSchema,
        userId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Разрешить пользователю удалить себя или требовать права админа
      const isSelfRemoval = input.userId === ctx.session.user.id;

      // Проверяем, что пользователь является участником workspace
      const targetUserAccess = await workspaceRepository.checkAccess(
        input.workspaceId,
        input.userId,
      );

      if (!targetUserAccess) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Пользователь не является участником workspace",
        });
      }

      if (!isSelfRemoval) {
        // Проверка доступа для удаления других пользователей
        const access = await workspaceRepository.checkAccess(
          input.workspaceId,
          ctx.session.user.id,
        );

        if (!access || (access.role !== "owner" && access.role !== "admin")) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Недостаточно прав для удаления пользователей",
          });
        }
      }

      // Проверяем, что это не последний owner
      if (targetUserAccess.role === "owner") {
        const members = await workspaceRepository.getMembers(input.workspaceId);
        const ownerCount = members.filter((m) => m.role === "owner").length;

        if (ownerCount <= 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Невозможно удалить последнего владельца workspace. Назначьте другого владельца перед удалением.",
          });
        }
      }

      await workspaceRepository.removeUser(input.workspaceId, input.userId);
      return { success: true };
    }),

  // Обновить роль пользователя
  updateUserRole: protectedProcedure
    .input(updateUserRoleSchema)
    .mutation(async ({ input, ctx }) => {
      // Проверка доступа
      const access = await workspaceRepository.checkAccess(
        input.workspaceId,
        ctx.session.user.id,
      );

      if (!access || access.role !== "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Только owner может изменять роли",
        });
      }

      const updated = await workspaceRepository.updateUserRole(
        input.workspaceId,
        input.userId,
        input.role,
      );

      return updated;
    }),

  // Повторно отправить приглашение
  resendInvite: protectedProcedure
    .input(addUserToWorkspaceSchema)
    .mutation(async ({ input, ctx }) => {
      // Проверка доступа
      const access = await workspaceRepository.checkAccess(
        input.workspaceId,
        ctx.session.user.id,
      );

      if (!access || (access.role !== "owner" && access.role !== "admin")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Недостаточно прав для отправки приглашений",
        });
      }

      // Ищем существующее приглашение
      const existingInvite = await workspaceRepository.findInviteByEmail(
        input.workspaceId,
        input.email,
      );

      if (!existingInvite) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Приглашение не найдено",
        });
      }

      // Получаем данные workspace
      const workspace = await workspaceRepository.findById(input.workspaceId);

      if (!workspace) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Workspace не найден",
        });
      }

      const { env } = await import("@selectio/config");
      const inviteLink = `${env.APP_URL}/invite/${existingInvite.token}`;

      // Отправляем email с приглашением
      const { WorkspaceInviteEmail } = await import("@selectio/emails");

      await sendEmail({
        to: [input.email],
        subject: `Приглашение в ${workspace.name}`,
        react: WorkspaceInviteEmail({
          workspaceName: workspace.name,
          workspaceLogo: workspace.logo || undefined,
          inviterName: ctx.session.user.name || ctx.session.user.email,
          inviteLink,
          role: input.role,
        }),
      });

      return { success: true };
    }),

  // Отменить приглашение (удалить из workspace_invites)
  cancelInvite: protectedProcedure
    .input(
      z.object({
        workspaceId: workspaceIdSchema,
        email: z.string().email(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Проверка доступа
      const access = await workspaceRepository.checkAccess(
        input.workspaceId,
        ctx.session.user.id,
      );

      if (!access || (access.role !== "owner" && access.role !== "admin")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Недостаточно прав для отмены приглашений",
        });
      }

      // Ищем приглашение по email
      const invite = await workspaceRepository.findInviteByEmail(
        input.workspaceId,
        input.email,
      );

      if (!invite) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Приглашение не найдено",
        });
      }

      // Удаляем приглашение
      await workspaceRepository.cancelInviteByEmail(
        input.workspaceId,
        input.email,
      );

      return { success: true };
    }),
};
