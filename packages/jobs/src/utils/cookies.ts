import {
  loadCookiesForIntegration,
  saveCookiesForIntegration,
} from "@selectio/db";
import type { Cookie } from "crawlee";

/**
 * Сохраняет cookies в базу данных
 */
export async function saveCookies(
  integrationType: string,
  cookies: Cookie[],
): Promise<void> {
  try {
    await saveCookiesForIntegration(integrationType, cookies);
    console.log(`✓ Cookies сохранены для интеграции ${integrationType}`);
  } catch (error) {
    console.error("Ошибка при сохранении cookies:", error);
    throw error;
  }
}

/**
 * Загружает cookies из базы данных
 */
export async function loadCookies(
  integrationType: string,
): Promise<Cookie[] | null> {
  try {
    const cookies = await loadCookiesForIntegration(integrationType);
    if (cookies) {
      console.log(
        `✓ Загружено ${cookies.length} cookies для ${integrationType}`,
      );
    } else {
      console.log(
        `Cookies не найдены для ${integrationType}, требуется авторизация`,
      );
    }
    return cookies;
  } catch (error) {
    console.error("Ошибка при загрузке cookies:", error);
    return null;
  }
}
