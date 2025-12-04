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
  // Добавить пользователя в workspace
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
          message: "Недостаточно прав для добавления пользователей",
        });
      }

      // Находим пользователя по email
      const user = await workspaceRepository.findUserByEmail(input.email);
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Пользователь с таким email не найден",
        });
      }
      const userId = user.id;

      // Проверка, не является ли пользователь уже участником
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

      const member = await workspaceRepository.addUser(
        input.workspaceId,
        userId,
        input.role,
      );

      // Получаем данные workspace и создаем invite link
      const workspace = await workspaceRepository.findById(input.workspaceId);
      const invite = await workspaceRepository.createInviteLink(
        input.workspaceId,
        ctx.session.user.id,
        input.role,
      );

      if (workspace && invite) {
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

      return member;
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
      // Проверка доступа
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
};
