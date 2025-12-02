import os from "node:os";
import { db, eq, getIntegrationCredentials } from "@selectio/db";
import { vacancyResponse } from "@selectio/db/schema";
import { Log } from "crawlee";
import type { Browser, Page } from "puppeteer";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { loadCookies, performLogin, saveCookies } from "../parsers/hh/auth";
import { HH_CONFIG } from "../parsers/hh/config";
import { parseResumeExperience } from "../parsers/hh/resume-parser";
import { updateResponseDetails } from "../services/response-service";
import { extractTelegramUsername } from "../services/telegram-username-service";
import { inngest } from "./client";

puppeteer.use(StealthPlugin());

// Configure Crawlee storage to use temp directory
process.env.CRAWLEE_STORAGE_DIR = os.tmpdir();

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
  savedCookies: Parameters<Page["setCookie"]> | null,
): Promise<Page> {
  const page = await browser.newPage();

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
    (window as { chrome?: unknown }).chrome = {
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

  if (savedCookies && savedCookies.length > 0) {
    await page.setCookie(...savedCookies);
  }

  await page.setUserAgent({
    userAgent: HH_CONFIG.userAgent,
  });

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
  await page.goto(HH_CONFIG.urls.login, {
    waitUntil: "domcontentloaded",
    timeout: HH_CONFIG.timeouts.navigation,
  });

  await page.waitForNetworkIdle({
    timeout: HH_CONFIG.timeouts.networkIdle,
  });

  const loginInput = await page.$('input[type="text"][name="username"]');
  if (loginInput) {
    const log = new Log();
    await performLogin(page, log, email, password);
  }

  const cookies = await page.cookies();
  await saveCookies("hh", cookies);
}

/**
 * Inngest функция для обновления конкретного резюме
 */
export const refreshSingleResumeFunction = inngest.createFunction(
  {
    id: "refresh-single-resume",
    name: "Refresh Single Resume",
  },
  { event: "response/resume.refresh" },
  async ({ event, step }) => {
    const { responseId } = event.data;

    const response = await step.run("fetch-response", async () => {
      console.log(`🚀 Запуск обновления резюме для отклика: ${responseId}`);

      const result = await db.query.vacancyResponse.findFirst({
        where: eq(vacancyResponse.id, responseId),
        columns: {
          id: true,
          vacancyId: true,
          resumeId: true,
          resumeUrl: true,
          candidateName: true,
        },
      });

      if (!result) {
        throw new Error(`Отклик ${responseId} не найден`);
      }

      return result;
    });

    const credentials = await step.run("get-credentials", async () => {
      const creds = await getIntegrationCredentials("hh");
      if (!creds?.email || !creds?.password) {
        throw new Error("HH credentials не найдены в интеграциях");
      }
      return { email: creds.email, password: creds.password };
    });

    await step.run("parse-resume", async () => {
      const savedCookies = await loadCookies("hh");
      const browser = await setupBrowser();

      try {
        const page = await setupPage(browser, savedCookies);
        await checkAndPerformLogin(
          page,
          credentials.email,
          credentials.password,
        );

        console.log(`📊 Парсинг резюме: ${response.candidateName}`);

        const experienceData = await parseResumeExperience(
          page,
          response.resumeUrl,
        );

        let telegramUsername: string | null = null;
        if (experienceData.contacts) {
          telegramUsername = await extractTelegramUsername(
            experienceData.contacts,
          );
          if (telegramUsername) {
            console.log(`✅ Найден Telegram username: @${telegramUsername}`);
          }
        }

        // Загружаем PDF в S3 и сохраняем в БД
        let resumePdfFileId: string | null = null;
        if (experienceData.pdfBuffer) {
          const { uploadResumePdf } = await import(
            "../services/response-service"
          );
          resumePdfFileId = await uploadResumePdf(
            experienceData.pdfBuffer,
            response.resumeId,
          );
        }

        await updateResponseDetails({
          vacancyId: response.vacancyId,
          resumeId: response.resumeId,
          resumeUrl: response.resumeUrl,
          candidateName: response.candidateName ?? "",
          experience: experienceData.experience || "",
          contacts: experienceData.contacts,
          phone: experienceData.phone,
          languages: experienceData.languages,
          about: experienceData.about,
          education: experienceData.education,
          courses: experienceData.courses,
          telegramUsername,
          resumePdfFileId,
        });

        console.log(
          `✅ Резюме обновлено для: ${response.candidateName ?? "кандидата"}`,
        );
      } finally {
        await browser.close();
      }
    });

    return {
      success: true,
      responseId,
    };
  },
);
