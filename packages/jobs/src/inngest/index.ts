import { extractVacancyRequirementsFunction } from "./extract-vacancy-requirements";
import { screenResponseFunction } from "./screen-response";

export { inngest } from "./client";
export { extractVacancyRequirementsFunction } from "./extract-vacancy-requirements";
export { screenResponseFunction } from "./screen-response";

// Export all functions as an array for easy registration
export const inngestFunctions = [
  extractVacancyRequirementsFunction,
  screenResponseFunction,
];
