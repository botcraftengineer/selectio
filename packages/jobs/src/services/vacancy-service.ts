import { eq, isNull, or } from "@selectio/db";
import { db } from "@selectio/db/client";
import { vacancy } from "@selectio/db/schema";
import type { VacancyData } from "../parsers/types";

/**
 * Проверяет, существует ли вакансия в базе
 */
export async function checkVacancyExists(vacancyId: string): Promise<boolean> {
  try {
    const existingVacancy = await db.query.vacancy.findFirst({
      where: eq(vacancy.id, vacancyId),
    });
    return !!existingVacancy;
  } catch (error) {
    console.error(`❌ Ошибка проверки существования вакансии:`, error);
    return false;
  }
}

/**
 * Проверяет, есть ли у вакансии описание
 */
export async function hasVacancyDescription(
  vacancyId: string
): Promise<boolean> {
  try {
    const existingVacancy = await db.query.vacancy.findFirst({
      where: eq(vacancy.id, vacancyId),
    });

    if (!existingVacancy) return false;

    return !!(
      existingVacancy.description && existingVacancy.description.trim()
    );
  } catch (error) {
    console.error(`❌ Ошибка проверки описания вакансии:`, error);
    return false;
  }
}

/**
 * Сохраняет базовую информацию о вакансии (без описания)
 */
export async function saveBasicVacancy(vacancyData: VacancyData) {
  try {
    const existingVacancy = await db.query.vacancy.findFirst({
      where: eq(vacancy.id, vacancyData.id),
    });

    const dataToSave = {
      id: vacancyData.id,
      title: vacancyData.title,
      url: vacancyData.url || undefined,
      views: Number.parseInt(vacancyData.views, 10) || 0,
      responses: Number.parseInt(vacancyData.responses, 10) || 0,
      newResponses: Number.parseInt(vacancyData.newResponses, 10) || 0,
      resumesInProgress:
        Number.parseInt(vacancyData.resumesInProgress, 10) || 0,
      suitableResumes: Number.parseInt(vacancyData.suitableResumes, 10) || 0,
      region: vacancyData.region,
      description: "",
      isActive: true,
    };

    if (existingVacancy) {
      await db
        .update(vacancy)
        .set(dataToSave)
        .where(eq(vacancy.id, vacancyData.id));
      console.log(`✅ Базовая информация обновлена: ${vacancyData.title}`);
    } else {
      await db.insert(vacancy).values(dataToSave);
      console.log(`✅ Базовая информация сохранена: ${vacancyData.title}`);
    }
  } catch (error) {
    console.error(
      `❌ Ошибка сохранения базовой информации для ${vacancyData.title}:`,
      error
    );
    throw error; // Пробрасываем ошибку для обработки на верхнем уровне
  }
}

/**
 * Обновляет описание вакансии
 */
export async function updateVacancyDescription(
  vacancyId: string,
  description: string
) {
  try {
    await db
      .update(vacancy)
      .set({ description })
      .where(eq(vacancy.id, vacancyId));
    console.log(`✅ Описание вакансии обновлено: ${vacancyId}`);
  } catch (error) {
    console.error(
      `❌ Ошибка обновления описания вакансии ${vacancyId}:`,
      error
    );
    throw error; // Пробрасываем ошибку для обработки на верхнем уровне
  }
}

/**
 * Получает все вакансии без описания
 */
export async function getVacanciesWithoutDescription() {
  try {
    return await db.query.vacancy.findMany({
      where: or(isNull(vacancy.description), eq(vacancy.description, "")),
    });
  } catch (error) {
    console.error(`❌ Ошибка получения вакансий без описания:`, error);
    return [];
  }
}

export async function saveVacancyToDb(vacancyData: VacancyData) {
  try {
    const existingVacancy = await db.query.vacancy.findFirst({
      where: eq(vacancy.id, vacancyData.id),
    });

    const dataToSave = {
      id: vacancyData.id,
      title: vacancyData.title,
      url: vacancyData.url || undefined,
      views: Number.parseInt(vacancyData.views, 10) || 0,
      responses: Number.parseInt(vacancyData.responses, 10) || 0,
      newResponses: Number.parseInt(vacancyData.newResponses, 10) || 0,
      resumesInProgress:
        Number.parseInt(vacancyData.resumesInProgress, 10) || 0,
      suitableResumes: Number.parseInt(vacancyData.suitableResumes, 10) || 0,
      region: vacancyData.region,
      description: vacancyData.description,
      isActive: true,
    };

    if (existingVacancy) {
      await db
        .update(vacancy)
        .set(dataToSave)
        .where(eq(vacancy.id, vacancyData.id));
      console.log(`✅ Вакансия обновлена: ${vacancyData.title}`);
    } else {
      await db.insert(vacancy).values(dataToSave);
      console.log(`✅ Вакансия создана: ${vacancyData.title}`);
    }
  } catch (error) {
    console.error(`❌ Ошибка сохранения вакансии ${vacancyData.id}:`, error);
  }
}
