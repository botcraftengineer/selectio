/**
 * Centralized export for all Inngest functions
 */

// Candidate functions
export * from "./candidate";

// Integration functions
export * from "./integration";

// Response functions
export * from "./response";
// Telegram functions
export * from "./telegram";
// Vacancy functions
export * from "./vacancy";

import {
  sendCandidateWelcomeBatchFunction,
  sendCandidateWelcomeFunction,
} from "./candidate";

import { verifyHHIntegrationFunction } from "./integration";

import {
  parseMissingContactsFunction,
  parseNewResumesFunction,
  refreshSingleResumeFunction,
  screenAllResponsesFunction,
  screenNewResponsesFunction,
  screenResponseFunction,
  screenResponsesBatchFunction,
} from "./response";
import {
  analyzeInterviewFunction,
  completeInterviewFunction,
  notifyTelegramAuthErrorFunction,
  sendNextQuestionFunction,
  sendTelegramMessageFunction,
  transcribeVoiceFunction,
} from "./telegram";
// Re-export all functions as array for server registration
import {
  collectChatIdsFunction,
  extractVacancyRequirementsFunction,
  refreshVacancyResponsesFunction,
  updateSingleVacancyFunction,
  updateVacanciesFunction,
} from "./vacancy";

export const inngestFunctions = [
  // Vacancy
  collectChatIdsFunction,
  extractVacancyRequirementsFunction,
  refreshVacancyResponsesFunction,
  updateSingleVacancyFunction,
  updateVacanciesFunction,
  // Response
  parseMissingContactsFunction,
  parseNewResumesFunction,
  refreshSingleResumeFunction,
  screenAllResponsesFunction,
  screenNewResponsesFunction,
  screenResponseFunction,
  screenResponsesBatchFunction,
  // Candidate
  sendCandidateWelcomeBatchFunction,
  sendCandidateWelcomeFunction,
  // Integration
  verifyHHIntegrationFunction,
  // Telegram
  analyzeInterviewFunction,
  completeInterviewFunction,
  notifyTelegramAuthErrorFunction,
  sendNextQuestionFunction,
  sendTelegramMessageFunction,
  transcribeVoiceFunction,
];
