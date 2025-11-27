"use server";

import { auth, tasks } from "@trigger.dev/sdk";

export async function createTriggerPublicToken(taskId: string) {
  try {
    const publicToken = await auth.createPublicToken({
      scopes: {
        read: {
          tasks: [taskId],
        },
        write: {
          tasks: [taskId],
        },
        trigger: {
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

export async function triggerScreenResponse(responseId: string) {
  try {
    const handle = await tasks.trigger("screen-response", { responseId });
    return { success: true as const, runId: handle.id };
  } catch (error) {
    console.error("Failed to trigger screen-response:", error);
    return { success: false as const, error: "Failed to trigger task" };
  }
}

export async function triggerScreenAllResponses(vacancyId: string) {
  try {
    const { db } = await import("@selectio/db/client");
    const { vacancyResponse } = await import("@selectio/db/schema");
    const { eq } = await import("@selectio/db");

    // Получаем все отклики для вакансии
    const responses = await db.query.vacancyResponse.findMany({
      where: eq(vacancyResponse.vacancyId, vacancyId),
      columns: {
        id: true,
      },
    });

    if (responses.length === 0) {
      return {
        success: false as const,
        error: "No responses found for this vacancy",
      };
    }

    // Используем batch для эффективной обработки большого количества откликов
    const batchHandle = await tasks.batchTrigger(
      "screen-response",
      responses.map((response) => ({
        payload: { responseId: response.id },
      }))
    );

    return {
      success: true as const,
      count: responses.length,
      batchId: batchHandle.batchId,
    };
  } catch (error) {
    console.error("Failed to trigger screen-all-responses:", error);
    return {
      success: false as const,
      error: "Failed to trigger tasks",
    };
  }
}

export async function triggerUpdateVacancies() {
  try {
    const { inngest } = await import("@selectio/jobs/client");
    await inngest.send({
      name: "vacancy/update.active",
      data: {},
    });
    return { success: true as const };
  } catch (error) {
    console.error("Failed to trigger update-vacancies:", error);
    return { success: false as const, error: "Failed to trigger update" };
  }
}

export async function triggerRefreshVacancyResponses(vacancyId: string) {
  try {
    const { inngest } = await import("@selectio/jobs/client");
    await inngest.send({
      name: "vacancy/responses.refresh",
      data: {
        vacancyId: vacancyId,
      },
    });
    return { success: true as const };
  } catch (error) {
    console.error("Failed to trigger refresh-vacancy-responses:", error);
    return { success: false as const, error: "Failed to trigger refresh" };
  }
}

export async function triggerSendWelcomeBatch(responseIds: string[]) {
  try {
    if (responseIds.length === 0) {
      return {
        success: false as const,
        error: "No responses provided",
      };
    }

    const { inngest } = await import("@selectio/jobs/client");
    await inngest.send({
      name: "candidate/welcome.batch",
      data: {
        responseIds,
      },
    });

    return {
      success: true as const,
      count: responseIds.length,
    };
  } catch (error) {
    console.error("Failed to trigger send-welcome-batch:", error);
    return {
      success: false as const,
      error: "Failed to trigger batch welcome",
    };
  }
}
