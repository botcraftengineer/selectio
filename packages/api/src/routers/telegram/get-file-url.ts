import { getDownloadUrl, getFileUrl } from "@selectio/lib";
import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure } from "../../trpc";

export const getFileUrlRouter = {
  getUrl: protectedProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      // Для MinIO используем прямой URL, для AWS S3 - presigned URL
      const url = process.env.AWS_S3_ENDPOINT
        ? getFileUrl(input.key)
        : await getDownloadUrl(input.key);
      return { url };
    }),
} satisfies TRPCRouterRecord;
