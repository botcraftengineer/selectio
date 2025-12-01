import { workspaceRepository } from "@selectio/db";
import {
  addUserToWorkspaceSchema,
  createWorkspaceSchema,
  updateUserRoleSchema,
  updateWorkspaceSchema,
} from "@selectio/validators";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";

export const workspaceRouter = createTRPCRouter({
  // Получить все workspaces пользователя
  list: protectedProcedure.query(async ({ ctx }) => {
    const workspaces = await workspaceRepository.findByUserId(
      ctx.session.user.id,
    );
    return workspaces;
  }),

  // Получить workspace по ID
  byId: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .query(async ({ input, ctx }) => {
      const workspace = await workspaceRepository.findById(input.id);

      if (!workspace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace не найден",
        });
      }

      // Проверка доступа
      const access = await workspaceRepository.checkAccess(
        input.id,
        ctx.session.user.id,
      );

      if (!access) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Нет доступа к workspace",
        });
      }

      return workspace;
    }),

  // Получить workspace по slug
  bySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input, ctx }) => {
      const workspace = await workspaceRepository.findBySlug(input.slug);

      if (!workspace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace не найден",
        });
      }

      // Проверка доступа
      const access = await workspaceRepository.checkAccess(
        workspace.id,
        ctx.session.user.id,
      );

      if (!access) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Нет доступа к workspace",
        });
      }

      return { workspace, role: access.role };
    }),

  // Создать workspace
  create: protectedProcedure
    .input(createWorkspaceSchema)
    .mutation(async ({ input, ctx }) => {
      // Проверка уникальности slug
      const existing = await workspaceRepository.findBySlug(input.slug);
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Workspace с таким slug уже существует",
        });
      }

      // Создать workspace
      const workspace = await workspaceRepository.create(input);

      if (!workspace) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Не удалось создать workspace",
        });
      }

      // Добавить создателя как owner
      await workspaceRepository.addUser(
        workspace.id,
        ctx.session.user.id,
        "owner",
      );

      return workspace;
    }),

  // Обновить workspace
  update: protectedProcedure
    .input(
      z.object({
        id: z.uuid(),
        data: updateWorkspaceSchema,
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Проверка доступа
      const access = await workspaceRepository.checkAccess(
        input.id,
        ctx.session.user.id,
      );

      if (!access || (access.role !== "owner" && access.role !== "admin")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Недостаточно прав для обновления workspace",
        });
      }

      // Проверка уникальности slug
      if (input.data.slug) {
        const existing = await workspaceRepository.findBySlug(input.data.slug);
        if (existing && existing.id !== input.id) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Workspace с таким slug уже существует",
          });
        }
      }

      const updated = await workspaceRepository.update(input.id, input.data);
      return updated;
    }),

  // Удалить workspace
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      // Проверка доступа
      const access = await workspaceRepository.checkAccess(
        input.id,
        ctx.session.user.id,
      );

      if (!access || access.role !== "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Только owner может удалить workspace",
        });
      }

      await workspaceRepository.delete(input.id);
      return { success: true };
    }),

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
});
