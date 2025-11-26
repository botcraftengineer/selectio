"use server";

import { auth } from "@trigger.dev/sdk";

export async function createTriggerPublicToken(taskId: string) {
  try {
    const publicToken = await auth.createPublicToken({
      scopes: {
        read: {
          tasks: [taskId],
        },
      },
      expirationTime: "15m",
    });

    return { success: true, token: publicToken };
  } catch (error) {
    console.error("Failed to create Trigger.dev public token:", error);
    return { success: false, error: "Failed to create token" };
  }
}
