# Миграция с telegram-bot на tg-client (MTProto)

## Что изменилось

Функционал Telegram бота перенесен с Bot API (grammy) на MTProto (mtcute). Это дает следующие преимущества:

- Прямое подключение к Telegram без Bot API
- Возможность использовать пользовательский аккаунт вместо бота
- Больше возможностей API
- Меньше ограничений

## Требования

1. **Telegram API credentials**: Нужны `TELEGRAM_API_ID` и `TELEGRAM_API_HASH` (получить на https://my.telegram.org)
2. **Авторизованная сессия**: Нужно авторизоваться через пользовательский аккаунт

## Переменные окружения

Добавьте в `.env`:

```env
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash
```

## Запуск бота

```bash
# Разработка с hot reload
bun run bot:dev

# Продакшн
bun run bot
```

## Авторизация

Перед первым запуском бота нужно авторизоваться:

1. Используйте существующий API для авторизации (`/auth/send-code`, `/auth/sign-in`)
2. Или авторизуйтесь через интерфейс приложения
3. Сессия сохранится в памяти клиента

## Функционал

Все функции из `telegram-bot` перенесены:

- ✅ Команда `/start` - регистрация пользователя
- ✅ Обработка текстовых сообщений
- ✅ Обработка голосовых сообщений
- ✅ Загрузка файлов в S3
- ✅ Интеграция с Inngest для транскрибации
- ✅ Отправка сообщений

## API

Экспортируемые функции:

```typescript
import { startBot, stopBot, sendMessage } from "@selectio/tg-client";

// Запустить бота
const client = await startBot();

// Отправить сообщение
await sendMessage(client, chatId, "Привет!");

// Остановить бота
await stopBot(client);
```

## Отличия от Bot API

1. **Авторизация**: Используется пользовательский аккаунт, а не bot token
2. **Updates**: Обрабатываются через `client.updates.on("raw", handler)`
3. **Типы сообщений**: Используются типы MTProto вместо Bot API
4. **Файлы**: Скачивание через `client.downloadAsBuffer()`

## Удаление старого пакета

После успешной миграции можно удалить `packages/telegram-bot`:

```bash
rm -rf packages/telegram-bot
```

Не забудьте обновить зависимости в других пакетах, если они используют `@selectio/telegram-bot`.
