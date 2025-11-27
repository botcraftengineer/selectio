import { inngest } from "../inngest/client";

/**
 * Triggers vacancy requirements extraction job via Inngest
 */
export async function triggerVacancyRequirementsExtraction(
  vacancyId: string,
  description: string
): Promise<void> {
  try {
    await inngest.send({
      name: "vacancy/requirements.extract",
      data: {
        vacancyId,
        description,
      },
    });

    console.log(`✅ Inngest event sent for vacancy: ${vacancyId}`);
  } catch (error) {
    console.error(
      `❌ Ошибка отправки Inngest события для ${vacancyId}:`,
      error
    );
    // Не пробрасываем ошибку, чтобы не блокировать основной процесс
  }
}

/**
 * Triggers response screening job via Inngest
 */
export async function triggerResponseScreening(
  responseId: string
): Promise<void> {
  try {
    await inngest.send({
      name: "response/screen",
      data: {
        responseId,
      },
    });

    console.log(`✅ Inngest event sent for response: ${responseId}`);
  } catch (error) {
    console.error(
      `❌ Ошибка отправки Inngest события для ${responseId}:`,
      error
    );
    // Не пробрасываем ошибку, чтобы не блокировать основной процесс
  }
}
