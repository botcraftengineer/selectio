import { eq, isNull, or } from "@selectio/db";
import { db } from "@selectio/db/client";
import { vacancyResponse } from "@selectio/db/schema";
import type { SaveResponseData } from "../parsers/types";

export async function checkResponseExists(resumeId: string): Promise<boolean> {
  try {
    const existingResponse = await db.query.vacancyResponse.findFirst({
      where: eq(vacancyResponse.resumeId, resumeId),
    });
    return !!existingResponse;
  } catch (error) {
    console.error(`❌ Ошибка проверки существования отклика:`, error);
    return false;
  }
}

/**
 * Сохраняет базовую информацию об отклике (без детальной информации резюме)
 * @returns true если отклик был сохранен, false если уже существовал
 */
export async function saveBasicResponse(
  vacancyId: string,
  resumeId: string,
  resumeUrl: string,
  candidateName: string
): Promise<boolean> {
  try {
    const existingResponse = await db.query.vacancyResponse.findFirst({
      where: eq(vacancyResponse.resumeId, resumeId),
    });

    if (!existingResponse) {
      await db.insert(vacancyResponse).values({
        vacancyId,
        resumeId,
        resumeUrl,
        candidateName,
        status: "NEW",
        experience: "",
        contacts: null,
        languages: "",
        about: "",
        education: "",
        courses: "",
      });
      console.log(`✅ Базовая информация сохранена: ${candidateName}`);
      return true;
    }

    console.log(`⏭️ Пропуск: ${candidateName} (уже в базе)`);
    return false;
  } catch (error) {
    console.error(
      `❌ Ошибка сохранения базовой информации для ${candidateName}:`,
      error
    );
    throw error; // Пробрасываем ошибку для обработки на верхнем уровне
  }
}

/**
 * Проверяет, есть ли у отклика детальная информация (опыт, контакты и т.д.)
 */
export async function hasDetailedInfo(resumeId: string): Promise<boolean> {
  try {
    const response = await db.query.vacancyResponse.findFirst({
      where: eq(vacancyResponse.resumeId, resumeId),
    });

    if (!response) return false;

    // Считаем, что детальная информация есть, если заполнен опыт или контакты
    return !!(response.experience || response.contacts);
  } catch (error) {
    console.error(`❌ Ошибка проверки детальной информации:`, error);
    return false;
  }
}

/**
 * Обновляет детальную информацию существующего отклика
 */
export async function updateResponseDetails(response: SaveResponseData) {
  try {
    await db
      .update(vacancyResponse)
      .set({
        experience: response.experience,
        contacts: response.contacts,
        languages: response.languages,
        about: response.about,
        education: response.education,
        courses: response.courses,
      })
      .where(eq(vacancyResponse.resumeId, response.resumeId));

    console.log(`✅ Детальная информация обновлена: ${response.candidateName}`);
  } catch (error) {
    console.error(
      `❌ Ошибка обновления детальной информации для ${response.candidateName}:`,
      error
    );
    throw error; // Пробрасываем ошибку для обработки на верхнем уровне
  }
}

/**
 * Получает все отклики без детальной информации
 */
export async function getResponsesWithoutDetails() {
  try {
    return await db.query.vacancyResponse.findMany({
      where: or(
        isNull(vacancyResponse.experience),
        eq(vacancyResponse.experience, "")
      ),
    });
  } catch (error) {
    console.error(`❌ Ошибка получения откликов без деталей:`, error);
    return [];
  }
}

export async function saveResponseToDb(response: SaveResponseData) {
  try {
    const existingResponse = await db.query.vacancyResponse.findFirst({
      where: eq(vacancyResponse.resumeId, response.resumeId),
    });

    if (!existingResponse) {
      await db.insert(vacancyResponse).values({
        vacancyId: response.vacancyId,
        resumeId: response.resumeId,
        resumeUrl: response.resumeUrl,
        candidateName: response.candidateName,
        status: "NEW",
        experience: response.experience,
        contacts: response.contacts,
        languages: response.languages,
        about: response.about,
        education: response.education,
        courses: response.courses,
      });
      console.log(`✅ Отклик сохранен: ${response.candidateName}`);
    } else {
      console.log(`ℹ️ Отклик уже существует: ${response.candidateName}`);
    }
  } catch (error) {
    console.error(`❌ Ошибка сохранения отклика:`, error);
  }
}
