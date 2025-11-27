import { companySettings } from "@selectio/db/schema";
import { protectedProcedure } from "../../trpc";

export const get = protectedProcedure.query(async ({ ctx }) => {
  const result = await ctx.db.query.companySettings.findFirst();

  return result ?? null;
});
