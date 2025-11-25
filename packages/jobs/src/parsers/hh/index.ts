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
        if (savedCookies) {
          log.info("🍪 Восстанавливаем сохраненные куки...");
          await page.setCookie(...(savedCookies as CookieParam[]));
        }
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

        for (const vacancy of vacancies) {
          if (vacancy.responsesUrl) {
            const fullUrl = new URL(
              vacancy.responsesUrl,
              HH_CONFIG.urls.baseUrl
            ).href;
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
