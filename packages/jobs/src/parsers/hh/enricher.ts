import { getIntegrationCredentials } from "@selectio/db";
import { Log } from "crawlee";
import type { Browser, Page } from "puppeteer";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import {
  getResponsesWithoutDetails,
  updateResponseDetails,
} from "../../services/response-service";
import { extractTelegramUsername } from "../../services/telegram-username-service";
import { loadCookies, performLogin, saveCookies } from "./auth";
import { HH_CONFIG } from "./config";
import { parseResumeExperience } from "./resume-parser";

puppeteer.use(StealthPlugin());

async function setupBrowser(): Promise<Browser> {
  return await puppeteer.launch({
    headless: HH_CONFIG.puppeteer.headless,
    args: HH_CONFIG.puppeteer.args,
    ignoreDefaultArgs: HH_CONFIG.puppeteer.ignoreDefaultArgs,
    slowMo: HH_CONFIG.puppeteer.slowMo,
  });
}

async function setupPage(
  browser: Browser,
  savedCookies: any[] | null,
): Promise<Page> {
  const page = await browser.newPage();

  // Скрываем признаки автоматизации
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
    window.navigator.permissions.query = (parameters: PermissionDescriptor) =>
      parameters.name === "notifications"
        ? Promise.resolve({
            state: Notification.permission,
          } as PermissionStatus)
        : originalQuery(parameters);
  });

  // Restore cookies
  if (savedCookies && savedCookies.length > 0) {
    console.log("🍪 Восстанавливаем сохраненные куки...");
    await page.setCookie(...savedCookies);
  }

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  );

  await page.setViewport({
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
  });

  return page;
}

async function checkAndPerformLogin(
  page: Page,
  email: string,
  password: string,
) {
  console.log("🔐 Проверка авторизации...");

  await page.goto(HH_CONFIG.urls.login, {
    waitUntil: "domcontentloaded",
    timeout: HH_CONFIG.timeouts.navigation,
  });

  await page.waitForNetworkIdle({
    timeout: HH_CONFIG.timeouts.networkIdle,
  });

  const loginInput = await page.$('input[type="text"][name="username"]');
  if (loginInput) {
    // Create a simple logger wrapper that implements the Log interface
    const log = new Log();

    await performLogin(page, log, email, password);
  } else {
    console.log("✅ Успешно авторизованы");
  }

  // Сохраняем куки после успешной проверки/логина
  const cookies = await page.cookies();
  await saveCookies("hh", cookies);
}

export async function runEnricher() {
  const credentials = await getIntegrationCredentials("hh");
  if (!credentials?.email || !credentials?.password) {
    throw new Error("HH credentials не найдены в интеграциях");
  }

  const { email, password } = credentials;

  console.log("🚀 Запуск обогащения данных резюме...");

  // Получаем список откликов без деталей
  const responsesToEnrich = await getResponsesWithoutDetails();
  console.log(
    `📋 Найдено ${responsesToEnrich.length} откликов без детальной информации`,
  );

  if (responsesToEnrich.length === 0) {
    console.log("✅ Все отклики уже имеют детальную информацию");
    return;
  }

  const savedCookies = await loadCookies("hh");
  const browser = await setupBrowser();

  try {
    const page = await setupPage(browser, savedCookies);

    // Проверяем авторизацию
    await checkAndPerformLogin(page, email, password);

    console.log(`🚀 Начинаем обработку ${responsesToEnrich.length} резюме...`);

    // Последовательно обрабатываем каждое резюме
    for (let i = 0; i < responsesToEnrich.length; i++) {
      const response = responsesToEnrich[i];
      if (!response) continue;
      const { resumeId, vacancyId, candidateName, resumeUrl } = response;

      try {
        // Добавляем случайную задержку между 3-5 секунд для имитации человеческого поведения
        const delay = Math.floor(Math.random() * 2000) + 3000;
        console.log(`⏳ Ожидание ${delay}ms перед обработкой...`);
        await new Promise((resolve) => setTimeout(resolve, delay));

        console.log(
          `📊 [${i + 1}/${responsesToEnrich.length}] Парсинг резюме: ${candidateName}`,
        );

        const experienceData = await parseResumeExperience(page, resumeUrl);

        // Extract Telegram username from contacts if available
        let telegramUsername: string | null = null;
        if (experienceData.contacts) {
          console.log(`🔍 Извлечение Telegram username из контактов...`);
          telegramUsername = await extractTelegramUsername(
            experienceData.contacts,
          );
          if (telegramUsername) {
            console.log(`✅ Найден Telegram username: @${telegramUsername}`);
          } else {
            console.log(`ℹ️ Telegram username не найден в контактах`);
          }
        }

        await updateResponseDetails({
          vacancyId,
          resumeId,
          resumeUrl,
          candidateName: candidateName ?? "",
          experience: experienceData.experience,
          contacts: experienceData.contacts,
          phone: experienceData.phone,
          languages: experienceData.languages,
          about: experienceData.about,
          education: experienceData.education,
          courses: experienceData.courses,
          telegramUsername,
        });

        console.log(`✅ Данные обновлены для: ${candidateName}`);
      } catch (error) {
        console.error(`❌ Ошибка парсинга для ${candidateName}: ${error}`);
        // Продолжаем обработку следующих резюме
      }
    }

    console.log("🎉 Обработка завершена!");
  } catch (error) {
    console.error("❌ Критическая ошибка:", error);
    throw error;
  } finally {
    await browser.close();
  }
}
