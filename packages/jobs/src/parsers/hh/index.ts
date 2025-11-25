import { PuppeteerCrawler } from "crawlee";
import type { CookieParam } from "puppeteer";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { env } from "../../env";
import { loadCookies, performLogin } from "./auth";
import { HH_CONFIG } from "./config";
import { parseResponses } from "./response-parser";
import { parseVacancies } from "./vacancy-parser";

puppeteer.use(StealthPlugin());

export async function runHHParser() {
  const email = env.HH_EMAIL;
  const password = env.HH_PASSWORD;

  console.log("🚀 Запуск парсера hh.ru...");
  console.log(`📧 Email: ${email}`);

  const savedCookies = await loadCookies();

  const startUrl = savedCookies
    ? HH_CONFIG.urls.vacancies
    : HH_CONFIG.urls.login;

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
          (window as any).chrome = {
            runtime: {},
          };

          // Переопределяем permissions
          const originalQuery = window.navigator.permissions.query;
          window.navigator.permissions.query = (
            parameters: PermissionDescriptor
          ) =>
            parameters.name === "notifications"
              ? Promise.resolve({
                  state: Notification.permission,
                } as PermissionStatus)
              : originalQuery(parameters);
        });

        if (savedCookies) {
          log.info("🍪 Восстанавливаем сохраненные куки...");
          await page.setCookie(...(savedCookies as CookieParam[]));
        }

        // Устанавливаем реалистичный User-Agent
        await page.setUserAgent(
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        );

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
          await performLogin(page, log, email, password);
        } else {
          log.info("✅ Форма входа не найдена. Похоже, мы уже авторизованы.");
        }

        const vacancies = await parseVacancies(page);

        for (let i = 0; i < vacancies.length; i++) {
          const vacancy = vacancies[i];
          if (vacancy?.responsesUrl) {
            const fullUrl = new URL(
              vacancy.responsesUrl,
              HH_CONFIG.urls.baseUrl
            ).href;

            // Задержка между обработкой вакансий
            if (i > 0) {
              const delay = Math.floor(Math.random() * 5000) + 3000;
              log.info(
                `⏳ Пауза ${Math.round(delay / 1000)}с перед следующей вакансией...`
              );
              await new Promise((resolve) => setTimeout(resolve, delay));
            }

            await parseResponses(page, fullUrl, vacancy.id);
          }
        }

        await new Promise((resolve) =>
          setTimeout(resolve, HH_CONFIG.delays.afterParsing)
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
    maxRequestsPerCrawl: 1,
    requestHandlerTimeoutSecs: HH_CONFIG.timeouts.requestHandler,
  });

  await crawler.run([startUrl]);
  await crawler.teardown();
}
