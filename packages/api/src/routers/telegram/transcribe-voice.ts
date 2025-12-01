import { inngest } from "@selectio/jobs/client";
import { uuidv7Schema } from "@selectio/validators";
import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure } from "../../trpc";

export const transcribeVoiceRouter = {
  trigger: protectedProcedure
    .input(
      z.object({
        messageId: uuidv7Schema,
        fileId: uuidv7Schema,
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
