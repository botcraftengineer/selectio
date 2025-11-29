export const HH_CONFIG = {
  urls: {
    login:
      "https://hh.ru/account/login?role=employer&backurl=%2F&hhtmFrom=main&hasSwitcher=true&skipSwitcher=true",
    vacancies: "https://hh.ru/employer/vacancies?hhtmFrom=vacancy",
    baseUrl: "https://hh.ru",
  },
  timeouts: {
    networkIdle: 30000,
    selector: 10000,
    contacts: 10000,
    navigation: 120000,
    requestHandler: 300,
  },
  delays: {
    afterParsing: 5000,
    beforeSubmit: 2000,
    betweenResumes: { min: 3000, max: 8000 }, // Задержка между просмотром резюме
    readingPage: { min: 2000, max: 5000 }, // Время "чтения" страницы
    scrollDelay: { min: 500, max: 1500 }, // Задержка при скролле
  },
  features: {
    parseContacts: true, // Включить/выключить парсинг контактов (отключено из-за 403)
  },
  puppeteer: {
    headless: false,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-web-security",
      "--disable-features=IsolateOrigins,site-per-process",
      "--window-size=1920,1080",
    ] as string[],
    ignoreDefaultArgs: ["--enable-automation"] as string[],
    slowMo: 100,
  },
};
