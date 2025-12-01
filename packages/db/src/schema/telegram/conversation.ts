import { sql } from "drizzle-orm";
import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { vacancyResponse } from "../vacancy/response";

export const conversationStatusEnum = pgEnum("conversation_status", [
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
]);

export const telegramConversation = pgTable("telegram_conversations", {
  id: uuid("id").primaryKey().default(sql`uuid_generate_v7()`),
  chatId: varchar("chat_id", { length: 100 }).notNull().unique(),
  responseId: uuid("response_id").references(() => vacancyResponse.id, {
    onDelete: "cascade",
  }),
  candidateName: varchar("candidate_name", { length: 500 }),
  status: conversationStatusEnum("status").default("ACTIVE").notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const CreateTelegramConversationSchema = createInsertSchema(
  telegramConversation,
  {
    chatId: z.string().max(100),
    responseId: z.string().uuid().optional(),
    candidateName: z.string().max(500).optional(),
    status: z.enum(["ACTIVE", "COMPLETED", "CANCELLED"]).default("ACTIVE"),
    metadata: z.string().optional(),
  },
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
