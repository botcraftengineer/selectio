import { eq } from "@selectio/db";
import { db } from "@selectio/db/client";
import { vacancyResponse } from "@selectio/db/schema";
import type { SaveResponseData } from "../parsers/types";

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
        experience: response.experience,
        contacts: response.contacts,
      });
      console.log(`✅ Отклик сохранен: ${response.candidateName}`);
    } else {
      console.log(`ℹ️ Отклик уже существует: ${response.candidateName}`);
    }
  } catch (error) {
    console.error(`❌ Ошибка сохранения отклика:`, error);
  }
}
