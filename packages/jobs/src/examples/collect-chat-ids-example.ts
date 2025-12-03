/**
 * Пример использования функции сбора chat_id для откликов вакансии
 *
 * Эта функция собирает chat_id для всех откликов указанной вакансии
 * используя API HeadHunter и сохраняет их в базу данных.
 *
 * Использование:
 *
 * import { inngest } from "@selectio/jobs";
 *
 * // Запуск сбора chat_id для вакансии
 * await inngest.send({
 *   name: "vacancy/chat-ids.collect",
 *   data: {
 *     vacancyId: "127379451"
 *   }
 * });
 *
 * Функция:
 * 1. Получает вакансию из базы данных
 * 2. Получает интеграцию HH с cookies
 * 3. Делает GET запрос к https://chatik.hh.ru/chatik/api/chats
 * 4. Сопоставляет resumeId из ответа с откликами в базе
 * 5. Обновляет поле chat_id для каждого отклика
 *
 * Параметры API запроса:
 * - vacancyIds: ID вакансии
 * - filterUnread: false (показывать все чаты)
 * - filterHasTextMessage: true (только с текстовыми сообщениями)
 * - do_not_track_session_events: true
 */
