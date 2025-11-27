import { relations } from "drizzle-orm";
import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "../auth";

export const integration = pgTable("integrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),

  // Тип интеграции (hh, linkedin, etc.)
  type: text("type").notNull(),

  // Название интеграции (для отображения)
  name: text("name").notNull(),

  // Credentials для авторизации (email, password, api_key, etc.)
  // Структура зависит от типа интеграции
  credentials: jsonb("credentials").notNull().$type<Record<string, string>>(),

  // Cookies для сохранения сессии
  cookies:
    jsonb("cookies").$type<
      Array<{
        name: string;
        value: string;
        domain?: string;
        path?: string;
        expires?: number;
        httpOnly?: boolean;
        secure?: boolean;
        sameSite?: "Strict" | "Lax" | "None";
      }>
    >(),

  // Дополнительные метаданные
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),

  // Активна ли интеграция
  isActive: text("is_active").default("true").notNull(),

  // Дата последнего использования
  lastUsedAt: timestamp("last_used_at"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const integrationRelations = relations(integration, ({ one }) => ({
  user: one(user, {
    fields: [integration.userId],
    references: [user.id],
  }),
}));

export type Integration = typeof integration.$inferSelect;
export type NewIntegration = typeof integration.$inferInsert;
