import { createTRPCRouter } from "../../trpc";
import { getConversationRouter } from "./get-conversation";
import { getFileUrlRouter } from "./get-file-url";
import { getMessagesRouter } from "./get-messages";
import { sendMessageRouter } from "./send-message";
import { transcribeVoiceRouter } from "./transcribe-voice";

export const telegramRouter = createTRPCRouter({
  conversation: getConversationRouter,
  messages: getMessagesRouter,
  sendMessage: sendMessageRouter,
  file: getFileUrlRouter,
  transcribeVoice: transcribeVoiceRouter,
});
