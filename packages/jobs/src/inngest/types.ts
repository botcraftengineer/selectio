import { z } from "zod";

/**
 * Zod schemas for Inngest event payloads
 */

// Schema for vacancy requirements extraction event data
export const vacancyRequirementsExtractDataSchema = z.object({
  vacancyId: z.string().min(1, "Vacancy ID is required"),
  description: z.string().min(1, "Description is required"),
});

// Schema for response screening event data
export const responseScreenDataSchema = z.object({
  responseId: z.string().min(1, "Response ID is required"),
});

/**
 * Inngest event schemas using Zod
 * Each event must have a 'data' field containing the payload
 */
// Schema for vacancy update active event data
export const vacancyUpdateActiveDataSchema = z.object({
  workspaceId: z.string().optional(),
});

// Schema for vacancy responses refresh event data
export const vacancyResponsesRefreshDataSchema = z.object({
  vacancyId: z.string().min(1, "Vacancy ID is required"),
});

// Schema for candidate welcome message event data
export const candidateWelcomeDataSchema = z.object({
  responseId: z.string().min(1, "Response ID is required"),
  username: z.string().optional(),
  phone: z.string().optional(),
});

// Schema for batch candidate welcome message event data
export const candidateWelcomeBatchDataSchema = z.object({
  responseIds: z
    .array(z.string())
    .min(1, "At least one response ID is required"),
});

// Schema for screening new responses event data
export const screenNewResponsesDataSchema = z.object({
  vacancyId: z.string().min(1, "Vacancy ID is required"),
});

// Schema for screening all responses event data
export const screenAllResponsesDataSchema = z.object({
  vacancyId: z.string().min(1, "Vacancy ID is required"),
});

// Schema for batch screening responses event data
export const screenResponsesBatchDataSchema = z.object({
  responseIds: z
    .array(z.string())
    .min(1, "At least one response ID is required"),
});

// Schema for parsing new resumes event data
export const parseNewResumesDataSchema = z.object({
  vacancyId: z.string().min(1, "Vacancy ID is required"),
});

// Schema for refreshing single resume event data
export const refreshSingleResumeDataSchema = z.object({
  responseId: z.string().min(1, "Response ID is required"),
});

// Schema for parsing missing contacts event data
export const parseMissingContactsDataSchema = z.object({
  vacancyId: z.string().min(1, "Vacancy ID is required"),
});

// Schema for updating single vacancy event data
export const vacancyUpdateSingleDataSchema = z.object({
  vacancyId: z.string().min(1, "Vacancy ID is required"),
});

// Schema for collecting chat IDs event data
export const collectChatIdsDataSchema = z.object({
  vacancyId: z.string().min(1, "Vacancy ID is required"),
});

// Schema for telegram message send event data
export const telegramMessageSendDataSchema = z.object({
  messageId: z.string().min(1, "Message ID is required"),
  chatId: z.string().min(1, "Chat ID is required"),
  content: z.string().min(1, "Content is required"),
});

// Schema for voice transcription event data
export const voiceTranscriptionDataSchema = z.object({
  messageId: z.string().min(1, "Message ID is required"),
  fileId: z.string().min(1, "File ID is required"),
});

// Schema for interview analysis event data
export const interviewAnalysisDataSchema = z.object({
  conversationId: z.string().min(1, "Conversation ID is required"),
  transcription: z.string().min(1, "Transcription is required"),
});

// Schema for sending next interview question event data
export const interviewSendQuestionDataSchema = z.object({
  conversationId: z.string().min(1, "Conversation ID is required"),
  question: z.string().min(1, "Question is required"),
  transcription: z.string().min(1, "Transcription is required"),
  questionNumber: z.number().int().min(0),
});

// Schema for completing interview event data
export const interviewCompleteDataSchema = z.object({
  conversationId: z.string().min(1, "Conversation ID is required"),
  transcription: z.string().min(1, "Transcription is required"),
  reason: z.string().optional(),
  questionNumber: z.number().int().min(0),
  responseId: z.string().optional(),
});

