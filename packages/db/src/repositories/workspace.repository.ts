import { eq } from "drizzle-orm";
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
    // ID генерируется автоматически через workspace_id_generate()
    const [newWorkspace] = await db.insert(workspace).values(data).returning();
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

  // Получить всех участников workspace
  async getMembers(workspaceId: string) {
    return db.query.userWorkspace.findMany({
      where: eq(userWorkspace.workspaceId, workspaceId),
      with: {
        user: true,
      },
    });
  }

  // Получить все активные приглашения workspace
  async getInvites(workspaceId: string) {
    const { gt } = await import("drizzle-orm");

    return db.query.workspaceInvite.findMany({
      where: (invite, { and, eq }) =>
        and(
          eq(invite.workspaceId, workspaceId),
          gt(invite.expiresAt, new Date()),
        ),
    });
  }

  // Найти приглашение по email
  async findInviteByEmail(workspaceId: string, email: string) {
    const { workspaceInvite } = await import("../schema");
    const { and, eq: eqOp, gt } = await import("drizzle-orm");

    return db.query.workspaceInvite.findFirst({
      where: and(
        eqOp(workspaceInvite.workspaceId, workspaceId),
        eqOp(workspaceInvite.invitedEmail, email),
        gt(workspaceInvite.expiresAt, new Date()),
      ),
    });
  }

  // Отменить приглашение по email
  async cancelInviteByEmail(workspaceId: string, email: string) {
    const { workspaceInvite } = await import("../schema");
    const { and, eq: eqOp } = await import("drizzle-orm");

    const result = await db
      .delete(workspaceInvite)
      .where(
        and(
          eqOp(workspaceInvite.workspaceId, workspaceId),
          eqOp(workspaceInvite.invitedEmail, email),
        ),
      )
      .returning();

    return result.length > 0 ? result[0] : null;
  }

  // Удалить приглашение после принятия
  async deleteInviteByToken(token: string) {
    const { workspaceInvite } = await import("../schema");
    const { eq: eqOp } = await import("drizzle-orm");

    await db.delete(workspaceInvite).where(eqOp(workspaceInvite.token, token));
  }

  // Найти пользователя по email
  async findUserByEmail(email: string) {
    const { z } = await import("zod");

    // Валидация email перед запросом в БД
    const emailSchema = z.string().email("Некорректный формат email");
    const validatedEmail = emailSchema.parse(email);

    const { user } = await import("../schema");
    return db.query.user.findFirst({
      where: eq(user.email, validatedEmail),
    });
  }

  // Создать публичный invite link (для любого пользователя)
  async createInviteLink(
    workspaceId: string,
    createdBy: string,
    role: "owner" | "admin" | "member" = "member",
    expiresInDays: number = 7,
  ) {
    const { workspaceInvite } = await import("../schema");
    const { nanoid } = await import("nanoid");

    const token = nanoid(32);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const [invite] = await db
      .insert(workspaceInvite)
      .values({
        workspaceId,
        token,
        role,
        expiresAt,
        createdBy,
        invitedUserId: null,
        invitedEmail: null,
      })
      .returning();

    if (!invite) {
      throw new Error("Failed to create invite link");
    }

    return invite;
  }

  // Создать персональное приглашение для конкретного пользователя
  async createPersonalInvite(
    workspaceId: string,
    createdBy: string,
    invitedEmail: string,
    invitedUserId: string | null,
    role: "owner" | "admin" | "member" = "member",
    expiresInDays: number = 7,
  ) {
    const { workspaceInvite } = await import("../schema");
    const { nanoid } = await import("nanoid");

    const token = nanoid(32);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const [invite] = await db
      .insert(workspaceInvite)
      .values({
        workspaceId,
        token,
        role,
        expiresAt,
        createdBy,
        invitedUserId,
        invitedEmail,
      })
      .returning();

    if (!invite) {
      throw new Error("Failed to create personal invite");
    }

    return invite;
  }

  // Получить активный invite link для workspace
  async getActiveInviteLink(workspaceId: string) {
    const { gt } = await import("drizzle-orm");

    return db.query.workspaceInvite.findFirst({
      where: (invite, { and, eq }) =>
        and(
          eq(invite.workspaceId, workspaceId),
          gt(invite.expiresAt, new Date()),
        ),
      orderBy: (invite, { desc }) => [desc(invite.createdAt)],
    });
  }

  // Получить invite по токену
  async getInviteByToken(token: string) {
    const { workspaceInvite } = await import("../schema");

    return db.query.workspaceInvite.findFirst({
      where: eq(workspaceInvite.token, token),
      with: {
        workspace: true,
      },
    });
  }

  // Удалить invite
  async deleteInvite(inviteId: string) {
    const { workspaceInvite } = await import("../schema");
    const { eq: eqOp } = await import("drizzle-orm");
    await db.delete(workspaceInvite).where(eqOp(workspaceInvite.id, inviteId));
  }
}

export const workspaceRepository = new WorkspaceRepository();
