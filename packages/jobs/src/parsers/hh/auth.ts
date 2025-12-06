import type { Log } from "crawlee";
import type { Page } from "puppeteer";
import { loadCookies, saveCookies } from "../../utils/cookies";

export async function performLogin(
  page: Page,
  log: Log,
  email: string,
  password: string,
  workspaceId: string,
  saveCookiesAfterLogin = true,
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
  } catch (_e) {
    log.info(
      "⚠️ Тайм-аут ожидания навигации. Проверяем, прошли ли мы дальше...",
    );
  }

  log.info("✅ Авторизация выполнена!");
  log.info(`🌐 Текущий URL: ${page.url()}`);

  if (saveCookiesAfterLogin) {
    const cookies = await page.browser().cookies();
    log.info(`🍪 Получено ${cookies.length} cookies`);
    await saveCookies("hh", cookies, workspaceId);
  }
}

export { loadCookies, saveCookies };
