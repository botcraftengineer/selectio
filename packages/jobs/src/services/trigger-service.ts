import { inngest } from "../inngest/client";

/**
 * Запускает задание для извлечения требований вакансии через AI
 */
export async function triggerVacancyRequirementsExtraction(
  vacancyId: string,
  description: string,
): Promise<void> {
  try {
    await inngest.send({
      name: "vacancy/requirements.extract",
      data: {
        vacancyId,
        description,
      },
    });

    console.log(`✅ Задание запущено для вакансии: ${vacancyId}`);
  } catch (error) {
    console.error(
      `❌ Ошибка запуска задания генерации промпта для ${vacancyId}:`,
      error,
    );
  }
}
