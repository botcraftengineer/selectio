import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const workspace = pgTable("workspaces", {
  id: text("id").primaryKey(),

  // Название workspace (компании)
  name: text("name").notNull(),

  // Уникальный slug для URL
  slug: text("slug").notNull().unique(),

  // Описание компании
  description: text("description"),

  // Сайт компании
  website: text("website"),

  // Логотип
  logo: text("logo"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export type Workspace = typeof workspace.$inferSelect;
export type NewWorkspace = typeof workspace.$inferInsert;
