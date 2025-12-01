import { eq } from "@selectio/db";
import { user } from "@selectio/db/schema";
import { accountFormSchema } from "@selectio/validators";
import { protectedProcedure } from "../../trpc";

export const updateAccount = protectedProcedure
  .input(accountFormSchema)
  .mutation(async ({ ctx, input }) => {
    await ctx.db
      .update(user)
      .set({
        name: input.name,
        language: input.language,
        image: input.image,
        updatedAt: new Date(),
      })
      .where(eq(user.id, ctx.session.user.id));

    return { success: true };
  });
