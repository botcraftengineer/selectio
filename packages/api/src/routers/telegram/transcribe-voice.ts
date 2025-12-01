import { inngest } from "@selectio/jobs/client";
import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure } from "../../trpc";

export const transcribeVoiceRouter = {
  trigger: protectedProcedure
    .input(
      z.object({
        messageId: z.string().uuid(),
        fileId: z.string().uuid(),
      }),
    )
    .mutation(async ({ input }) => {
      await inngest.send({
        name: "telegram/voice.transcribe",
        data: {
          messageId: input.messageId,
          fileId: input.fileId,
        },
      });

      return {
        success: true,
        messageId: input.messageId,
      };
    }),
} satisfies TRPCRouterRecord;
