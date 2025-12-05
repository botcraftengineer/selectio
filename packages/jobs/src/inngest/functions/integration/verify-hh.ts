import { db, eq } from "@selectio/db";
import { integration } from "@selectio/db/schema";
import axios from "axios";
import { verifyIntegrationChannel } from "../../channels-client";
import { inngest } from "../../client";

/**
 * Проверяет валидность интеграции HH
 * Делает тестовый запрос к API HH для проверки cookies/credentials
 */
export const verifyHHIntegrationFunction = inngest.createFunction(
  {
    id: "verify-hh-integration",
    name: "Verify HeadHunter Integration",
    retries: 1,
  },
  { event: "integration/hh.verify" },
  async ({ event, step, publish }) => {
    const { integrationId, workspaceId } = event.data;

    return await step.run("verify-hh-integration", async () => {
      console.log(`🔍 Проверяем интеграцию HH: ${integrationId}`);

      // Получаем интеграцию
      const hhIntegration = await db.query.integration.findFirst({
        where: (fields, { and }) =>
          and(
            eq(fields.id, integrationId),
            eq(fields.workspaceId, workspaceId),
            eq(fields.type, "hh"),
          ),
      });

      if (!hhIntegration) {
        throw new Error("Интеграция HH не найдена");
      }

      if (!hhIntegration.cookies || hhIntegration.cookies.length === 0) {
        throw new Error("Cookies для HH не найдены");
      }

      // Проверяем наличие credentials
      if (!hhIntegration.credentials) {
        throw new Error("Credentials для HH не найдены");
      }

      // Извлекаем username и password из credentials
      const credentials = hhIntegration.credentials as {
        username?: string;
        email?: string;
        password?: string;
      };

      const username = credentials.username || credentials.email;
      const password = credentials.password;

      if (!username || !password) {
        throw new Error(
          "Некорректные credentials: отсутствует username/email или password",
        );
      }

      // Формируем Cookie header
      const cookieHeader = hhIntegration.cookies
        .map((cookie) => `${cookie.name}=${cookie.value}`)
        .join("; ");

      try {
        // Сначала делаем GET запрос для получения XSRF токена
        const getResponse = await axios.get(
          "https://hh.ru/account/login?backurl=%2F&role=employer",
          {
            headers: {
              Accept:
                "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
              Cookie: cookieHeader,
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            },
            maxRedirects: 0,
            validateStatus: (status) => status < 400,
          },
        );

        // Извлекаем XSRF токен из cookies
        const setCookieHeaders = getResponse.headers["set-cookie"] || [];
        let xsrfToken = "";

        for (const cookie of setCookieHeaders) {
          const match = cookie.match(/x-xsrftoken=([^;]+)/i);
          if (match?.[1]) {
            xsrfToken = match[1];
            break;
          }
        }

        // Если токен не найден в новых cookies, ищем в существующих
        if (!xsrfToken) {
          const existingXsrfCookie = hhIntegration.cookies.find(
            (c) => c.name.toLowerCase() === "x-xsrftoken",
          );
          if (existingXsrfCookie) {
            xsrfToken = existingXsrfCookie.value;
          }
        }

        if (!xsrfToken) {
          throw new Error("XSRF токен не найден");
        }

        // Формируем данные для POST запроса
        const formData = new URLSearchParams();
        formData.append("failUrl", "/account/login?backurl=%2F&role=employer");
        formData.append("accountType", "EMPLOYER");
        formData.append("role", "employer");
        formData.append("remember", "yes");
        formData.append("username", username);
        formData.append("password", password);

        // Делаем POST запрос для проверки авторизации
        const response = await axios.post(
          "https://hh.ru/account/login?backurl=%2F&role=employer",
          formData.toString(),
          {
            headers: {
              Accept:
                "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
              "Content-Type": "application/x-www-form-urlencoded",
              Cookie: `${cookieHeader}; x-xsrftoken=${xsrfToken}`,
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
              "X-Xsrftoken": xsrfToken,
            },
            maxRedirects: 0,
            validateStatus: (status) => status < 400 || status === 302,
          },
        );

        // Проверяем успешность авторизации
        const isLoginPage =
          response.request?.path?.includes("/login") ||
          response.data?.includes("account.login") ||
          response.status === 302;

        if (isLoginPage && response.headers.location?.includes("/login")) {
          console.log(
            "❌ Интеграция HH невалидна: требуется повторная авторизация",
          );

          // Деактивируем интеграцию
          await db
            .update(integration)
            .set({
              isActive: false,
              metadata: {
                ...((hhIntegration.metadata as Record<string, unknown>) || {}),
                lastVerificationError: "Требуется повторная авторизация",
                lastVerificationAt: new Date().toISOString(),
              },
            })
            .where(eq(integration.id, integrationId));

          // Публикуем результат в realtime
          await publish(
            verifyIntegrationChannel(workspaceId)["integration-verify"]({
              integrationId,
              integrationType: "hh",
              success: false,
              isValid: false,
              error: "Требуется повторная авторизация",
            }),
          );

          return {
            success: false,
            isValid: false,
            error: "Требуется повторная авторизация",
          };
        }

        // Интеграция валидна
        console.log("✅ Интеграция HH валидна");

        await db
          .update(integration)
          .set({
            isActive: true,
            lastUsedAt: new Date(),
            metadata: {
              ...((hhIntegration.metadata as Record<string, unknown>) || {}),
              lastVerificationAt: new Date().toISOString(),
            },
          })
          .where(eq(integration.id, integrationId));

        // Публикуем результат в realtime
        await publish(
          verifyIntegrationChannel(workspaceId)["integration-verify"]({
            integrationId,
            integrationType: "hh",
            success: true,
            isValid: true,
          }),
        );

        return {
          success: true,
          isValid: true,
        };
      } catch (error) {
        console.error("❌ Ошибка при проверке интеграции HH:", error);

        // Деактивируем интеграцию при ошибке
        await db
          .update(integration)
          .set({
            isActive: false,
            metadata: {
              ...((hhIntegration.metadata as Record<string, unknown>) || {}),
              lastVerificationError:
                error instanceof Error ? error.message : "Неизвестная ошибка",
              lastVerificationAt: new Date().toISOString(),
            },
          })
          .where(eq(integration.id, integrationId));

        const errorMessage =
          error instanceof Error ? error.message : "Неизвестная ошибка";

        // Публикуем результат в realtime
        await publish(
          verifyIntegrationChannel(workspaceId)["integration-verify"]({
            integrationId,
            integrationType: "hh",
            success: false,
            isValid: false,
            error: errorMessage,
          }),
        );

        return {
          success: false,
          isValid: false,
          error: errorMessage,
        };
      }
    });
  },
);
