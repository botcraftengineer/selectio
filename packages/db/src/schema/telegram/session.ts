import { sql } from "drizzle-orm";
import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { workspace } from "../workspace/workspace";

export const telegramSession = pgTable("telegram_sessions", {
  id: uuid("id").primaryKey().default(sql`uuid_generate_v7()`),

  // Workspace к которому принадлежит сессия
  // Один workspace - один Telegram аккаунт
  workspaceId: text("workspace_id")
    .notNull()
    .unique()
    .references(() => workspace.id, { onDelete: "cascade" }),

  // API ID и Hash приложения
  apiId: text("api_id").notNull(),
  apiHash: text("api_hash").notNull(),

  // Номер телефона
  phone: text("phone").notNull(),

  // Сериализованная сессия MTCute
  sessionData: jsonb("session_data").notNull().$type<{
    authKey?: string;
    dcId?: number;
    userId?: string;
    [key: string]: unknown;
  }>(),

  // Информация о пользователе
  userInfo: jsonb("user_info").$type<{
    id?: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    phone?: string;
  }>(),

  // Активна ли сессия
  isActive: boolean("is_active").default(true).notNull(),

  // Ошибка авторизации (если сессия стала невалидной)
  authError: text("auth_error"),

  // Когда произошла ошибка авторизации
  authErrorAt: timestamp("auth_error_at"),

  // Когда было отправлено уведомление об ошибке
  authErrorNotifiedAt: timestamp("auth_error_notified_at"),

  // Дата последнего использования
  lastUsedAt: timestamp("last_used_at"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export type TelegramSession = typeof telegramSession.$inferSelect;
export type NewTelegramSession = typeof telegramSession.$inferInsert;
