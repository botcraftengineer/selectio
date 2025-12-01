import { workspaceRepository } from "@selectio/db";
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
} from "@selectio/validators";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure } from "../../trpc";

export const workspaceMutations = {
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
};
