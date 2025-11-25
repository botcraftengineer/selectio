import { eq } from "@selectio/db";
import { db } from "@selectio/db/client";
import { vacancyResponse } from "@selectio/db/schema";
import type { SaveResponseData } from "../parsers/types";

export async function checkResponseExists(resumeUrl: string): Promise<boolean> {
  try {
    const existingResponse = await db.query.vacancyResponse.findFirst({
      where: eq(vacancyResponse.resumeUrl, resumeUrl),
    });
    return !!existingResponse;
  } catch (error) {
    console.error(`❌ Ошибка проверки существования отклика:`, error);
    return false;
  }
}

export async function saveResponseToDb(response: SaveResponseData) {
  try {
    const existingResponse = await db.query.vacancyResponse.findFirst({
      where: eq(vacancyResponse.resumeUrl, response.resumeUrl),
    });

    if (!existingResponse) {
      await db.insert(vacancyResponse).values({
        vacancyId: response.vacancyId,
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
