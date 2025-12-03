# Настройка Telegram ботов

## Быстрый старт

### 1. Получить API credentials

Перейдите на https://my.telegram.org и получите:
- `API ID` (число)
- `API Hash` (строка)

### 2. Авторизоваться через API

```bash
# Запустить API сервер
cd packages/tg-client
bun run api:dev
```

В другом терминале:

```bash
# Отправить код на телефон
curl -X POST http://localhost:8001/auth/send-code \
  -H "Content-Type: application/json" \
  -d '{
    "apiId": 123456,
    "apiHash": "your_api_hash",
    "phone": "+79991234567"
  }'

# Ответ: { "phoneCodeHash": "...", "sessionData": "..." }
```

Введите код из SMS:

```bash
curl -X POST http://localhost:8001/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{
    "apiId": 123456,
    "apiHash": "your_api_hash",
    "phone": "+79991234567",
    "phoneCode": "12345",
    "phoneCodeHash": "hash_from_previous_response",
    "sessionData": "session_from_previous_response"
  }'

# Ответ: { "success": true, "sessionData": "...", "user": {...} }
```

### 3. Сохранить в БД

```sql
INSERT INTO integrations (
  workspace_id,
  type,
  name,
  credentials,
  is_active
) VALUES (
  'your_workspace_id',
  'telegram',
  'Telegram Bot',
  jsonb_build_object(
    'apiId', '123456',
    'apiHash', 'your_api_hash',
    'sessionData', '{"authKeys":"...","kv":"..."}'
  ),
  'true'
);
```

**Важно:** Credentials автоматически шифруются при сохранении через repository.

### 4. Запустить ботов

```bash
cd packages/tg-client
bun run bot
```

Вывод:
```
🚀 Запуск всех Telegram ботов...
📋 Найдено 1 интеграций
✅ Бот запущен для workspace your_workspace_id: Иван Иванов (@ivan)
✅ Успешно запущено: 1
✅ Telegram боты успешно запущены: 1 шт.
  📱 Workspace: your_workspace_id, User: @ivan
👂 Слушаем входящие сообщения...
```

## Использование через код

### Добавить интеграцию

```typescript
import { upsertIntegration } from "@selectio/db";

await upsertIntegration({
  workspaceId: "ws_123",
  type: "telegram",
  name: "Telegram Bot",
  credentials: {
    apiId: "123456",
    apiHash: "your_api_hash",
    sessionData: JSON.stringify(sessionData),
  },
  isActive: "true",
});
```

### Запустить бота

```typescript
import { botManager } from "@selectio/tg-client";

// Запустить всех
await botManager.startAll();

// Или перезапустить конкретного
await botManager.restartBot("ws_123");
```

### Отправить сообщение

```typescript
const client = botManager.getClient("ws_123");
if (client) {
  await client.sendText(chatId, "Привет!");
}
```

## Проверка

### Проверить запущенных ботов

```typescript
import { botManager } from "@selectio/tg-client";

const bots = botManager.getBotsInfo();
console.log(`Запущено: ${bots.length}`);

for (const bot of bots) {
  console.log(`- ${bot.workspaceId}: @${bot.username}`);
}
```

### Проверить интеграции в БД

```sql
SELECT 
  workspace_id,
  name,
  is_active,
  last_used_at,
  created_at
FROM integrations
WHERE type = 'telegram';
```

## Troubleshooting

### Бот не запускается

1. Проверьте, что интеграция активна:
```sql
UPDATE integrations 
SET is_active = 'true' 
WHERE type = 'telegram' AND workspace_id = 'ws_123';
```

2. Проверьте credentials:
```typescript
import { getIntegrationCredentials } from "@selectio/db";

const creds = await getIntegrationCredentials("telegram", "ws_123");
console.log(creds); // { apiId, apiHash, sessionData }
```

3. Проверьте логи:
```bash
bun run bot
# Смотрите на ошибки в выводе
```

### "Not authorized"

Сессия устарела или невалидна. Нужно пройти авторизацию заново:

1. Удалите старую интеграцию
2. Пройдите авторизацию через API (шаг 2)
3. Сохраните новую сессию в БД

### Бот не получает сообщения

1. Убедитесь, что бот запущен:
```typescript
botManager.isRunningForWorkspace("ws_123"); // true
```

2. Проверьте, что пользователь написал `/start`

3. Проверьте логи на ошибки

## Продакшн

### Docker

```dockerfile
FROM oven/bun:latest

WORKDIR /app
COPY . .
RUN bun install

CMD ["bun", "run", "bot"]
```

### Systemd

```ini
[Unit]
Description=Telegram Bots
After=network.target postgresql.service

[Service]
Type=simple
User=app
WorkingDirectory=/app/packages/tg-client
ExecStart=/usr/local/bin/bun run bot
Restart=always

[Install]
WantedBy=multi-user.target
```

### Мониторинг

```typescript
// Healthcheck endpoint
app.get("/health", (c) => {
  const count = botManager.getBotsCount();
  return c.json({ 
    status: "ok", 
    bots: count,
    details: botManager.getBotsInfo()
  });
});
```
