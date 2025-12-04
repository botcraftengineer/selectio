import { workspaceRepository } from "@selectio/db";
import { workspaceIdSchema } from "@selectio/validators";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure } from "../../trpc";

export const workspaceQueries = {
  // Получить все workspaces пользователя
  list: protectedProcedure.query(async ({ ctx }) => {
    const workspaces = await workspaceRepository.findByUserId(
      ctx.session.user.id,
    );
    return workspaces;
  }),

  // Получить workspace по ID
  byId: protectedProcedure
    .input(z.object({ id: workspaceIdSchema }))
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

  // Получить участников workspace
  members: protectedProcedure
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

      const members = await workspaceRepository.getMembers(input.workspaceId);
      return members;
    }),

  // Получить приглашения workspace
  invites: protectedProcedure
    .input(z.object({ workspaceId: workspaceIdSchema }))
    .query(async ({ input, ctx }) => {
      // Проверка доступа
      const access = await workspaceRepository.checkAccess(
        input.workspaceId,
        ctx.session.user.id,
      );

      if (!access || (access.role !== "owner" && access.role !== "admin")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Недостаточно прав для просмотра приглашений",
        });
      }

      const invites = await workspaceRepository.getInvites(input.workspaceId);
      return invites;
    }),
};
