import { realtimeMiddleware } from "@inngest/realtime/middleware";
import { EventSchemas, Inngest } from "inngest";
import {
  candidateWelcomeBatchDataSchema,
  candidateWelcomeDataSchema,
  parseNewResumesDataSchema,
  refreshSingleResumeDataSchema,
  responseScreenDataSchema,
  screenAllResponsesDataSchema,
  screenNewResponsesDataSchema,
  screenResponsesBatchDataSchema,
  telegramMessageSendDataSchema,
  vacancyRequirementsExtractDataSchema,
  vacancyResponsesRefreshDataSchema,
  vacancyUpdateActiveDataSchema,
} from "./types";

// Create Inngest client with Zod schemas for type-safe events
export const inngest = new Inngest({
  id: "selectio",
  name: "Selectio Jobs",
  middleware: [realtimeMiddleware()],
  schemas: new EventSchemas().fromSchema({
    "vacancy/requirements.extract": vacancyRequirementsExtractDataSchema,
    "response/screen": responseScreenDataSchema,
    "response/screen.new": screenNewResponsesDataSchema,
    "response/screen.all": screenAllResponsesDataSchema,
    "response/screen.batch": screenResponsesBatchDataSchema,
    "response/resume.parse-new": parseNewResumesDataSchema,
    "response/resume.refresh": refreshSingleResumeDataSchema,
    "vacancy/update.active": vacancyUpdateActiveDataSchema,
    "vacancy/responses.refresh": vacancyResponsesRefreshDataSchema,
    "candidate/welcome": candidateWelcomeDataSchema,
    "candidate/welcome.batch": candidateWelcomeBatchDataSchema,
    "telegram/message.send": telegramMessageSendDataSchema,
  }),
});
