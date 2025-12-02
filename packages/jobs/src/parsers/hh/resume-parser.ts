import type { Page } from "puppeteer";
import { stripHtml } from "string-strip-html";
import type { ResumeExperience } from "../types";
import { HH_CONFIG } from "./config";

/**
 * Скачивает PDF резюме с HH.ru
 */
async function downloadResumePdf(page: Page): Promise<Buffer | null> {
  try {
    console.log("📥 Попытка скачать PDF резюме...");

    // Ищем кнопку скачивания
    const downloadButton = await page.$(
      'button[data-qa="resume-download-button"]',
    );

    if (!downloadButton) {
      console.log("⚠️ Кнопка скачивания резюме не найдена");
      return null;
    }

    // Кликаем по кнопке и сразу получаем URL из появившейся ссылки
    await downloadButton.click();

    // Ждем появления ссылки на PDF с небольшим таймаутом
    const pdfLink = await page
      .waitForSelector('a[data-qa="resume-export-pdf"]', {
        timeout: 3000,
      })
      .catch(() => null);

    if (!pdfLink) {
      console.log("⚠️ Ссылка на PDF не появилась");
      return null;
    }

    // Получаем URL PDF до любых действий со страницей
    const pdfUrl = await pdfLink
      .evaluate((el) => el.getAttribute("href"))
      .catch(() => null);

    if (!pdfUrl) {
      console.log("⚠️ URL PDF не найден");
      return null;
    }

    // Формируем полный URL
    const fullPdfUrl = pdfUrl.startsWith("http")
      ? pdfUrl
      : new URL(pdfUrl, "https://hh.ru").href;

    console.log(`📄 Скачивание PDF: ${fullPdfUrl}`);

    // Скачиваем PDF через fetch вместо page.goto, чтобы не потерять текущую страницу
    const cookies = await page.browserContext().cookies();
    const cookieString = cookies
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");
    console.log(`🍪 Куки: ${cookieString}`);
    const response = await fetch(fullPdfUrl, {
      headers: {
        Cookie: cookieString,
        "User-Agent": HH_CONFIG.userAgent,
      },
      credentials: "include",
    });

    if (!response.ok) {
      console.log(`⚠️ Ошибка загрузки PDF: ${response.status}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log(`✅ PDF скачан, размер: ${buffer.length} байт`);

    return buffer;
  } catch (error) {
    console.log("⚠️ Ошибка при скачивании PDF резюме:");
    if (error instanceof Error) {
      console.log(`   ${error.message}`);
    }
    return null;
  }
}

export async function parseResumeExperience(
  page: Page,
  url: string,
): Promise<ResumeExperience> {
  console.log(`📄 Переход на страницу резюме: ${url}`);

  // Переходим на страницу резюме, если мы еще не там
  if (page.url() !== url) {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
  }

  let experience = "";
  let languages = "";
  let about = "";
  let education = "";
  let courses = "";
  let contacts = null;
  let phone: string | null = null;

  // Парсинг опыта работы
  try {
    const experienceElement = await page.waitForSelector(
      'div[data-qa="resume-experience-block"]',
      {
        timeout: HH_CONFIG.timeouts.selector,
      },
    );

    if (experienceElement) {
      const htmlContent = await experienceElement.evaluate(
        (el: HTMLElement) => el.innerHTML,
      );

      const { result } = stripHtml(htmlContent);
      experience = result.trim();
    }
  } catch (_e) {
    console.log("⚠️ Не удалось получить опыт работы из резюме.");
  }

  // Парсинг языков
  try {
    const languagesElement = await page.$(
      'div[data-qa="resume-languages-block"]',
    );
    if (languagesElement) {
      const htmlContent = await languagesElement.evaluate(
        (el: HTMLElement) => el.innerHTML,
      );
      const { result } = stripHtml(htmlContent);
      languages = result.trim();
    }
  } catch (_e) {
    console.log("⚠️ Не удалось получить языки из резюме.");
  }

  // Парсинг информации о себе
  try {
    const aboutElement = await page.$('div[data-qa="resume-about-block"]');
    if (aboutElement) {
      const htmlContent = await aboutElement.evaluate(
        (el: HTMLElement) => el.innerHTML,
      );
      const { result } = stripHtml(htmlContent);
      about = result.trim();
    }
  } catch (_e) {
    console.log("⚠️ Не удалось получить информацию о себе из резюме.");
  }

  // Парсинг образования
  try {
    const educationElement = await page.$(
      'div[data-qa="resume-education-block"]',
    );
    if (educationElement) {
      const htmlContent = await educationElement.evaluate(
        (el: HTMLElement) => el.innerHTML,
      );
      const { result } = stripHtml(htmlContent);
      education = result.trim();
    }
  } catch (_e) {
    console.log("⚠️ Не удалось получить образование из резюме.");
  }

  // Парсинг курсов
  try {
    const coursesElement = await page.$(
      'div[data-qa="resume-education-courses-block"]',
    );
    if (coursesElement) {
      const htmlContent = await coursesElement.evaluate(
        (el: HTMLElement) => el.innerHTML,
      );
      const { result } = stripHtml(htmlContent);
      courses = result.trim();
    }
  } catch (_e) {
    console.log("⚠️ Не удалось получить курсы из резюме.");
  }

  const resumeIdMatch = url.match(/\/resume\/([a-f0-9]+)/);
  if (resumeIdMatch?.[1] && HH_CONFIG.features.parseContacts) {
    const resumeId = resumeIdMatch[1];

    try {
      console.log(`📞 Проверка наличия контактов для резюме ${resumeId}`);

      // Check if the phone button exists first
      const phoneLink = await page.$(
        'a[data-qa="response-resume_show-phone-number"]',
      );

      if (!phoneLink) {
        console.log("⚠️ Кнопка показа телефона не найдена, пропускаем.");
      } else {
        // Set up request interception to capture the contacts response
        const contactsPromise = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            page.off("response", responseHandler);
            console.log("⚠️ Таймаут ожидания контактов, продолжаем без них");
            resolve(null);
          }, HH_CONFIG.timeouts.contacts);

          const responseHandler = async (response: {
            url: () => string;
            json: () => Promise<unknown>;
          }) => {
            const url = response.url();
            if (
              url.includes(`/resume/contacts/${resumeId}`) &&
              url.includes("goal=Contacts_Phone")
            ) {
              clearTimeout(timeout);
              page.off("response", responseHandler);
              try {
                const data = await response.json();
                resolve(data);
              } catch (e) {
                reject(e);
              }
            }
          };

          page.on("response", responseHandler);
        });

        // Small delay to mimic human behavior
        await new Promise((resolve) => setTimeout(resolve, 500));
        await phoneLink.click();

        try {
          contacts = await contactsPromise;
          console.log("✅ Контакты получены");

          // Парсим телефон из контактов
          if (contacts && typeof contacts === "object" && "phone" in contacts) {
            const phoneData = (
              contacts as {
                phone?: Array<{ formatted?: string; raw?: string }>;
              }
            ).phone;
            if (Array.isArray(phoneData) && phoneData.length > 0) {
              const firstPhone = phoneData[0];
              phone = firstPhone?.formatted || firstPhone?.raw || null;
              if (phone) {
                console.log(`📞 Телефон извлечен: ${phone}`);
              }
            }
          }
        } catch (_e) {
          console.log("⚠️ Таймаут ожидания контактов, продолжаем без них.");
        }
      }
    } catch (e) {
      console.log("⚠️ Не удалось получить контакты.");
      if (e instanceof Error) {
        console.log(`   Причина: ${e.message}`);
      }
    }
  } else if (resumeIdMatch?.[1]) {
    console.log("ℹ️ Парсинг контактов отключен в конфигурации");
  } else {
    console.log("⚠️ Не удалось извлечь ID резюме из URL.");
  }

  // Скачиваем PDF резюме
  let pdfBuffer: Buffer | null = null;
  try {
    pdfBuffer = await downloadResumePdf(page);
  } catch (error) {
    console.log("⚠️ Не удалось скачать PDF резюме");
    if (error instanceof Error) {
      console.log(`   ${error.message}`);
    }
  }

  return {
    experience,
    contacts,
    phone,
    languages,
    about,
    education,
    courses,
    pdfBuffer,
  };
}
