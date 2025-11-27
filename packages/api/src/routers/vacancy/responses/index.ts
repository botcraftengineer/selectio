import type { TRPCRouterRecord } from "@trpc/server";

import { getById } from "./get-by-id";
import { list } from "./list";
import { listAll } from "./list-all";
import { sendWelcome } from "./send-welcome";

export const responsesRouter = {
  list,
  listAll,
  getById,
  sendWelcome,
} satisfies TRPCRouterRecord;
