import { analyzeInterviewFunction } from "./analyze-interview";
import { collectChatIdsFunction } from "./collect-chat-ids";
import { extractVacancyRequirementsFunction } from "./extract-vacancy-requirements";
import { parseMissingContactsFunction } from "./parse-missing-contacts";
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
import { updateSingleVacancyFunction } from "./update-single-vacancy";
import { updateVacanciesFunction } from "./update-vacancies";

export { analyzeInterviewFunction } from "./analyze-interview";
export { screenNewResponsesChannel } from "./channels";
export { inngest } from "./client";
export { collectChatIdsFunction } from "./collect-chat-ids";
export { extractVacancyRequirementsFunction } from "./extract-vacancy-requirements";
export {
  parseMissingContactsChannel,
  parseMissingContactsFunction,
} from "./parse-missing-contacts";
export {
  parseNewResumesChannel,
  parseNewResumesFunction,
} from "./parse-new-resumes";
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
export { updateSingleVacancyFunction } from "./update-single-vacancy";
export { updateVacanciesFunction } from "./update-vacancies";

export const inngestFunctions = [
  analyzeInterviewFunction,
  collectChatIdsFunction,
  extractVacancyRequirementsFunction,
  parseMissingContactsFunction,
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
  updateSingleVacancyFunction,
  updateVacanciesFunction,
];
