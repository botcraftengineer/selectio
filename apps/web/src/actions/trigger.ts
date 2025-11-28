"use server";

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
    console.error("Failed to trigger screen-response:", error);
    return { success: false as const, error: "Failed to trigger screening" };
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
    console.error("Failed to trigger screen-all-responses:", error);
    return { success: false as const, error: "Failed to trigger screening" };
  }
}

export async function triggerScreenResponsesBatch(responseIds: string[]) {
  try {
    if (responseIds.length === 0) {
      return {
        success: false as const,
        error: "No responses provided",
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
    console.error("Failed to trigger screen-responses-batch:", error);
    return {
      success: false as const,
      error: "Failed to trigger batch screening",
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
    console.error("Failed to trigger screen-new-responses:", error);
    return { success: false as const, error: "Failed to trigger screening" };
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
    console.error("Failed to trigger parse-new-resumes:", error);
    return { success: false as const, error: "Failed to trigger parsing" };
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
    console.error("Failed to trigger refresh-single-resume:", error);
    return { success: false as const, error: "Failed to trigger refresh" };
  }
}
