import type { Page } from "puppeteer";
import type { ResumeExperience } from "../types";
import { HH_CONFIG } from "./config";

/**
 * Проверяет, является ли буфер PDF файлом по magic bytes
 */
function isPdfBuffer(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  // PDF файлы начинаются с "%PDF"
  return (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  );
}

/**
 * Очищает HTML от стилей и классов, оставляя только теги
 */
function cleanHtml(html: string): string {
  return html
    .replace(/\s+class="[^"]*"/g, "")
    .replace(/\s+style="[^"]*"/g, "")
    .replace(/\s+data-[a-z-]+="[^"]*"/g, "")
    .replace(/\s+id="[^"]*"/g, "")
    .replace(/\s+aria-[a-z-]+="[^"]*"/g, "")
    .replace(/\s+role="[^"]*"/g, "")
    .replace(/\s+tabindex="[^"]*"/g, "")
    .replace(/\s+>/g, ">")
    .trim();
}

/**
 * Скачивает PDF резюме с HH.ru
 */
async function downloadResumePdf(
  page: Page,
  resumeUrl: string,
): Promise<Buffer | null> {
  try {
    console.log("📥 Попытка скачать PDF резюме...");

    // Извлекаем hash и resumeId из URL резюме
    const urlMatch = resumeUrl.match(/\/resume\/([a-f0-9]+)/);
    const vacancyIdMatch = resumeUrl.match(/vacancyId=(\d+)/);

    if (!urlMatch?.[1]) {
      console.log("⚠️ Не удалось извлечь hash резюме из URL");
      return null;
    }

    const resumeHash = urlMatch[1];
    const vacancyId = vacancyIdMatch?.[1] || "";

    // Получаем имя кандидата из заголовка страницы для имени файла
    const candidateName = await page
      .evaluate(() => {
        const nameEl = document.querySelector(
          'span[data-qa="resume-personal-name"]',
        );
        return nameEl?.textContent?.trim() || "resume";
      })
      .catch(() => "resume");

    // Формируем URL для скачивания PDF напрямую
    const fullPdfUrl = `https://hh.ru/resume_converter/${encodeURIComponent(candidateName)}.pdf?hash=${resumeHash}${vacancyId ? `&vacancyId=${vacancyId}` : ""}&type=pdf&hhtmSource=resume&hhtmFrom=employer_vacancy_responses`;

    console.log(`📄 Скачивание PDF: ${fullPdfUrl}`);

    // Используем axios для скачивания с полными заголовками браузера
    try {
      const cookies = await page.browserContext().cookies();
      const cookieString = cookies
        .map((cookie) => `${cookie.name}=${cookie.value}`)
        .join("; ");

      const axios = (await import("axios")).default;
      const response = await axios.get(fullPdfUrl, {
        headers: {
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Encoding": "gzip, deflate, br",
          "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          Cookie: cookieString,
          Host: "hh.ru",
          Pragma: "no-cache",
          Referer: page.url(),
          "Sec-Ch-Ua":
            '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
          "Sec-Ch-Ua-Mobile": "?0",
          "Sec-Ch-Ua-Platform": '"Windows"',
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "same-origin",
          "Sec-Fetch-User": "?1",
          "Upgrade-Insecure-Requests": "1",
          "User-Agent": HH_CONFIG.userAgent,
        },
        responseType: "arraybuffer",
        timeout: 30000,
        maxRedirects: 5,
      });

      const buffer = Buffer.from(response.data);

      // Проверяем, что это действительно PDF
      if (!isPdfBuffer(buffer)) {
        console.log("⚠️ Скачанный файл не является PDF");
        return null;
      }

      console.log(`✅ PDF скачан, размер: ${buffer.length} байт`);
      return buffer;
    } catch (error) {
      if (error instanceof Error) {
        console.log(`⚠️ Ошибка скачивания через axios: ${error.message}`);
      }
      return null;
    }
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

      experience = cleanHtml(htmlContent);
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
      languages = cleanHtml(htmlContent);
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
      about = cleanHtml(htmlContent);
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
      education = cleanHtml(htmlContent);
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
      courses = cleanHtml(htmlContent);
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
        let responseHandler:
          | ((response: {
              url: () => string;
              json: () => Promise<unknown>;
            }) => Promise<void>)
          | null = null;

        // Set up request interception to capture the contacts response
        const contactsPromise = new Promise((resolve) => {
          const timeout = setTimeout(() => {
            if (responseHandler) {
              page.off("response", responseHandler);
            }
            console.log("⚠️ Таймаут ожидания контактов, продолжаем без них");
            resolve(null);
          }, HH_CONFIG.timeouts.contacts);

          responseHandler = async (response: {
            url: () => string;
            json: () => Promise<unknown>;
          }) => {
            try {
              const url = response.url();
              if (
                url.includes(`/resume/contacts/${resumeId}`) &&
                url.includes("goal=Contacts_Phone")
              ) {
                clearTimeout(timeout);
                if (responseHandler) {
                  page.off("response", responseHandler);
                }
                try {
                  const data = await response.json();
                  resolve(data);
                } catch {
                  resolve(null);
                }
              }
            } catch {
              // Игнорируем ошибки обработки response
            }
          };

          page.on("response", responseHandler);
        });

        try {
          // Small delay to mimic human behavior
          await new Promise((resolve) => setTimeout(resolve, 500));
          await phoneLink.click();

          contacts = await contactsPromise;

          // Убеждаемся, что обработчик удален
          if (responseHandler) {
            page.off("response", responseHandler);
          }

          if (contacts) {
            console.log("✅ Контакты получены");

            // Парсим телефон из контактов
            if (typeof contacts === "object" && "phone" in contacts) {
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
          } else {
            console.log("⚠️ Контакты не получены");
          }
        } catch {
          console.log("⚠️ Ошибка при получении контактов");
          // Убеждаемся, что обработчик удален даже при ошибке
          if (responseHandler) {
            page.off("response", responseHandler);
          }
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

  // Скачиваем PDF резюме (последний шаг, не взаимодействуем с DOM)
  let pdfBuffer: Buffer | null = null;
  try {
    pdfBuffer = await downloadResumePdf(page, url);
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
