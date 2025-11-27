import { inngest } from "./client";
import { extractVacancyRequirements } from "../services/screening-prompt-service";

/**
 * Inngest function for extracting vacancy requirements using AI
 */
export const extractVacancyRequirementsFunction = inngest.createFunction(
  {
    id: "extract-vacancy-requirements",
    name: "Extract Vacancy Requirements",
    retries: 3,
  },
  { event: "vacancy/requirements.extract" },
  async ({ event, step }) => {
    const { vacancyId, description } = event.data;

    return await step.run("extract-requirements", async () => {
      console.log("🎯 Извлечение требований вакансии через AI", {
        vacancyId,
      });

      try {
        const requirements = await extractVacancyRequirements(
          vacancyId,
          description
        );

        console.log("✅ Требования успешно извлечены и сохранены", {
          vacancyId,
          jobTitle: requirements.job_title,
          mandatoryCount: requirements.mandatory_requirements.length,
          techStackCount: requirements.tech_stack.length,
        });

        return {
          success: true,
          vacancyId,
          requirements,
        };
      } catch (error) {
        console.error("❌ Ошибка генерации требований", {
          vacancyId,
          error,
        });
        throw error;
      }
    });
  }
);
