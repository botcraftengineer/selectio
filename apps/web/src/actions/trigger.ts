"use server";

import { getSubscriptionToken } from "@inngest/realtime";

export async function getParseResumesToken() {
  const { inngest } = await import("@selectio/jobs/client");
  const token = await getSubscriptionToken(inngest, {
    channel: "parse-new-resumes",
    topics: ["status"],
  });
  return token;
}

export async function getParseMissingContactsToken() {
  const { inngest } = await import("@selectio/jobs/client");
  const token = await getSubscriptionToken(inngest, {
    channel: "parse-missing-contacts",
    topics: ["status"],
  });
  return token;
}

export async function triggerScreenResponse(responseId: string) {
  try {
    const { inngest } = await import("@selectio/jobs/client");
    await inngest.send({
      name: "response/screen",
      data: {
        responseId,
      },
    });
    return { success: true as const };
  } catch (error) {
    console.error("Не удалось запустить оценку отклика:", error);
    return { success: false as const, error: "Не удалось запустить оценку" };
  }
}

export async function triggerScreenAllResponses(vacancyId: string) {
  try {
    const { inngest } = await import("@selectio/jobs/client");
    await inngest.send({
      name: "response/screen.all",
      data: {
        vacancyId,
      },
    });
    return { success: true as const };
  } catch (error) {
    console.error("Не удалось запустить оценку всех откликов:", error);
    return { success: false as const, error: "Не удалось запустить оценку" };
  }
}

export async function triggerScreenResponsesBatch(responseIds: string[]) {
  try {
    if (responseIds.length === 0) {
      return {
        success: false as const,
        error: "Отклики не предоставлены",
      };
    }

    const { inngest } = await import("@selectio/jobs/client");
    await inngest.send({
      name: "response/screen.batch",
      data: {
        responseIds,
      },
    });

    return {
      success: true as const,
    };
  } catch (error) {
    console.error("Не удалось запустить пакетную оценку откликов:", error);
    return {
      success: false as const,
      error: "Не удалось запустить пакетную оценку",
    };
  }
}

export async function triggerScreenNewResponses(vacancyId: string) {
  try {
    const { inngest } = await import("@selectio/jobs/client");
    await inngest.send({
      name: "response/screen.new",
      data: {
        vacancyId,
      },
    });
    return { success: true as const };
  } catch (error) {
    console.error("Не удалось запустить оценку новых откликов:", error);
    return { success: false as const, error: "Не удалось запустить оценку" };
  }
}

export async function triggerUpdateVacancies(workspaceId: string) {
  try {
    const { inngest } = await import("@selectio/jobs/client");
    await inngest.send({
      name: "vacancy/update.active",
      data: { workspaceId },
    });
    return { success: true as const };
  } catch (error) {
    console.error("Не удалось запустить обновление вакансий:", error);
    return {
      success: false as const,
      error: "Не удалось запустить обновление",
    };
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
    console.error("Не удалось запустить обновление откликов вакансии:", error);
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Не удалось запустить обновление",
    };
  }
}

export async function triggerSendWelcomeBatch(responseIds: string[]) {
  try {
    if (responseIds.length === 0) {
      return {
        success: false as const,
        error: "Отклики не предоставлены",
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
    console.error("Не удалось запустить пакетную отправку приветствий:", error);
    return {
      success: false as const,
      error: "Не удалось запустить пакетную отправку",
    };
  }
}

export async function triggerParseNewResumes(vacancyId: string) {
  try {
    const { inngest } = await import("@selectio/jobs/client");
    await inngest.send({
      name: "response/resume.parse-new",
      data: {
        vacancyId,
      },
    });
    return { success: true as const };
  } catch (error) {
    console.error("Не удалось запустить парсинг новых резюме:", error);
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Не удалось запустить парсинг",
    };
  }
}

export async function triggerParseMissingContacts(vacancyId: string) {
  try {
    const { inngest } = await import("@selectio/jobs/client");
    await inngest.send({
      name: "response/contacts.parse-missing",
      data: {
        vacancyId,
      },
    });
    return { success: true as const };
  } catch (error) {
    console.error("Не удалось запустить парсинг недостающих контактов:", error);
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Не удалось запустить парсинг",
    };
  }
}

export async function triggerRefreshSingleResume(responseId: string) {
  try {
    const { inngest } = await import("@selectio/jobs/client");
    await inngest.send({
      name: "response/resume.refresh",
      data: {
        responseId,
      },
    });
    return { success: true as const };
  } catch (error) {
    console.error("Не удалось запустить обновление резюме:", error);
    return {
      success: false as const,
      error: "Не удалось запустить обновление",
    };
  }
}

export async function triggerSendWelcome(
  responseId: string,
  username?: string | null,
  phone?: string | null,
) {
  try {
    const { inngest } = await import("@selectio/jobs/client");
    await inngest.send({
      name: "candidate/welcome",
      data: {
        responseId,
        username: username || undefined,
        phone: phone || undefined,
      },
    });
    return { success: true as const };
  } catch (error) {
    console.error("Не удалось запустить отправку приветствия:", error);
    return { success: false as const, error: "Failed to trigger welcome" };
  }
}

export async function triggerGenerateRequirements(
  vacancyId: string,
  description: string,
) {
  try {
    const { inngest } = await import("@selectio/jobs/client");
    await inngest.send({
      name: "vacancy/requirements.extract",
      data: {
        vacancyId,
        description,
      },
    });
    return { success: true as const };
  } catch (error) {
    console.error("Failed to trigger generate-requirements:", error);
    return {
      success: false as const,
      error: "Failed to trigger requirements generation",
    };
  }
}

export async function triggerUpdateSingleVacancy(vacancyId: string) {
  try {
    const { inngest } = await import("@selectio/jobs/client");
    await inngest.send({
      name: "vacancy/update.single",
      data: {
        vacancyId,
      },
    });
    return { success: true as const };
  } catch (error) {
    console.error("Failed to trigger update-single-vacancy:", error);
    return {
      success: false as const,
      error: "Failed to trigger vacancy update",
    };
  }
}
