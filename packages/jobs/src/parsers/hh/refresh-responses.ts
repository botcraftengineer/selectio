import { getIntegrationCredentials } from "@selectio/db";
import { PuppeteerCrawler } from "crawlee";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { loadCookies, performLogin } from "./auth";
import { HH_CONFIG } from "./config";
import { parseResponses } from "./response-parser";

puppeteer.use(StealthPlugin());

/**
 * Парсит только новые отклики для конкретной вакансии
 * Не парсит саму вакансию, только обновляет список откликов
 */
export async function refreshVacancyResponses(vacancyId: string) {
  console.log(`🔄 Обновление откликов для вакансии ${vacancyId}...`);

  const credentials = await getIntegrationCredentials("hh");
  if (!credentials?.email || !credentials?.password) {
    throw new Error("HH credentials не найдены в интеграциях");
  }

  const { email, password } = credentials;
  const savedCookies = await loadCookies("hh");
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
        await page.evaluateOnNewDocument(() => {
          Object.defineProperty(navigator, "webdriver", {
            get: () => false,
          });

          Object.defineProperty(navigator, "plugins", {
            get: () => [1, 2, 3, 4, 5],
          });

          Object.defineProperty(navigator, "languages", {
            get: () => ["ru-RU", "ru", "en-US", "en"],
          });

          (window as any).chrome = {
            runtime: {},
          };

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
          await page.browserContext().setCookie(...(savedCookies as any[]));
        }

        await page.setUserAgent({
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        });

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
          await performLogin(page, log, email, password);
        } else {
          log.info("✅ Форма входа не найдена. Похоже, мы уже авторизованы.");
        }

        // Формируем URL для откликов конкретной вакансии
        const responsesUrl = `https://hh.ru/employer/vacancyresponses?vacancyId=${vacancyId}&order=DATE`;

        log.info(`📋 Парсинг откликов для вакансии ${vacancyId}...`);
        await parseResponses(page, responsesUrl, vacancyId);
        log.info(`✅ Отклики для вакансии ${vacancyId} обновлены успешно`);

        await new Promise((resolve) =>
          setTimeout(resolve, HH_CONFIG.delays.afterParsing),
        );

        console.log("\n✨ Обновление откликов завершено!");
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
    maxRequestsPerCrawl: 1,
    requestHandlerTimeoutSecs: HH_CONFIG.timeouts.requestHandler,
  });

  await crawler.run([startUrl]);
  await crawler.teardown();
}
