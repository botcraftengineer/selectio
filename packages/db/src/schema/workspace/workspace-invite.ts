import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { workspace } from "./workspace";

export const workspaceInvite = pgTable("workspace_invites", {
  id: uuid("id").primaryKey().default(sql`uuid_generate_v7()`),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),

  // Токен для ссылки приглашения
  token: text("token").notNull().unique(),

  // Приглашённый пользователь (для персональных приглашений)
  // null для публичных ссылок-приглашений
  invitedUserId: text("invited_user_id"),

  // Email приглашённого (для отправки email и отображения в UI)
  // null для публичных ссылок-приглашений
  invitedEmail: text("invited_email"),

  // Роль, которую получит пользователь при присоединении
  role: text("role", { enum: ["owner", "admin", "member"] })
    .default("member")
    .notNull(),

  // Дата истечения срока действия
  expiresAt: timestamp("expires_at").notNull(),

  // Кто создал приглашение
  createdBy: text("created_by").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type WorkspaceInvite = typeof workspaceInvite.$inferSelect;
export type NewWorkspaceInvite = typeof workspaceInvite.$inferInsert;
