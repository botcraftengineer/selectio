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

export const fileProviderEnum = pgEnum("file_provider", ["S3"]);

export const file = pgTable("files", {
  id: uuid("id").primaryKey().default(sql`uuid_generate_v7()`),
  provider: fileProviderEnum("provider").default("S3").notNull(),
  key: text("key").notNull(),
  fileName: varchar("file_name", { length: 500 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  fileSize: varchar("file_size", { length: 50 }),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const CreateFileSchema = createInsertSchema(file, {
  provider: z.enum(["S3"]).default("S3"),
  key: z.string(),
  fileName: z.string().max(500),
  mimeType: z.string().max(100),
  fileSize: z.string().max(50).optional(),
  metadata: z.string().optional(),
}).omit({
  id: true,
  createdAt: true,
});
