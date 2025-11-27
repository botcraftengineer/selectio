import { eq } from "@selectio/db";
import { companySettings } from "@selectio/db/schema";
import { companyFormSchema } from "@selectio/validators";
import { protectedProcedure } from "../../trpc";

export const update = protectedProcedure
  .input(companyFormSchema)
  .mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.query.companySettings.findFirst();

    if (existing) {
      await ctx.db
        .update(companySettings)
        .set({
          name: input.name,
          website: input.website || null,
          description: input.description || null,
          updatedAt: new Date(),
        })
        .where(eq(companySettings.id, "default"));
    } else {
      await ctx.db.insert(companySettings).values({
        id: "default",
        name: input.name,
        website: input.website || null,
        description: input.description || null,
      });
    }

    return { success: true };
  });
