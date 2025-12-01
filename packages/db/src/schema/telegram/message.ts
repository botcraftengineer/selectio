import { uuidv7Schema } from "@selectio/validators";
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
import { file } from "../file/file";
import { telegramConversation } from "./conversation";

export const messageSenderEnum = pgEnum("message_sender", [
  "CANDIDATE",
  "BOT",
  "ADMIN",
]);

export const messageContentTypeEnum = pgEnum("message_content_type", [
  "TEXT",
  "VOICE",
]);

export const telegramMessage = pgTable("telegram_messages", {
  id: uuid("id").primaryKey().default(sql`uuid_generate_v7()`),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => telegramConversation.id, { onDelete: "cascade" }),
  sender: messageSenderEnum("sender").notNull(),
  contentType: messageContentTypeEnum("content_type").default("TEXT").notNull(),
  content: text("content").notNull(),
  fileId: uuid("file_id").references(() => file.id, { onDelete: "set null" }),
  voiceDuration: varchar("voice_duration", { length: 20 }),
  voiceTranscription: text("voice_transcription"),
  telegramMessageId: varchar("telegram_message_id", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const CreateTelegramMessageSchema = createInsertSchema(telegramMessage, {
  conversationId: uuidv7Schema,
  sender: z.enum(["CANDIDATE", "BOT", "ADMIN"]),
  contentType: z.enum(["TEXT", "VOICE"]).default("TEXT"),
  content: z.string(),
  fileId: uuidv7Schema.optional(),
  voiceDuration: z.string().max(20).optional(),
  voiceTranscription: z.string().optional(),
  telegramMessageId: z.string().max(100).optional(),
}).omit({
  id: true,
  createdAt: true,
});
