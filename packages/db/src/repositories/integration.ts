import type { Cookie } from "crawlee";
import { and, eq } from "drizzle-orm";
import { db } from "../client";
import { integration, type NewIntegration } from "../schema";
import { decryptCredentials, encryptCredentials } from "../utils/encryption";

/**
 * Получить интеграцию по типу и userId
 */
export async function getIntegration(userId: string, type: string) {
  const result = await db
    .select()
    .from(integration)
    .where(and(eq(integration.userId, userId), eq(integration.type, type)))
    .limit(1);

  return result[0] ?? null;
}

/**
 * Создать или обновить интеграцию
 */
export async function upsertIntegration(data: NewIntegration) {
  const existing = await getIntegration(data.userId, data.type);

  // Шифруем credentials перед сохранением
  const encryptedData = {
    ...data,
    credentials: encryptCredentials(data.credentials as Record<string, string>),
  };

  if (existing) {
    const [updated] = await db
      .update(integration)
      .set({
        ...encryptedData,
        updatedAt: new Date(),
      })
      .where(eq(integration.id, existing.id))
      .returning();

    if (!updated) throw new Error("Failed to update integration");
    return updated;
  }

  const [created] = await db
    .insert(integration)
    .values(encryptedData)
    .returning();
  if (!created) throw new Error("Failed to create integration");
  return created;
}

/**
 * Сохранить cookies для интеграции
 */
export async function saveCookiesForIntegration(
  userId: string,
  type: string,
  cookies: Cookie[]
) {
  const existing = await getIntegration(userId, type);

  if (!existing) {
    throw new Error(`Integration ${type} not found for user ${userId}`);
  }

  await db
    .update(integration)
    .set({
      cookies: cookies as unknown as typeof integration.$inferInsert.cookies,
      lastUsedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(integration.id, existing.id));
}

/**
 * Загрузить cookies для интеграции
 */
export async function loadCookiesForIntegration(
  userId: string,
  type: string
): Promise<Cookie[] | null> {
  const result = await getIntegration(userId, type);

  if (!result?.cookies) {
    return null;
  }

  return result.cookies as Cookie[];
}

/**
 * Получить credentials для интеграции (расшифрованные)
 */
export async function getIntegrationCredentials(
  userId: string,
  type: string
): Promise<Record<string, string> | null> {
  const result = await getIntegration(userId, type);
  if (!result?.credentials) {
    return null;
  }

  // Расшифровываем credentials перед возвратом
  return decryptCredentials(result.credentials as Record<string, string>);
}

/**
 * Обновить время последнего использования
 */
export async function updateLastUsed(userId: string, type: string) {
  const existing = await getIntegration(userId, type);

  if (existing) {
    await db
      .update(integration)
      .set({
        lastUsedAt: new Date(),
      })
      .where(eq(integration.id, existing.id));
  }
}

/**
 * Получить все интеграции пользователя
 */
export async function getUserIntegrations(userId: string) {
  return db.select().from(integration).where(eq(integration.userId, userId));
}

/**
 * Удалить интеграцию
 */
export async function deleteIntegration(userId: string, type: string) {
  const existing = await getIntegration(userId, type);

  if (existing) {
    await db.delete(integration).where(eq(integration.id, existing.id));
  }
}
