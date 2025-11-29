import { extractVacancyRequirementsFunction } from "./extract-vacancy-requirements";
import { parseNewResumesFunction } from "./parse-new-resumes";
import { refreshSingleResumeFunction } from "./refresh-single-resume";
import { refreshVacancyResponsesFunction } from "./refresh-vacancy-responses";
import { screenAllResponsesFunction } from "./screen-all-responses";
import { screenNewResponsesFunction } from "./screen-new-responses";
import { screenResponseFunction } from "./screen-response";
import { screenResponsesBatchFunction } from "./screen-responses-batch";
import { sendCandidateWelcomeFunction } from "./send-candidate-welcome";
import { sendCandidateWelcomeBatchFunction } from "./send-candidate-welcome-batch";
import { sendTelegramMessageFunction } from "./send-telegram-message";
import { transcribeVoiceFunction } from "./transcribe-voice";
import { updateVacanciesFunction } from "./update-vacancies";

export { screenNewResponsesChannel } from "./channels";
export { inngest } from "./client";
export { extractVacancyRequirementsFunction } from "./extract-vacancy-requirements";
export { parseNewResumesFunction } from "./parse-new-resumes";
export { refreshSingleResumeFunction } from "./refresh-single-resume";
export { refreshVacancyResponsesFunction } from "./refresh-vacancy-responses";
export { screenAllResponsesFunction } from "./screen-all-responses";
export { screenNewResponsesFunction } from "./screen-new-responses";
export { screenResponseFunction } from "./screen-response";
export { screenResponsesBatchFunction } from "./screen-responses-batch";
export { sendCandidateWelcomeFunction } from "./send-candidate-welcome";
export { sendCandidateWelcomeBatchFunction } from "./send-candidate-welcome-batch";
export { sendTelegramMessageFunction } from "./send-telegram-message";
export { transcribeVoiceFunction } from "./transcribe-voice";
export { updateVacanciesFunction } from "./update-vacancies";

export const inngestFunctions = [
  extractVacancyRequirementsFunction,
  parseNewResumesFunction,
  refreshSingleResumeFunction,
  refreshVacancyResponsesFunction,
  screenAllResponsesFunction,
  screenNewResponsesFunction,
  screenResponseFunction,
  screenResponsesBatchFunction,
  sendCandidateWelcomeBatchFunction,
  sendCandidateWelcomeFunction,
  sendTelegramMessageFunction,
  transcribeVoiceFunction,
  updateVacanciesFunction,
];
