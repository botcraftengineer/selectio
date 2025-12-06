"use server";

import { getSubscriptionToken } from "@inngest/realtime";

export async function triggerVerifyHHCredentials(
  email: string,
  password: string,
  workspaceId: string,
) {
  const { inngest } = await import("@selectio/jobs/client");

  await inngest.send({
    name: "integration/verify-hh-credentials",
    data: {
      email,
      password,
      workspaceId,
    },
  });
}

export async function fetchVerifyHHCredentialsToken(workspaceId: string) {
  const { inngest } = await import("@selectio/jobs/client");
  const token = await getSubscriptionToken(inngest, {
    channel: `verify-hh-credentials-${workspaceId}`,
    topics: ["result"],
  });
  return token;
}
