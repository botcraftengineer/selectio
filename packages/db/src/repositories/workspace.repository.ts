import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "../client";
import { userWorkspace, workspace } from "../schema";

export class WorkspaceRepository {
  // Создать workspace
  async create(data: {
    name: string;
    slug: string;
    description?: string;
    website?: string;
    logo?: string;
  }) {
    const id = `ws_${nanoid()}`;
    const [newWorkspace] = await db
      .insert(workspace)
      .values({ ...data, id })
      .returning();
    return newWorkspace;
  }

  // Получить workspace по ID
  async findById(id: string) {
    return db.query.workspace.findFirst({
      where: eq(workspace.id, id),
      with: {
        userWorkspaces: {
          with: {
            user: true,
          },
        },
        integrations: true,
      },
    });
  }

  // Получить workspace по slug
  async findBySlug(slug: string) {
    return db.query.workspace.findFirst({
      where: eq(workspace.slug, slug),
    });
  }

  // Получить все workspaces пользователя
  async findByUserId(userId: string) {
    return db.query.userWorkspace.findMany({
      where: eq(userWorkspace.userId, userId),
      with: {
        workspace: true,
      },
    });
  }

  // Обновить workspace
  async update(
    id: string,
    data: {
      name?: string;
      slug?: string;
      description?: string;
      website?: string;
      logo?: string;
    },
  ) {
    const [updated] = await db
      .update(workspace)
      .set(data)
      .where(eq(workspace.id, id))
      .returning();
    return updated;
  }

  // Удалить workspace
  async delete(id: string) {
    await db.delete(workspace).where(eq(workspace.id, id));
  }

  // Добавить пользователя в workspace
  async addUser(
    workspaceId: string,
    userId: string,
    role: "owner" | "admin" | "member" = "member",
  ) {
    const [member] = await db
      .insert(userWorkspace)
      .values({
        workspaceId,
        userId,
        role,
      })
      .returning();
    return member;
  }

  // Удалить пользователя из workspace
  async removeUser(workspaceId: string, userId: string) {
    await db
      .delete(userWorkspace)
      .where(
        eq(userWorkspace.workspaceId, workspaceId) &&
          eq(userWorkspace.userId, userId),
      );
  }

  // Обновить роль пользователя в workspace
  async updateUserRole(
    workspaceId: string,
    userId: string,
    role: "owner" | "admin" | "member",
  ) {
    const [updated] = await db
      .update(userWorkspace)
      .set({ role })
      .where(
        eq(userWorkspace.workspaceId, workspaceId) &&
          eq(userWorkspace.userId, userId),
      )
      .returning();
    return updated;
  }

  // Проверить доступ пользователя к workspace
  async checkAccess(workspaceId: string, userId: string) {
    const member = await db.query.userWorkspace.findFirst({
      where:
        eq(userWorkspace.workspaceId, workspaceId) &&
        eq(userWorkspace.userId, userId),
    });
    return member;
  }
}

export const workspaceRepository = new WorkspaceRepository();
