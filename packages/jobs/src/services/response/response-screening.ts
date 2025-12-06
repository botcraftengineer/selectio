import { eq } from "@selectio/db";
import { db } from "@selectio/db/client";
import { responseScreening, vacancyResponse } from "@selectio/db/schema";
import { buildResponseScreeningPrompt } from "@selectio/prompts";
import { generateText } from "../../lib/ai-client";
import { responseScreeningResultSchema } from "../../schemas/response-screening.schema";
import { extractJsonFromText } from "../../utils/json-extractor";
import {
  AI,
  createLogger,
  err,
  RESPONSE_STATUS,
  type Result,
  tryCatch,
} from "../base";
import { getVacancyRequirements } from "../vacancy";

const logger = createLogger("ResponseScreening");

interface ScreeningResult {
  score: number;
  detailedScore: number;
  analysis: string;
}

/**
 * Parses AI screening result
 */
function parseScreeningResult(text: string): ScreeningResult {
  const extracted = extractJsonFromText(text);

  if (!extracted) {
    throw new Error("JSON не найден в ответе ИИ");
  }

  return responseScreeningResultSchema.parse(extracted);
}

/**
 * Screens response and generates evaluation
 */
export async function screenResponse(
  responseId: string,
): Promise<Result<ScreeningResult>> {
  logger.info(`Screening response ${responseId}`);

  const responseResult = await tryCatch(async () => {
    return await db.query.vacancyResponse.findFirst({
      where: eq(vacancyResponse.id, responseId),
    });
  }, "Failed to fetch response");

  if (!responseResult.success) {
    return err(responseResult.error);
  }

  const response = responseResult.data;
  if (!response) {
    return err(`Response ${responseId} not found`);
  }

  const requirements = await getVacancyRequirements(response.vacancyId);

  if (!requirements) {
    return err(`Requirements for vacancy ${response.vacancyId} not found`);
  }

  const prompt = buildResponseScreeningPrompt(
    {
      candidateName: response.candidateName,
      experience: response.experience,
      education: response.education,
      about: response.about,
      languages: response.languages,
      courses: response.courses,
    },
    requirements,
  );

  logger.info("Sending request to AI for screening");

  const aiResult = await tryCatch(async () => {
    const { text } = await generateText({
      prompt,
      temperature: AI.TEMPERATURE_MODERATE,
      generationName: "screen-response",
      entityId: responseId,
      metadata: {
        responseId,
        vacancyId: response.vacancyId,
      },
    });
    return text;
  }, "AI request failed");

  if (!aiResult.success) {
    return err(aiResult.error);
  }

  logger.info("Received AI response");

  const saveResult = await tryCatch(async () => {
    const result = parseScreeningResult(aiResult.data);

    // Check if screening record exists
    const existingScreening = await db.query.responseScreening.findFirst({
      where: eq(responseScreening.responseId, responseId),
    });

    if (existingScreening) {
      await db
        .update(responseScreening)
        .set({
          score: result.score,
          detailedScore: result.detailedScore,
          analysis: result.analysis,
        })
        .where(eq(responseScreening.responseId, responseId));
    } else {
      await db.insert(responseScreening).values({
        responseId,
        score: result.score,
        detailedScore: result.detailedScore,
        analysis: result.analysis,
      });
    }

    await db
      .update(vacancyResponse)
      .set({ status: RESPONSE_STATUS.EVALUATED })
      .where(eq(vacancyResponse.id, responseId));

    logger.info(
      `Screening result saved: score ${result.score}/5 (${result.detailedScore}/100)`,
    );

    return result;
  }, "Failed to save screening result");

  return saveResult;
}
