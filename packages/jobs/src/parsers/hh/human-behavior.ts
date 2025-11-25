import type { Page } from "puppeteer";

/**
 * Генерирует случайную задержку в заданном диапазоне
 */
export function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Ждёт случайное время (имитация человека)
 */
export async function humanDelay(min = 1000, max = 3000): Promise<void> {
  const delay = randomDelay(min, max);
  await new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Имитирует движение мыши человека
 */
export async function humanMouseMove(page: Page): Promise<void> {
  const x = randomDelay(100, 800);
  const y = randomDelay(100, 600);
  await page.mouse.move(x, y, { steps: randomDelay(5, 15) });
}

/**
 * Имитирует скролл страницы как человек (плавно, с паузами)
 */
export async function humanScroll(page: Page): Promise<void> {
  const scrollDistance = randomDelay(300, 600);
  await page.evaluate((distance) => {
    window.scrollBy({
      top: distance,
      behavior: "smooth",
    });
  }, scrollDistance);
  await humanDelay(500, 1500);
}

/**
 * Имитирует чтение страницы (случайная пауза)
 */
export async function humanRead(page: Page): Promise<void> {
  // Двигаем мышь как будто читаем
  await humanMouseMove(page);
  // Пауза на "чтение"
  await humanDelay(2000, 5000);
}

/**
 * Случайно двигает мышь и скроллит (имитация изучения страницы)
 */
export async function humanBrowse(page: Page): Promise<void> {
  const actions = randomDelay(1, 3);
  for (let i = 0; i < actions; i++) {
    const action = Math.random();
    if (action < 0.5) {
      await humanMouseMove(page);
    } else {
      await humanScroll(page);
    }
    await humanDelay(500, 1500);
  }
}
