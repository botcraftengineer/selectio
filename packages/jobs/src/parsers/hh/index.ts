import { getIntegrationWithCredentials } from "@selectio/db";
import { PuppeteerCrawler } from "crawlee";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { loadCookies, performLogin } from "./auth";
import { HH_CONFIG } from "./config";
import { parseResponses } from "./response-parser";
import { parseVacancies } from "./vacancy-parser";

puppeteer.use(StealthPlugin());

export { refreshVacancyResponses } from "./refresh-responses";

export async function runHHParser(options?: {
  skipResponses?: boolean;
  workspaceId?: string;
}) {
  const integration = await getIntegrationWithCredentials(
    "hh",
    options?.workspaceId,
  );
  if (!integration?.credentials?.email || !integration?.credentials?.password) {
    throw new Error("HH credentials не найдены в интеграциях");
  }

  const { email, password } = integration.credentials;
  const { workspaceId } = integration;

  console.log("🚀 Запуск парсера hh.ru...");
  console.log(`📧 Email: ${email}`);

  const savedCookies = await loadCookies("hh", workspaceId);

  // Всегда начинаем с страницы логина, чтобы проверить актуальность сессии
  const startUrl = HH_CONFIG.urls.login;

  const crawler = new PuppeteerCrawler({
    headless: HH_CONFIG.puppeteer.headless,
    launchContext: {
      launcher: puppeteer,
      launchOptions: {
        headless: HH_CONFIG.puppeteer.headless,
        args: HH_CONFIG.puppeteer.args,
        ignoreDefaultArgs: HH_CONFIG.puppeteer.ignoreDefaultArgs,
        slowMo: HH_CONFIG.puppeteer.slowMo,
      },
    },
    preNavigationHooks: [
      async ({ page, log }) => {
        // Скрываем признаки автоматизации
        await page.evaluateOnNewDocument(() => {
          // Переопределяем navigator.webdriver
          Object.defineProperty(navigator, "webdriver", {
            get: () => false,
          });

          // Добавляем реалистичные плагины
          Object.defineProperty(navigator, "plugins", {
            get: () => [1, 2, 3, 4, 5],
          });

          // Добавляем языки
          Object.defineProperty(navigator, "languages", {
            get: () => ["ru-RU", "ru", "en-US", "en"],
          });

          // Скрываем автоматизацию Chrome
          (window as { chrome?: unknown }).chrome = {
            runtime: {},
          };

          // Переопределяем permissions
          const originalQuery = window.navigator.permissions.query;
          window.navigator.permissions.query = (
            parameters: PermissionDescriptor,
          ) =>
            parameters.name === "notifications"
              ? Promise.resolve({
                  state: Notification.permission,
                } as PermissionStatus)
              : originalQuery(parameters);
        });

        if (savedCookies) {
          log.info("🍪 Восстанавливаем сохраненные куки...");
          await page.browserContext().setCookie(...(savedCookies as never[]));
        }

        // Устанавливаем реалистичный User-Agent
        await page.setUserAgent({
          userAgent: HH_CONFIG.userAgent,
        });

        // Устанавливаем viewport как у обычного пользователя
        await page.setViewport({
          width: 1920,
          height: 1080,
          deviceScaleFactor: 1,
        });
      },
    ],
    async requestHandler({ page, request, log }) {
      log.info(`📄 Обработка страницы: ${request.url}`);

      try {
        log.info("⏳ Ожидание загрузки страницы...");
        await page.waitForNetworkIdle({
          timeout: HH_CONFIG.timeouts.networkIdle,
        });

        const loginInput = await page.$('input[type="text"][name="username"]');

        if (loginInput) {
          await performLogin(page, log, email, password, workspaceId);
        } else {
          log.info("✅ Форма входа не найдена. Похоже, мы уже авторизованы.");
        }

        const vacancies = await parseVacancies(page, workspaceId);

        // Если запрошено только обновление вакансий, пропускаем обработку откликов
        if (options?.skipResponses) {
          log.info("⏭️ Пропуск обработки откликов (skipResponses=true)");
        } else {
          // Последовательная обработка откликов для каждой вакансии
          for (let i = 0; i < vacancies.length; i++) {
            const vacancy = vacancies[i];
            if (!vacancy?.responsesUrl) {
              log.info(
                `⏭️ Пропуск вакансии ${i + 1}/${vacancies.length}: нет откликов`,
              );
              continue;
            }

            try {
              const fullUrl = new URL(
                vacancy.responsesUrl,
                HH_CONFIG.urls.baseUrl,
              ).href;

              // Задержка между обработкой вакансий
              if (i > 0) {
                const delay = Math.floor(Math.random() * 5000) + 3000;
                log.info(
                  `⏳ Пауза ${Math.round(delay / 1000)}с перед следующей вакансией...`,
                );
                await new Promise((resolve) => setTimeout(resolve, delay));
              }

              log.info(
                `\n📋 Обработка вакансии ${i + 1}/${vacancies.length}: ${vacancy.title}`,
              );
              await parseResponses(page, fullUrl, vacancy.id);
              log.info(
                `✅ Вакансия ${i + 1}/${vacancies.length} обработана успешно`,
              );
            } catch (error) {
              const errorMessage =
                error instanceof Error ? error.message : String(error);
              log.error(
                `❌ Ошибка обработки вакансии ${vacancy.title}: ${errorMessage}`,
              );

              // Продолжаем работу со следующей вакансией
              log.info(`⏭️ Переход к следующей вакансии...`);

              // Дополнительная пауза после ошибки
              await new Promise((resolve) => setTimeout(resolve, 5000));
            }
          }
        }

        await new Promise((resolve) =>
          setTimeout(resolve, HH_CONFIG.delays.afterParsing),
        );

        console.log("\n✨ Парсинг успешно завершен!");
      } catch (error) {
        if (error instanceof Error) {
          log.error(error.message);
          if (error.stack) {
            log.error(error.stack);
          }
        } else {
          log.error(String(error));
        }
        throw error;
      }
    },
    maxRequestsPerCrawl: 100,
    requestHandlerTimeoutSecs: HH_CONFIG.timeouts.requestHandler,
  });

  await crawler.run([startUrl]);
  await crawler.teardown();
}
