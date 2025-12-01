import { relations } from "drizzle-orm";
import { workspace } from "../workspace/workspace";
import { companySettings } from "./company-settings";

export const companySettingsRelations = relations(
  companySettings,
  ({ one }) => ({
    workspace: one(workspace, {
      fields: [companySettings.workspaceId],
      references: [workspace.id],
    }),
  }),
);
