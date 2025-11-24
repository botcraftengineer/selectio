import { PuppeteerCrawler } from "crawlee";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { stripHtml } from "string-strip-html";

import { env } from "./env";
import { loadCookies, saveCookies } from "./utils/cookies";

puppeteer.use(StealthPlugin());

/**
 * Скрипт для парсинга откликов на hh.ru
 */
async function runParser() {
  const email = env.HH_EMAIL;
  const password = env.HH_PASSWORD;

  console.log("🚀 Запуск парсера hh.ru...");
  console.log(`📧 Email: ${email}`);

  const savedCookies = await loadCookies();

  const loginUrl =
    "https://hh.ru/account/login?role=employer&backurl=%2F&hhtmFrom=main&hasSwitcher=true&skipSwitcher=true";

  const startUrl = savedCookies
    ? "https://hh.ru/employer/vacancies?hhtmFrom=vacancy"
    : loginUrl;

  const crawler = new PuppeteerCrawler({
    headless: false, // Показываем браузер для отладки
    launchContext: {
      launcher: puppeteer,
      launchOptions: {
        headless: false,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-blink-features=AutomationControlled",
        ],
        ignoreDefaultArgs: ["--enable-automation"],
        slowMo: 50,
      },
    },
    preNavigationHooks: [
      async ({ page, log }) => {
        if (savedCookies) {
          log.info("🍪 Восстанавливаем сохраненные куки...");
          await page.setCookie(...(savedCookies as any[]));
        }
      },
    ],
    async requestHandler({ page, request, log }) {
      log.info(`📄 Обработка страницы: ${request.url}`);

      try {
        log.info("⏳ Ожидание загрузки страницы...");
        await page.waitForNetworkIdle({ timeout: 30000 });

        const loginInput = await page.$('input[type="text"][name="username"]');

        if (loginInput) {
          await performLogin(page, log, email, password);
        } else {
          log.info("✅ Форма входа не найдена. Похоже, мы уже авторизованы.");
        }

        const vacancies = await parseVacancies(page);

        for (const vacancy of vacancies) {
          if (vacancy.responsesUrl) {
            const fullUrl = new URL(vacancy.responsesUrl, "https://hh.ru").href;
            await parseResponses(page, fullUrl);
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 5000));

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
    requestHandlerTimeoutSecs: 300, // 5 минут на обработку (чтобы успеть ввести капчу)
  });

  await crawler.run([startUrl]);
  await crawler.teardown();
}

async function parseVacancies(page: any) {
  const vacanciesUrl = "https://hh.ru/employer/vacancies?hhtmFrom=vacancy";
  console.log(`📄 Переход на страницу вакансий: ${vacanciesUrl}`);

  await page.goto(vacanciesUrl, { waitUntil: "networkidle2" });
  await page.waitForSelector('div[data-qa="vacancies-dashboard-vacancy"]', {
    timeout: 10000,
  });

  const vacancies = await page.$$eval(
    'div[data-qa="vacancies-dashboard-vacancy"]',
    (elements: any[]) => {
      return elements.map((el) => {
        const getText = (selector: string) => {
          const node = el.querySelector(selector);
          return node ? node.textContent.trim() : "";
        };

        const getAttr = (selector: string, attr: string) => {
          const node = el.querySelector(selector);
          return node ? node.getAttribute(attr) : "";
        };

        // Helper to clean numbers (remove non-digits)
        const cleanNumber = (text: string) => text.replace(/\D/g, "");

        return {
          id: el.getAttribute("data-vacancy-id") || "",
          title: getText('[data-qa="vacancies-dashboard-vacancy-name"]'),
          url: getAttr('[data-qa="vacancies-dashboard-vacancy-name"]', "href"),
          views: cleanNumber(
            getText(
              '[data-analytics-button-name="employer_vacancies_counter_views"]',
            ),
          ),
          responses: getText(
            '[data-qa="vacancies-dashboard-vacancy-responses-count-total"]',
          ),
          responsesUrl: getAttr(
            '[data-qa="vacancies-dashboard-vacancy-responses-count-link"]',
            "href",
          ),
          newResponses: getText(
            '[data-qa="vacancies-dashboard-vacancy-responses-count-new"]',
          ),
          resumesInProgress: cleanNumber(
            getText(
              '[data-qa="vacancies-dashboard-vacancy-resumes-in-progress-count"]',
            ),
          ),
          suitableResumes: cleanNumber(
            getText('[data-qa="suitable-resumes-count"]'),
          ),
          region: getText('[data-qa="table-flexible-cell-area"]'),
        };
      });
    },
  );

  console.log(`✅ Найдено активных вакансий: ${vacancies.length}`);

  // Fetch detailed descriptions for each vacancy
  for (const vacancy of vacancies) {
    let vacancyUrl = vacancy.url;

    // If URL is not found, construct it from vacancy ID
    if (!vacancyUrl && vacancy.id) {
      vacancyUrl = `https://hh.ru/vacancy/${vacancy.id}`;
    }

    if (vacancyUrl) {
      const fullUrl = vacancyUrl.startsWith("http")
        ? vacancyUrl
        : new URL(vacancyUrl, "https://hh.ru").href;
      const description = await parseVacancyDetails(page, fullUrl);
      vacancy.description = description;
      vacancy.url = fullUrl; // Update URL in the object
    }
  }

  console.log(JSON.stringify(vacancies, null, 2));
  return vacancies;
}

async function parseVacancyDetails(page: any, url: string): Promise<string> {
  console.log(`📄 Переход на детальную страницу вакансии: ${url}`);
  await page.goto(url, { waitUntil: "networkidle2" });

  try {
    await page.waitForSelector('div[data-qa="main-content"]', {
      timeout: 10000,
    });

    const htmlContent = await page.$eval(
      'div[data-qa="main-content"]',
      (el: HTMLElement) => el.innerHTML,
    );

    const { result } = stripHtml(htmlContent);
    return result.trim();
  } catch (e) {
    console.log("⚠️ Не удалось получить описание вакансии.");
    return "";
  }
}

async function parseResponses(page: any, url: string) {
  console.log(`📄 Переход на страницу откликов: ${url}`);
  await page.goto(url, { waitUntil: "networkidle2" });

  try {
    await page.waitForSelector("[data-resume-id]", { timeout: 10000 });
  } catch (e) {
    console.log("⚠️ Не найдено резюме на странице (возможно, нет откликов).");
    return [];
  }

  const responses = await page.$$eval("[data-resume-id]", (elements: any[]) => {
    return elements.map((el) => {
      const link = el.querySelector('a[data-qa*="serp-item__title"]');
      const url = link ? link.getAttribute("href") : "";
      const nameEl = el.querySelector(
        'span[data-qa="resume-serp__resume-fullname"]',
      );
      const name = nameEl ? nameEl.textContent.trim() : "";

      return {
        name,
        url: url ? new URL(url, "https://hh.ru").href : "",
      };
    });
  });

  console.log(`✅ Найдено откликов: ${responses.length}`);
  console.log(JSON.stringify(responses, null, 2));
  return responses;
}

async function performLogin(
  page: any,
  log: any,
  email: string,
  password: string,
) {
  log.info("🔍 Поиск поля email...");
  await page.waitForSelector('input[type="text"][name="username"]', {
    visible: false,
    timeout: 15000,
  });

  log.info("✍️  Заполнение email...");
  await page.click('input[type="text"][name="username"]', {
    clickCount: 3,
  });
  await page.keyboard.press("Backspace");
  await new Promise((r) => setTimeout(r, Math.random() * 500 + 200));
  await page.type('input[type="text"][name="username"]', email, {
    delay: 100,
  });

  log.info("🔑 Нажатие на кнопку 'Войти с паролем'...");
  await page.waitForSelector('button[data-qa="expand-login-by_password"]', {
    visible: false,
    timeout: 10000,
  });
  await new Promise((r) => setTimeout(r, Math.random() * 1000 + 500));
  await page.click('button[data-qa="expand-login-by_password"]');

  await new Promise((resolve) => setTimeout(resolve, 2000));

  await page.waitForSelector('input[type="password"][name="password"]', {
    visible: false,
  });
  log.info("🔒 Заполнение пароля...");
  await page.type('input[type="password"][name="password"]', password, {
    delay: 100,
  });

  await new Promise((r) => setTimeout(r, Math.random() * 1000 + 500));
  log.info("📤 Отправка формы...");

  await page.click('button[type="submit"]');

  log.info("⏳ Ждем 2 минуты для ввода капчи (если есть)...");
  try {
    await page.waitForNavigation({
      waitUntil: "networkidle2",
      timeout: 120000,
    });
  } catch (e) {
    log.info(
      "⚠️ Тайм-аут ожидания навигации. Проверяем, прошли ли мы дальше...",
    );
  }

  log.info("✅ Авторизация выполнена!");
  log.info(`🌐 Текущий URL: ${page.url()}`);

  const cookies = await page.cookies();
  log.info(`🍪 Получено ${cookies.length} cookies`);

  await saveCookies(cookies);
}

runParser().catch(console.error);
