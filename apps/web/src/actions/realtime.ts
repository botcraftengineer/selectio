"use server";

import { getSubscriptionToken } from "@inngest/realtime";
import {
  refreshVacancyResponsesChannel,
  screenNewResponsesChannel,
} from "@selectio/jobs/channels";

/**
 * Server action для получения токена подписки на Realtime канал скрининга
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
 * Server action для получения токена подписки на Realtime канал обновления откликов
 */
export async function fetchRefreshVacancyResponsesToken(vacancyId: string) {
  const { inngest } = await import("@selectio/jobs/client");
  console.log(
    "fetchRefreshVacancyResponsesToken",
    refreshVacancyResponsesChannel(vacancyId),
  );
  const token = await getSubscriptionToken(inngest, {
    channel: refreshVacancyResponsesChannel(vacancyId),
    topics: ["status"],
  });

  return token;
}
