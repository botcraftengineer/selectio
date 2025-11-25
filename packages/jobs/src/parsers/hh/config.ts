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
    navigation: 120000,
    requestHandler: 300,
  },
  delays: {
    afterParsing: 5000,
    beforeSubmit: 2000,
  },
  puppeteer: {
    headless: false,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
    ] as string[],
    ignoreDefaultArgs: ["--enable-automation"] as string[],
    slowMo: 50,
  },
};
