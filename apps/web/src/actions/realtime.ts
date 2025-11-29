"use server";

import { getSubscriptionToken } from "@inngest/realtime";
import { screenNewResponsesChannel } from "@selectio/jobs";
import { getSession } from "~/auth/server";

/**
 * Server action для получения токена подписки на Realtime канал
 * Проверяет авторизацию пользователя перед выдачей токена
 */
export async function fetchScreenNewResponsesToken(vacancyId: string) {
  const session = await getSession();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const { inngest } = await import("@selectio/jobs/client");

  // Создаем токен для подписки на канал конкретной вакансии
  const token = await getSubscriptionToken(inngest, {
    channel: screenNewResponsesChannel(vacancyId),
    topics: ["progress", "result"],
  });

  return token;
}
