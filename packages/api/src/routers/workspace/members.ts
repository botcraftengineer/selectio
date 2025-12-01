import { workspaceRepository } from "@selectio/db";
import {
  addUserToWorkspaceSchema,
  updateUserRoleSchema,
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

      const member = await workspaceRepository.addUser(
        input.workspaceId,
        input.userId,
        input.role,
      );

      return member;
    }),

  // Удалить пользователя из workspace
  removeUser: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().uuid(),
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
