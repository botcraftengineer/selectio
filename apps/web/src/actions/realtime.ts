"use server";

import { getSubscriptionToken } from "@inngest/realtime";
import {
  refreshVacancyResponsesChannel,
  screenAllResponsesChannel,
  screenNewResponsesChannel,
} from "@selectio/jobs/channels";

/**
 * Server action для получения токена подписки на Realtime канал скрининга новых откликов
 */
export async function fetchScreenNewResponsesToken(vacancyId: string) {
  const { inngest } = await import("@selectio/jobs/client");

  const token = await getSubscriptionToken(inngest, {
    channel: screenNewResponsesChannel(vacancyId),
    topics: ["progress", "result"],
  });

  return token;
}

/**
 * Server action для получения токена подписки на Realtime канал скрининга всех откликов
 */
export async function fetchScreenAllResponsesToken(vacancyId: string) {
  const { inngest } = await import("@selectio/jobs/client");

  const token = await getSubscriptionToken(inngest, {
    channel: screenAllResponsesChannel(vacancyId),
    topics: ["progress", "result"],
  });

  return token;
}

/**
 * Server action для получения токена подписки на Realtime канал обновления откликов
 */
export async function fetchRefreshVacancyResponsesToken(vacancyId: string) {
  const { inngest } = await import("@selectio/jobs/client");
  const token = await getSubscriptionToken(inngest, {
    channel: refreshVacancyResponsesChannel(vacancyId),
    topics: ["status"],
  });

  return token;
}

/**
 * Server action для получения токена подписки на Realtime канал проверки интеграций
 */
export async function fetchVerifyIntegrationToken(workspaceId: string) {
  const { inngest } = await import("@selectio/jobs/client");
  const { verifyIntegrationChannel } = await import("@selectio/jobs/channels");

  const token = await getSubscriptionToken(inngest, {
    channel: verifyIntegrationChannel(workspaceId),
    topics: ["integration-verify"],
  });

  return token;
}

/**
 * Server action для триггера проверки интеграции
 */
export async function triggerVerifyIntegrationHH(
  workspaceId: string,
  integrationId: string,
) {
  try {
    const { inngest } = await import("@selectio/jobs/client");
    await inngest.send({
      name: `integration/hh.verify`,
      data: {
        workspaceId,
        integrationId,
      },
    });
    return { success: true as const };
  } catch (error) {
    console.error("Failed to trigger verify-integration:", error);
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Failed to trigger verification",
    };
  }
}
