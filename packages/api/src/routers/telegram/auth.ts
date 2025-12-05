import { db } from "@selectio/db/client";
import { telegramSession } from "@selectio/db/schema";
import { tgClientSDK } from "@selectio/tg-client/sdk";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "../../trpc";

/**
 * Проверяет, требуется ли 2FA и возвращает соответствующий ответ
 */
function handle2FAError(
  error: unknown,
  fallbackSessionData?: string,
): { requiresPassword: true; sessionData: string } | null {
  if (
    error instanceof Error &&
    (error.message.includes("SESSION_PASSWORD_NEEDED") ||
      error.message.includes("2FA is enabled"))
  ) {
    let sessionData: string | undefined;

    // Проверяем наличие data в error с type guard
    if ("data" in error && error.data && typeof error.data === "object") {
      const errorData = error.data as Record<string, unknown>;
      if (
        "sessionData" in errorData &&
        typeof errorData.sessionData === "string" &&
        errorData.sessionData.length > 0
      ) {
        sessionData = errorData.sessionData;
      }
    }

    // Используем fallback только если он валидный
    if (
      !sessionData &&
      fallbackSessionData &&
      typeof fallbackSessionData === "string" &&
      fallbackSessionData.length > 0
    ) {
      sessionData = fallbackSessionData;
    }

    // Если нет валидного sessionData, возвращаем null
    if (!sessionData) {
      return null;
    }

    return {
      requiresPassword: true,
      sessionData,
    };
  }
  return null;
}

/**
 * Отправить код авторизации на телефон
 */
export const sendCodeRouter = protectedProcedure
  .input(
    z.object({
      apiId: z.number(),
      apiHash: z.string(),
      phone: z.string().trim(),
    }),
  )
  .mutation(async ({ input }) => {
    try {
      const phone = input.phone.trim().replace(/\s+/g, "");
      const result = await tgClientSDK.sendCode({
        apiId: input.apiId,
        apiHash: input.apiHash,
        phone,
      });

      return {
        phoneCodeHash: result.phoneCodeHash,
        timeout: result.timeout,
        sessionData: result.sessionData,
      };
    } catch (error) {
      console.error("Ошибка отправки кода:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Ошибка отправки кода",
      });
    }
  });

/**
 * Войти с кодом из SMS
 */
export const signInRouter = protectedProcedure
  .input(
    z.object({
      workspaceId: z.string(),
      apiId: z.number(),
      apiHash: z.string(),
      phone: z.string().trim(),
      phoneCode: z.string().trim(),
      phoneCodeHash: z.string(),
      sessionData: z.string().optional(),
    }),
  )
  .mutation(async ({ input }) => {
    try {
      // Проверяем, есть ли уже сессия для этого workspace
      const existingSession = await db.query.telegramSession.findFirst({
        where: eq(telegramSession.workspaceId, input.workspaceId),
      });

      if (existingSession) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "В этом workspace уже подключен Telegram аккаунт. Удалите существующий аккаунт перед добавлением нового.",
        });
      }

      const phone = input.phone.trim().replace(/\s+/g, "");
      const result = await tgClientSDK.signIn({
        apiId: input.apiId,
        apiHash: input.apiHash,
        phone,
        phoneCode: input.phoneCode.trim(),
        phoneCodeHash: input.phoneCodeHash,
        sessionData: input.sessionData,
      });

      // Сохраняем в БД
      const sessionDataObj = JSON.parse(result.sessionData);
      const [session] = await db
        .insert(telegramSession)
        .values({
          workspaceId: input.workspaceId,
          apiId: input.apiId.toString(),
          apiHash: input.apiHash,
          phone,
          sessionData: sessionDataObj as Record<string, unknown>,
          userInfo: {
            id: result.user.id,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            username: result.user.username,
            phone: result.user.phone,
          },
          lastUsedAt: new Date(),
        })
        .returning();

      return {
        success: true,
        sessionId: session?.id,
        user: result.user,
      };
    } catch (error) {
      console.error("Ошибка авторизации:", error);

      const twoFAResponse = handle2FAError(error, input.sessionData);
      if (twoFAResponse) {
        return {
          success: false,
          ...twoFAResponse,
        };
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Ошибка авторизации",
      });
    }
  });

/**
 * Войти с паролем 2FA
 */
export const checkPasswordRouter = protectedProcedure
  .input(
    z.object({
      workspaceId: z.string(),
      apiId: z.number(),
      apiHash: z.string(),
      phone: z.string().trim(),
      password: z.string(),
      sessionData: z.string(),
    }),
  )
  .mutation(async ({ input }) => {
    try {
      // Проверяем, есть ли уже сессия для этого workspace
      const existingSession = await db.query.telegramSession.findFirst({
        where: eq(telegramSession.workspaceId, input.workspaceId),
      });

      if (existingSession) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "В этом workspace уже подключен Telegram аккаунт. Удалите существующий аккаунт перед добавлением нового.",
        });
      }

      const phone = input.phone.trim().replace(/\s+/g, "");
      const result = await tgClientSDK.checkPassword({
        apiId: input.apiId,
        apiHash: input.apiHash,
        phone,
        password: input.password,
        sessionData: input.sessionData,
      });

      // Сохраняем в БД
      const sessionDataObj = JSON.parse(result.sessionData);
      const [session] = await db
        .insert(telegramSession)
        .values({
          workspaceId: input.workspaceId,
          apiId: input.apiId.toString(),
          apiHash: input.apiHash,
          phone,
          sessionData: sessionDataObj as Record<string, unknown>,
          userInfo: {
            id: result.user.id,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            username: result.user.username,
            phone: result.user.phone,
          },
          lastUsedAt: new Date(),
        })
        .returning();

      return {
        success: true,
        sessionId: session?.id,
        user: result.user,
      };
    } catch (error) {
      console.error("Ошибка проверки пароля:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Неверный пароль",
      });
    }
  });

