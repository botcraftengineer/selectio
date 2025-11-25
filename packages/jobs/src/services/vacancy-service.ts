import { eq } from "@selectio/db";
import { db } from "@selectio/db/client";
import { vacancy } from "@selectio/db/schema";
import type { VacancyData } from "../parsers/types";

export async function saveVacancyToDb(vacancyData: VacancyData) {
  try {
    const existingVacancy = await db.query.vacancy.findFirst({
      where: eq(vacancy.id, vacancyData.id),
    });

    const dataToSave = {
      id: vacancyData.id,
      title: vacancyData.title,
      url: vacancyData.url || undefined,
      views: Number.parseInt(vacancyData.views) || 0,
      responses: Number.parseInt(vacancyData.responses) || 0,
      newResponses: Number.parseInt(vacancyData.newResponses) || 0,
      resumesInProgress: Number.parseInt(vacancyData.resumesInProgress) || 0,
      suitableResumes: Number.parseInt(vacancyData.suitableResumes) || 0,
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
