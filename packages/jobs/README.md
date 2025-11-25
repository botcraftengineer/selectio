# @selectio/jobs

Пакет для автоматизации работы с job-сайтами с использованием [Crawlee](https://crawlee.dev/js).

## Возможности

- Автоматизация авторизации на hh.ru
- Использование Crawlee для надежного веб-скрапинга
- Управление cookies и сессиями
- Типобезопасные переменные окружения с `@t3-oss/env-core`
- Логирование всех операций

## Использование

### Авторизация на hh.ru

1. Установите переменные окружения в корневом файле `.env`:

```bash
HH_EMAIL="example@gmail.com"
HH_PASSWORD="ваш_пароль"
```

2. Запустите скрипт из корня проекта:

```bash
bun run hh:login
```

Скрипт откроет браузер, выполнит авторизацию и сохранит cookies для последующего использования.

### Использование сохраненных cookies

После успешной авторизации вы можете использовать сохраненные cookies для работы без повторного входа:

```bash
bun run hh:example
```

Этот пример показывает, как загрузить сохраненные cookies и использовать их для доступа к защищенным страницам.

### Тестирование

Для тестирования функционала:

```bash
bun run hh:test
```

## Доступные скрипты

- `bun run hh:login` - авторизация на hh.ru и сохранение cookies
- `bun run hh:test` - тестирование функционала
- `bun run hh:example` - пример использования сохраненных cookies
- `bun run build` - сборка TypeScript
- `bun run typecheck` - проверка типов
- `bun run lint` - проверка кода ESLint

## Технологии

- [Crawlee](https://crawlee.dev/js) v3.15.3 - мощный фреймворк для веб-скрапинга и автоматизации
- [Playwright](https://playwright.dev/) v1.56.1 - для управления браузером
- [@t3-oss/env-core](https://env.t3.gg) v0.13.8 - типобезопасные переменные окружения
- TypeScript v5.9.3 - для типобезопасности
- Zod v4.1.13 - для валидации данных

## Структура пакета

```
packages/jobs/
├── src/
│   ├── env.ts                    # Типобезопасные переменные окружения
│   ├── hh-login.ts              # Скрипт авторизации на hh.ru
│   ├── test.ts                  # Тестовый скрипт
│   ├── example-with-cookies.ts  # Пример использования cookies
│   ├── index.ts                 # Экспорты пакета
│   └── utils/
│       └── cookies.ts           # Утилиты для работы с cookies
├── .crawlee/                    # Хранилище Crawlee (gitignored)
│   └── storage/
│       └── hh-cookies.json      # Сохраненные cookies
├── storage/                     # Хранилище данных Crawlee
│   ├── key_value_stores/
│   └── request_queues/
└── package.json
```

## Переменные окружения

Пакет использует `@t3-oss/env-core` для типобезопасной работы с переменными окружения.

Переменные должны быть определены в корневом `.env` файле проекта:

- `HH_EMAIL` - Email для авторизации (по умолчанию: kodermax@gmail.com)
- `HH_PASSWORD` - Пароль (обязательно)

Все переменные валидируются при запуске с помощью Zod схем.

## API

Пакет экспортирует следующие функции:

```typescript
import { env, loadCookies, saveCookies } from "@selectio/jobs";

// Типобезопасные переменные окружения
console.log(env.HH_EMAIL);

// Сохранение cookies
await saveCookies(cookies);

// Загрузка cookies
const cookies = await loadCookies();
```
