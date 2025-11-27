import { inngest } from "./client";
import { screenResponse } from "../services/response-screening-service";

/**
 * Inngest function for screening responses using AI
 */
export const screenResponseFunction = inngest.createFunction(
  {
    id: "screen-response",
    name: "Screen Response",
    retries: 3,
  },
  { event: "response/screen" },
  async ({ event, step }) => {
    const { responseId } = event.data;

    return await step.run("screen-response", async () => {
      console.log("🎯 Скрининг отклика через AI", {
        responseId,
      });

      try {
        const result = await screenResponse(responseId);

        console.log("✅ Скрининг завершен", {
          responseId,
          score: result.score,
          detailedScore: result.detailedScore,
          questionsCount: result.questions?.length || 0,
        });

        return {
          success: true,
          responseId,
          result,
        };
      } catch (error) {
        console.error("❌ Ошибка скрининга отклика", {
          responseId,
          error,
        });
        throw error;
      }
    });
  }
);
