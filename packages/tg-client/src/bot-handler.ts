import type { TelegramClient } from "@mtcute/bun";
import type { Message } from "@mtcute/core";
import { env } from "@selectio/config";
import { eq } from "@selectio/db";
import { db } from "@selectio/db/client";
import {
  file,
  telegramConversation,
  telegramMessage,
} from "@selectio/db/schema";
import { uploadFile as uploadToS3 } from "@selectio/lib";

/**
 * Загрузить файл в S3 и создать запись в БД
 */
async function uploadFile(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<string> {
  const key = await uploadToS3(
    fileBuffer,
    fileName,
    mimeType,
    "telegram-voices",
  );

  const [fileRecord] = await db
    .insert(file)
    .values({
      provider: "S3",
      key,
      fileName,
      mimeType,
      fileSize: fileBuffer.length.toString(),
    })
    .returning();

  if (!fileRecord) {
    throw new Error("Не удалось создать запись файла");
  }

  return fileRecord.id;
}

/**
 * Задержка для имитации человеческого поведения
 */
async function humanDelay(minMs = 800, maxMs = 2000): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  await new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Выбрать случайный элемент из массива
 */
function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)] as T;
}

/**
 * Обработчик команды /start
 */
async function handleStartCommand(
  client: TelegramClient,
  message: Message,
): Promise<void> {
  const chatId = message.chat.id.toString();
  const sender = message.sender;

  let username: string | undefined;
  let firstName: string | undefined;

  if (sender?.type === "user") {
    username = sender.username || undefined;
    firstName = sender.firstName || undefined;
  }

  console.log("🆔 Telegram Chat Info:", {
    chatId,
    username: username ? `@${username}` : "no username",
    firstName,
  });

  await db
    .insert(telegramConversation)
    .values({
      chatId,
      candidateName: firstName,
      status: "ACTIVE",
    })
    .onConflictDoUpdate({
      target: telegramConversation.chatId,
      set: { status: "ACTIVE" },
    })
    .returning();

  // Показываем индикатор печати
  await client.call({
    _: "messages.setTyping",
    peer: await client.resolvePeer(message.chat.id),
    action: { _: "sendMessageTypingAction" },
  });

  // Задержка как у человека
  await humanDelay(1500, 3000);

  // Естественное приветствие без упоминания "бот"
  const greetings = [
    `Привет${firstName ? `, ${firstName}` : ""}! 👋`,
    `Здравствуй${firstName ? `, ${firstName}` : ""}!`,
    `Привет! Рад знакомству${firstName ? `, ${firstName}` : ""} 😊`,
    `Здорово${firstName ? `, ${firstName}` : ""}! Как дела?`,
  ];

  const greeting = randomChoice(greetings);
  await client.sendText(message.chat.id, greeting);
}

/**
 * Обработчик текстовых сообщений
 */
async function handleTextMessage(
  client: TelegramClient,
  message: Message,
): Promise<void> {
  const chatId = message.chat.id.toString();
  const messageText = message.text || "";

  const [conversation] = await db
    .select()
    .from(telegramConversation)
    .where(eq(telegramConversation.chatId, chatId))
    .limit(1);

  if (!conversation) {
    // Естественный ответ вместо команды
    await humanDelay(600, 1200);
    await client.sendText(
      message.chat.id,
      "Привет! Давай начнем сначала, напиши /start",
    );
    return;
  }

  await db.insert(telegramMessage).values({
    conversationId: conversation.id,
    sender: "CANDIDATE",
    contentType: "TEXT",
    content: messageText,
    telegramMessageId: message.id.toString(),
  });

  // Показываем индикатор печати
  await client.call({
    _: "messages.setTyping",
    peer: await client.resolvePeer(message.chat.id),
    action: { _: "sendMessageTypingAction" },
  });

  // Задержка как у человека (зависит от длины сообщения)
  const readingTime = Math.min(messageText.length * 30, 2000);
  await humanDelay(readingTime, readingTime + 1000);

  // Проверяем статус vacancy response для определения этапа
  if (conversation.responseId) {
    const { vacancyResponse } = await import("@selectio/db/schema");
    const [response] = await db
      .select()
      .from(vacancyResponse)
      .where(eq(vacancyResponse.id, conversation.responseId))
      .limit(1);

    if (response) {
      // Статус COMPLETED - интервью завершено, результаты обработаны
      if (response.status === "COMPLETED") {
        const completedResponses: string[] = [
          "Спасибо за сообщение! Я уже передал результаты нашей беседы руководству. Как только будет решение, обязательно с вами свяжусь 😊",
          "Получил ваше сообщение. Сейчас анализирую все материалы и готовлю финальное заключение. Скоро вернусь с обратной связью!",
          "Благодарю за отклик! Я завершил первичную оценку и передал информацию дальше. Держу вас в курсе, как только будут новости.",
          "Спасибо! Я обработал результаты нашего интервью. Сейчас идет согласование с командой. Обязательно сообщу о решении.",
          "Получил! Я уже подготовил свое заключение по итогам беседы. Жду финального решения от руководства, после чего свяжусь с вами.",
        ];

        const responseText = randomChoice(completedResponses);
        await client.sendText(message.chat.id, responseText);
        return;
      }

      // Статус INTERVIEW_HH - идет активное интервью
      if (response.status === "INTERVIEW_HH") {
        const interviewResponses: string[] = [
          "Мне удобнее воспринимать голосом, можешь записать? 🎤",
          "Давай лучше голосовым, так я быстрее отвечу 😊",
          "Запиши, пожалуйста, голосовое - так мне проще",
          "Голосом будет удобнее, можешь записать?",
          "Давай голосом, окей? Так быстрее разберемся",
          "Запиши голосовое, пожалуйста - мне так удобнее воспринимать",
          "Голосом ответь, если не сложно 🙏",
          "Можешь голосом? Мне так проще понять",
        ];

        const responseText = randomChoice(interviewResponses);
        await client.sendText(message.chat.id, responseText);
        return;
      }

      // Другие статусы (NEW, EVALUATED, DIALOG_APPROVED, SKIPPED)
      const otherStatusResponses: string[] = [
        "Спасибо за сообщение! Я изучаю твою анкету, скоро выйду на связь.",
        "Получил! Сейчас смотрю твое резюме, немного времени нужно.",
        "Спасибо за отклик! Я ознакомлюсь с материалами и свяжусь с тобой.",
        "Благодарю! Изучаю твой профиль, скоро вернусь с предложением.",
      ];

      const responseText = randomChoice(otherStatusResponses);
      await client.sendText(message.chat.id, responseText);
      return;
    }
  }

  // Если нет responseId - общий ответ
  const generalResponses: string[] = [
    "Привет! Чем могу помочь?",
    "Здравствуй! Слушаю тебя 😊",
    "Привет! Что хотел узнать?",
    "Здорово! Что интересует?",
  ];

  const responseText = randomChoice(generalResponses);
  await client.sendText(message.chat.id, responseText);
}

