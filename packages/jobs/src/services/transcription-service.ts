import { createOpenAI } from "@ai-sdk/openai";
import { env } from "@selectio/config";
import { experimental_transcribe as transcribe } from "ai";

export async function transcribeAudio(
  audioBuffer: Buffer,
): Promise<string | null> {
  // Пропускаем транскрибцию, если AI_GATEWAY_API_KEY не заполнен
  if (!env.AI_GATEWAY_API_KEY) {
    console.log("⏭️ Транскрибация пропущена: AI_GATEWAY_API_KEY не заполнен");
    return null;
  }

  try {
    // Используем Vercel AI Gateway
    const openaiProvider = createOpenAI({
      apiKey: env.AI_GATEWAY_API_KEY,
      baseURL: "https://ai-gateway.vercel.sh/v1",
    });

    const result = await transcribe({
      model: openaiProvider.transcription("openai/whisper-1"),
      audio: audioBuffer,
      providerOptions: { openai: { language: "ru" } },
    });

    return result.text;
  } catch (error) {
    console.error("Ошибка при транскрибции аудио:", error);
    return null;
  }
}
