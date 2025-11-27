import { extractVacancyRequirementsFunction } from "./extract-vacancy-requirements";
import { refreshVacancyResponsesFunction } from "./refresh-vacancy-responses";
import { screenResponseFunction } from "./screen-response";
import { sendCandidateWelcomeFunction } from "./send-candidate-welcome";
import { updateVacanciesFunction } from "./update-vacancies";

export { inngest } from "./client";
export { extractVacancyRequirementsFunction } from "./extract-vacancy-requirements";
export { refreshVacancyResponsesFunction } from "./refresh-vacancy-responses";
export { screenResponseFunction } from "./screen-response";
export { sendCandidateWelcomeFunction } from "./send-candidate-welcome";
export { updateVacanciesFunction } from "./update-vacancies";

// Export all functions as an array for easy registration
export const inngestFunctions = [
  extractVacancyRequirementsFunction,
  screenResponseFunction,
  updateVacanciesFunction,
  refreshVacancyResponsesFunction,
  sendCandidateWelcomeFunction,
];
