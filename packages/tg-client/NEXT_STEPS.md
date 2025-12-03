# Следующие шаги

## Что сделано

✅ Перенесен функционал из `telegram-bot` в `tg-client` на MTProto
✅ Реализована обработка команд и сообщений
✅ Добавлена поддержка голосовых сообщений
✅ Интеграция с S3 и Inngest
✅ Все проверки типов пройдены

## Что нужно сделать

### 1. Авторизация

Перед запуском бота нужно авторизоваться:

```bash
# Запустить API
cd packages/tg-client
bun run api:dev

# В другом терминале отправить запросы
curl -X POST http://localhost:8001/auth/send-code \
  -H "Content-Type: application/json" \
  -d '{"apiId": YOUR_API_ID, "apiHash": "YOUR_API_HASH", "phone": "+79991234567"}'

# Ввести код из SMS
curl -X POST http://localhost:8001/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{"apiId": YOUR_API_ID, "apiHash": "YOUR_API_HASH", "phone": "+79991234567", "phoneCode": "12345", "phoneCodeHash": "HASH_FROM_PREVIOUS_RESPONSE"}'
```

### 2. Сохранение сессии

После авторизации нужно сохранить `sessionData` в базу данных или переменные окружения для использования ботом.

### 3. Запуск бота

```bash
cd packages/tg-client
bun run bot:dev
```

### 4. Тестирование

Отправьте боту:
- Команду `/start`
- Текстовое сообщение
- Голосовое сообщение

### 5. Удаление старого пакета

После успешного тестирования:

```bash
# Удалить telegram-bot
rm -rf packages/telegram-bot

# Обновить зависимости в других пакетах
# Заменить @selectio/telegram-bot на @selectio/tg-client
```

### 6. Обновление других сервисов

Найти все места, где используется `@selectio/telegram-bot`:

```bash
# Поиск импортов
grep -r "@selectio/telegram-bot" .

# Заменить на
# import { sendMessage } from "@selectio/tg-client";
```

## Отличия от Bot API

1. **Авторизация**: Используется пользовательский аккаунт
2. **Нет bot token**: Используются API ID и API Hash
3. **Больше возможностей**: Прямой доступ к MTProto API
4. **Сессии**: Нужно управлять сессиями вручную

## Проблемы и решения

### Бот не получает сообщения

- Проверьте авторизацию
- Убедитесь, что сессия сохранена
- Проверьте логи

### Ошибка "Not authorized"

- Нужно пройти авторизацию через API
- Сохранить sessionData

### Голосовые не обрабатываются

- Проверьте INNGEST_EVENT_KEY
- Проверьте доступ к S3