/**
 * Обработчик голосовых сообщений
 */
async function handleVoiceMessage(
  client: TelegramClient,
  message: Message,
): Promise<void> {
  const chatId = message.chat.id.toString();

  if (!message.media || message.media.type !== "voice") {
    return;
  }

  const [conversation] = await db
    .select()
    .from(telegramConversation)
    .where(eq(telegramConversation.chatId, chatId))
    .limit(1);

  if (!conversation) {
    await client.sendText(
      message.chat.id,
      "Пожалуйста, начните с команды /start",
    );
    return;
  }

  try {
    // Показываем, что "слушаем" голосовое
    await client.call({
      _: "messages.setTyping",
      peer: await client.resolvePeer(message.chat.id),
      action: { _: "sendMessageRecordAudioAction" },
    });

    // Скачиваем файл
    const fileBuffer = await client.downloadAsBuffer(message.media);

    // Определяем имя файла и mime type
    const fileName = `voice_${message.id}.ogg`;
    const mimeType = message.media.mimeType || "audio/ogg";

    // Загружаем в S3
    const fileId = await uploadFile(
      Buffer.from(fileBuffer),
      fileName,
      mimeType,
    );

    // Получаем длительность
    const duration =
      "duration" in message.media ? (message.media.duration as number) : 0;

    const [voiceMessage] = await db
      .insert(telegramMessage)
      .values({
        conversationId: conversation.id,
        sender: "CANDIDATE",
        contentType: "VOICE",
        content: "Голосовое сообщение",
        fileId,
        voiceDuration: duration.toString(),
        telegramMessageId: message.id.toString(),
      })
      .returning();

    if (!voiceMessage) {
      throw new Error("Не удалось создать запись сообщения");
    }

    // Запускаем транскрибацию в фоне через Inngest HTTP API
    if (env.INNGEST_EVENT_KEY) {
      await fetch(
        `${env.INNGEST_EVENT_API_BASE_URL}/e/${env.INNGEST_EVENT_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: "telegram/voice.transcribe",
            data: {
              messageId: voiceMessage.id,
              fileId,
            },
          }),
        },
      );
    } else {
      console.warn("⚠️ INNGEST_EVENT_KEY не установлен, событие не отправлено");
    }

    // Имитируем прослушивание (длительность голосового + время на обдумывание)
    const listeningTime = Math.min(duration * 1000, 10000);
    await humanDelay(listeningTime, listeningTime + 2000);

    // НЕ отправляем автоматический ответ сразу
    // Бот ответит после анализа через Inngest
    // Это делает общение более естественным
  } catch (error) {
    console.error("Ошибка при обработке голосового сообщения:", error);

    await humanDelay(800, 1500);

    // Естественная реакция на ошибку
    const errorResponses = [
      "Не расслышал, можешь повторить?",
      "Что-то не так с голосовым, попробуй еще раз",
      "Не смог прослушать, запиши заново?",
      "Хм, не получилось послушать. Еще раз?",
    ];

    const errorResponse = randomChoice(errorResponses);
    await client.sendText(message.chat.id, errorResponse);
  }
}

/**
 * Создать обработчик обновлений для MTProto клиента
 */
export function createBotHandler(client: TelegramClient) {
  return async (message: Message) => {
    try {
      // Игнорируем исходящие сообщения
      if (message.isOutgoing) {
        return;
      }

      // Проверяем команду /start
      if (message.text?.startsWith("/start")) {
        await handleStartCommand(client, message);
        return;
      }

      // Проверяем голосовое сообщение
      if (message.media?.type === "voice") {
        await handleVoiceMessage(client, message);
        return;
      }

      // Обрабатываем текстовое сообщение
      if (message.text) {
        await handleTextMessage(client, message);
      }
    } catch (error) {
      console.error("Ошибка обработки сообщения:", error);
    }
  };
}

/**
 * Отправить сообщение в чат
 */
export async function sendMessage(
  client: TelegramClient,
  chatId: string | number,
  text: string,
): Promise<Message> {
  return await client.sendText(chatId, text);
}