/**
 * Получить список сессий
 */
export const getSessionsRouter = protectedProcedure
  .input(z.object({ workspaceId: z.string() }))
  .query(async ({ input }) => {
    const sessions = await db
      .select()
      .from(telegramSession)
      .where(eq(telegramSession.workspaceId, input.workspaceId));

    return sessions.map((s) => ({
      id: s.id,
      phone: s.phone,
      userInfo: s.userInfo,
      isActive: s.isActive,
      authError: s.authError,
      authErrorAt: s.authErrorAt,
      lastUsedAt: s.lastUsedAt,
      createdAt: s.createdAt,
    }));
  });

/**
 * Удалить сессию
 */
export const deleteSessionRouter = protectedProcedure
  .input(z.object({ sessionId: z.string(), workspaceId: z.string() }))
  .mutation(async ({ input }) => {
    const result = await db
      .delete(telegramSession)
      .where(
        and(
          eq(telegramSession.id, input.sessionId),
          eq(telegramSession.workspaceId, input.workspaceId),
        ),
      )
      .returning();

    if (result.length === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Сессия не найдена",
      });
    }

    return { success: true };
  });

/**
 * Получить статус сессии
 */
export const getSessionStatusRouter = protectedProcedure
  .input(z.object({ sessionId: z.string(), workspaceId: z.string() }))
  .query(async ({ input }) => {
    const [session] = await db
      .select()
      .from(telegramSession)
      .where(
        and(
          eq(telegramSession.id, input.sessionId),
          eq(telegramSession.workspaceId, input.workspaceId),
        ),
      )
      .limit(1);

    if (!session) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Сессия не найдена",
      });
    }

    return {
      id: session.id,
      phone: session.phone,
      isActive: session.isActive,
      authError: session.authError,
      authErrorAt: session.authErrorAt,
      authErrorNotifiedAt: session.authErrorNotifiedAt,
      lastUsedAt: session.lastUsedAt,
      userInfo: session.userInfo,
    };
  });

/**
 * Очистить ошибку авторизации (перед повторной авторизацией)
 */
export const clearAuthErrorRouter = protectedProcedure
  .input(z.object({ sessionId: z.string(), workspaceId: z.string() }))
  .mutation(async ({ input }) => {
    const result = await db
      .update(telegramSession)
      .set({
        authError: null,
        authErrorAt: null,
        authErrorNotifiedAt: null,
        isActive: true,
      })
      .where(
        and(
          eq(telegramSession.id, input.sessionId),
          eq(telegramSession.workspaceId, input.workspaceId),
        ),
      )
      .returning();

    if (result.length === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Сессия не найдена",
      });
    }

    return { success: true };
  });

/**
 * Обновить существующую сессию (реавторизация)
 */
export const reauthorizeSessionRouter = protectedProcedure
  .input(
    z.object({
      sessionId: z.string(),
      workspaceId: z.string(),
      apiId: z.number(),
      apiHash: z.string(),
      phone: z.string().trim(),
      phoneCode: z.string().trim(),
      phoneCodeHash: z.string(),
      sessionData: z.string().optional(),
    }),
  )
  .mutation(async ({ input }) => {
    try {
      const phone = input.phone.trim().replace(/\s+/g, "");
      const result = await tgClientSDK.signIn({
        apiId: input.apiId,
        apiHash: input.apiHash,
        phone,
        phoneCode: input.phoneCode.trim(),
        phoneCodeHash: input.phoneCodeHash,
        sessionData: input.sessionData,
      });

      // Обновляем существующую сессию с проверкой workspace
      const sessionDataObj = JSON.parse(result.sessionData);
      const updated = await db
        .update(telegramSession)
        .set({
          sessionData: sessionDataObj as Record<string, unknown>,
          userInfo: {
            id: result.user.id,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            username: result.user.username,
            phone: result.user.phone,
          },
          isActive: true,
          authError: null,
          authErrorAt: null,
          authErrorNotifiedAt: null,
          lastUsedAt: new Date(),
        })
        .where(
          and(
            eq(telegramSession.id, input.sessionId),
            eq(telegramSession.workspaceId, input.workspaceId),
          ),
        )
        .returning();

      if (updated.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Сессия не найдена",
        });
      }

      return {
        success: true,
        sessionId: input.sessionId,
        user: result.user,
      };
    } catch (error) {
      console.error("Ошибка реавторизации:", error);

      const twoFAResponse = handle2FAError(error, input.sessionData);
      if (twoFAResponse) {
        return {
          success: false,
          ...twoFAResponse,
        };
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Ошибка реавторизации",
      });
    }
  });
