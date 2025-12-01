import { relations } from "drizzle-orm";
import { user } from "../auth/user";
import { companySettings } from "../company/company-settings";
import { integration } from "../integration/integration";
import { vacancy } from "../vacancy/vacancy";
import { userWorkspace } from "./user-workspace";
import { workspace } from "./workspace";
import { workspaceInvite } from "./workspace-invite";

export const workspaceRelations = relations(workspace, ({ many, one }) => ({
  userWorkspaces: many(userWorkspace),
  integrations: many(integration),
  vacancies: many(vacancy),
  invites: many(workspaceInvite),
  companySettings: one(companySettings, {
    fields: [workspace.id],
    references: [companySettings.workspaceId],
  }),
}));

export const workspaceInviteRelations = relations(
  workspaceInvite,
  ({ one }) => ({
    workspace: one(workspace, {
      fields: [workspaceInvite.workspaceId],
      references: [workspace.id],
    }),
  }),
);

export const userWorkspaceRelations = relations(userWorkspace, ({ one }) => ({
  user: one(user, {
    fields: [userWorkspace.userId],
    references: [user.id],
  }),
  workspace: one(workspace, {
    fields: [userWorkspace.workspaceId],
    references: [workspace.id],
  }),
}));

export const userRelations = relations(user, ({ many }) => ({
  userWorkspaces: many(userWorkspace),
}));
