# @selectio/tg-client

Telegram клиент на MTProto для работы с Telegram API напрямую, без Bot API.

## Возможности

- ✅ Отправка сообщений по username, телефону или chat ID
- ✅ Авторизация через пользовательский аккаунт
- ✅ Обработка входящих сообщений (текст, голос)
- ✅ Загрузка файлов в S3
- ✅ Интеграция с Inngest для обработки голосовых сообщений
- ✅ HTTP API для интеграции с другими сервисами

## Установка

```bash
bun install
```

## Переменные окружения

```env
TG_CLIENT_PORT=8001
```

**Важно:** API credentials и сессии теперь хранятся в БД (таблица `integrations`), а не в env переменных.

## Использование

### Запуск ботов

Запускает **всех ботов** из БД (таблица `integrations` с `type = "telegram"`):

```bash
# Разработка
bun run bot:dev

# Продакшн
bun run bot
```

Каждый workspace с активной Telegram интеграцией получает своего бота.

### Запуск HTTP API

```bash
# Разработка
bun run api:dev

# Продакшн
bun run api
```

### Программное использование

```typescript
import { botManager, sendMessage } from "@selectio/tg-client";

// Запустить всех ботов из БД
await botManager.startAll();

// Получить клиента для workspace
const client = botManager.getClient("workspace_id");

// Отправить сообщение
if (client) {
  await sendMessage(client, chatId, "Привет!");
}

// Перезапустить бота
await botManager.restartBot("workspace_id");

// Остановить всех ботов
await botManager.stopAll();
```

Подробнее: [BOT_MANAGER.md](./BOT_MANAGER.md)

### HTTP API

#### Авторизация

```bash
# Отправить код
POST /auth/send-code
{
  "apiId": 12345,
  "apiHash": "hash",
  "phone": "+79991234567"
}

# Войти с кодом
POST /auth/sign-in
{
  "apiId": 12345,
  "apiHash": "hash",
  "phone": "+79991234567",
  "phoneCode": "12345",
  "phoneCodeHash": "hash",
  "sessionData": "..."
}
```

#### Отправка сообщений

```bash
# По username
POST /messages/send-by-username
{
  "apiId": 12345,
  "apiHash": "hash",
  "sessionData": {...},
  "username": "username",
  "text": "Привет!"
}

# По телефону
POST /messages/send-by-phone
{
  "apiId": 12345,
  "apiHash": "hash",
  "sessionData": {...},
  "phone": "+79991234567",
  "text": "Привет!",
  "firstName": "Имя"
}
```

## Миграция с telegram-bot

См. [MIGRATION.md](./MIGRATION.md)

## Архитектура

- `src/bot.ts` - запуск бота и обработка событий
- `src/bot-handler.ts` - обработчики команд и сообщений
- `src/bot-manager.ts` - управление несколькими ботами
- `src/health-server.ts` - health checks для Kubernetes
- `src/client.ts` - управление клиентами по workspace
- `src/user-client.ts` - функции для работы с пользовательским клиентом
- `src/storage.ts` - хранилище сессий
- `src/api/` - HTTP API для интеграции
- `src/sdk/` - SDK клиент для обращения к API
- `k8s/` - Kubernetes манифесты

## Kubernetes

Боты запускаются в k3s pod с health checks и graceful shutdown.

```bash
# Deploy
kubectl apply -f packages/tg-client/k8s/

# Проверка
kubectl get pods -l app=telegram-bots
kubectl logs -f deployment/telegram-bots
```

Подробнее: [k8s/README.md](./k8s/README.md)
