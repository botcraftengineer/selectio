import type { TRPCRouterRecord } from "@trpc/server";
import { workspaceMembers } from "./members";
import { workspaceMutations } from "./mutations";
import { workspaceQueries } from "./queries";

export const workspaceRouter = {
  ...workspaceQueries,
  ...workspaceMutations,
  ...workspaceMembers,
} satisfies TRPCRouterRecord;
