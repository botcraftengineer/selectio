import { buildTelegramUsernameExtractionPrompt } from "@selectio/prompts";
import { generateText } from "../lib/ai-client";

/**
 * Extract Telegram username from contacts data using AI
 * @param contacts - Raw contacts data from HH.ru API
 * @returns Telegram username without @ or null if not found
 */
export async function extractTelegramUsername(
  contacts: unknown,
): Promise<string | null> {
  if (!contacts) {
    return null;
  }

  try {
    const contactsJson = JSON.stringify(contacts, null, 2);

    const prompt = buildTelegramUsernameExtractionPrompt(contactsJson);

    const { text } = await generateText({
      prompt,
      temperature: 0,
      generationName: "extract-telegram-username",
      metadata: {
        contactsPreview: contactsJson.substring(0, 200),
      },
    });

    const cleanedText = text.trim();

    // Check if the response is null or empty
    if (
      cleanedText === "null" ||
      cleanedText === "" ||
      cleanedText.toLowerCase() === "none"
    ) {
      return null;
    }

    // Validate the username format
    const usernameRegex = /^[a-zA-Z0-9_]{5,}$/;
    if (!usernameRegex.test(cleanedText)) {
      console.log(
        `⚠️ Неверный формат Telegram username: ${cleanedText}, игнорируем`,
      );
      return null;
    }

    console.log(`✅ Извлечён Telegram username: ${cleanedText}`);
    return cleanedText;
  } catch (error) {
    console.error("❌ Ошибка извлечения Telegram username:", error);
    return null;
  }
}
