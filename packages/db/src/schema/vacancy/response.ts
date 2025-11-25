import {
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { vacancy } from "./vacancy";

export const vacancyResponse = pgTable("vacancy_responses", {
  id: uuid("id").primaryKey().defaultRandom(),
  vacancyId: varchar("vacancy_id", { length: 50 })
    .notNull()
    .references(() => vacancy.id, { onDelete: "cascade" }),
  resumeUrl: text("resume_url").notNull(),
  candidateName: varchar("candidate_name", { length: 500 }),
  experience: text("experience"),
  contacts: jsonb("contacts"),
  languages: text("languages"),
  about: text("about"),
  education: text("education"),
  courses: text("courses"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => new Date())
    .notNull(),
});

export const CreateVacancyResponseSchema = createInsertSchema(vacancyResponse, {
  vacancyId: z.string().max(50),
  resumeUrl: z.string(),
  candidateName: z.string().max(500).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
