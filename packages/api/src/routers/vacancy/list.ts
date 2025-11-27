import { desc } from "@selectio/db";
import { vacancy } from "@selectio/db/schema";
import { protectedProcedure } from "../../trpc";

export const list = protectedProcedure.query(({ ctx }) => {
  return ctx.db.query.vacancy.findMany({
    orderBy: [desc(vacancy.createdAt)],
  });
});