/**
 * Inngest event schemas using Zod
 * Each event must have a 'data' field containing the payload
 */
export const inngestEventSchemas = {
  "vacancy/requirements.extract": {
    data: vacancyRequirementsExtractDataSchema,
  },
  "response/screen": {
    data: responseScreenDataSchema,
  },
  "vacancy/update.active": {
    data: vacancyUpdateActiveDataSchema,
  },
  "vacancy/responses.refresh": {
    data: vacancyResponsesRefreshDataSchema,
  },
  "candidate/welcome": {
    data: candidateWelcomeDataSchema,
  },
  "candidate/welcome.batch": {
    data: candidateWelcomeBatchDataSchema,
  },
  "response/screen.new": {
    data: screenNewResponsesDataSchema,
  },
  "response/screen.all": {
    data: screenAllResponsesDataSchema,
  },
  "response/screen.batch": {
    data: screenResponsesBatchDataSchema,
  },
  "response/resume.parse-new": {
    data: parseNewResumesDataSchema,
  },
  "response/resume.refresh": {
    data: refreshSingleResumeDataSchema,
  },
  "response/contacts.parse-missing": {
    data: parseMissingContactsDataSchema,
  },
  "vacancy/update.single": {
    data: vacancyUpdateSingleDataSchema,
  },
  "vacancy/chat-ids.collect": {
    data: collectChatIdsDataSchema,
  },
  "telegram/message.send": {
    data: telegramMessageSendDataSchema,
  },
  "telegram/voice.transcribe": {
    data: voiceTranscriptionDataSchema,
  },
  "telegram/interview.analyze": {
    data: interviewAnalysisDataSchema,
  },
  "telegram/interview.send-question": {
    data: interviewSendQuestionDataSchema,
  },
  "telegram/interview.complete": {
    data: interviewCompleteDataSchema,
  },
};

/**
 * Type inference from Zod schemas
 */
export type VacancyRequirementsExtractPayload = z.infer<
  typeof vacancyRequirementsExtractDataSchema
>;
export type ResponseScreenPayload = z.infer<typeof responseScreenDataSchema>;
export type VacancyUpdateActivePayload = z.infer<
  typeof vacancyUpdateActiveDataSchema
>;
export type VacancyResponsesRefreshPayload = z.infer<
  typeof vacancyResponsesRefreshDataSchema
>;
export type CandidateWelcomePayload = z.infer<
  typeof candidateWelcomeDataSchema
>;
export type CandidateWelcomeBatchPayload = z.infer<
  typeof candidateWelcomeBatchDataSchema
>;
export type ScreenNewResponsesPayload = z.infer<
  typeof screenNewResponsesDataSchema
>;
export type ScreenAllResponsesPayload = z.infer<
  typeof screenAllResponsesDataSchema
>;
export type ScreenResponsesBatchPayload = z.infer<
  typeof screenResponsesBatchDataSchema
>;
export type ParseNewResumesPayload = z.infer<typeof parseNewResumesDataSchema>;
export type RefreshSingleResumePayload = z.infer<
  typeof refreshSingleResumeDataSchema
>;
export type ParseMissingContactsPayload = z.infer<
  typeof parseMissingContactsDataSchema
>;
export type VacancyUpdateSinglePayload = z.infer<
  typeof vacancyUpdateSingleDataSchema
>;
export type CollectChatIdsPayload = z.infer<typeof collectChatIdsDataSchema>;
export type TelegramMessageSendPayload = z.infer<
  typeof telegramMessageSendDataSchema
>;
export type VoiceTranscriptionPayload = z.infer<
  typeof voiceTranscriptionDataSchema
>;
export type InterviewAnalysisPayload = z.infer<
  typeof interviewAnalysisDataSchema
>;
export type InterviewSendQuestionPayload = z.infer<
  typeof interviewSendQuestionDataSchema
>;
export type InterviewCompletePayload = z.infer<
  typeof interviewCompleteDataSchema
>;
