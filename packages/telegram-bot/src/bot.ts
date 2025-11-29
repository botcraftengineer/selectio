import { env } from "@selectio/config";
import { eq } from "@selectio/db";
import { db } from "@selectio/db/client";
import { telegramConversation, telegramMessage } from "@selectio/db/schema";
import { Bot } from "grammy";

const TELEGRAM_BOT_TOKEN = env.TELEGRAM_BOT_TOKEN;

if (!TELEGRAM_BOT_TOKEN) {
  throw new Error("TELEGRAM_BOT_TOKEN не установлен");
}

export const bot = new Bot(TELEGRAM_BOT_TOKEN);

bot.command("start", async (ctx) => {
  const chatId = ctx.chat.id.toString();
  const username = ctx.from?.username;

  console.log("🆔 Telegram Chat Info:", {
    chatId,
    username: username ? `@${username}` : "no username",
    firstName: ctx.from?.first_name,
    lastName: ctx.from?.last_name,
  });

  await db
    .insert(telegramConversation)
    .values({
      chatId,
      candidateName: ctx.from?.first_name,
      status: "ACTIVE",
    })
    .onConflictDoUpdate({
      target: telegramConversation.chatId,
      set: { status: "ACTIVE" },
    })
    .returning();

  await ctx.reply(
    `Привет! Я бот для общения с кандидатами.\n\nВаш Chat ID: ${chatId}\nUsername: ${username ? `@${username}` : "не указан"}`,
  );
});

bot.on("message:text", async (ctx) => {
  const chatId = ctx.chat.id.toString();
  const messageText = ctx.message.text;

  const [conversation] = await db
    .select()
    .from(telegramConversation)
    .where(eq(telegramConversation.chatId, chatId))
    .limit(1);

  if (!conversation) {
    await ctx.reply("Пожалуйста, начните с команды /start");
    return;
  }

  await db.insert(telegramMessage).values({
    conversationId: conversation.id,
    sender: "CANDIDATE",
    contentType: "TEXT",
    content: messageText,
    telegramMessageId: ctx.message.message_id.toString(),
  });

  await ctx.reply("Сообщение получено и сохранено в базе данных.");
});

bot.on("message:voice", async (ctx) => {
  const chatId = ctx.chat.id.toString();
  const voice = ctx.message.voice;

  const [conversation] = await db
    .select()
    .from(telegramConversation)
    .where(eq(telegramConversation.chatId, chatId))
    .limit(1);

  if (!conversation) {
    await ctx.reply("Пожалуйста, начните с команды /start");
    return;
  }

  try {
    const file = await ctx.api.getFile(voice.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${file.file_path}`;

    const response = await fetch(fileUrl);
    const fileBuffer = Buffer.from(await response.arrayBuffer());

    const { uploadFile } = await import("./storage");
    const fileId = await uploadFile(
      fileBuffer,
      `${voice.file_id}.ogg`,
      "audio/ogg",
    );

    // Парсим metadata для отслеживания прогресса ответов на вопросы
    let metadata: Record<string, unknown> = {};
    try {
      metadata = conversation.metadata ? JSON.parse(conversation.metadata) : {};
    } catch (e) {
      console.error("Ошибка парсинга metadata:", e);
    }

    const questionAnswers = (metadata.questionAnswers as unknown[]) || [];
    const totalQuestions = (metadata.totalQuestions as number) || 0;

    const [message] = await db
      .insert(telegramMessage)
      .values({
        conversationId: conversation.id,
        sender: "CANDIDATE",
        contentType: "VOICE",
        content: `Ответ на вопрос ${questionAnswers.length + 1}`,
        fileId,
        voiceDuration: voice.duration.toString(),
        telegramMessageId: ctx.message.message_id.toString(),
      })
      .returning();

    if (!message) {
      throw new Error("Не удалось создать запись сообщения");
    }

    // Запускаем транскрибацию в фоне через Inngest HTTP API
    if (env.INNGEST_EVENT_KEY) {
      await fetch(`${env.INNGEST_BASE_URL}/e/${env.INNGEST_EVENT_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "telegram/voice.transcribe",
          data: {
            messageId: message.id,
            fileId,
          },
        }),
      });
    } else {
      console.warn("⚠️ INNGEST_EVENT_KEY не установлен, событие не отправлено");
    }

    // Обновляем прогресс ответов
    if (totalQuestions > 0 && questionAnswers.length < totalQuestions) {
      questionAnswers.push({
        questionNumber: questionAnswers.length + 1,
        fileId,
        duration: voice.duration,
        answeredAt: new Date().toISOString(),
      });

      metadata.questionAnswers = questionAnswers;

      await db
        .update(telegramConversation)
        .set({ metadata: JSON.stringify(metadata) })
        .where(eq(telegramConversation.id, conversation.id));

      const remainingQuestions = totalQuestions - questionAnswers.length;

      if (remainingQuestions > 0) {
        await ctx.reply(
          `✅ Отлично! Ответ на вопрос ${questionAnswers.length} получен.\n\n` +
            `Осталось вопросов: ${remainingQuestions}\n\n` +
            `Пожалуйста, ответьте на следующий вопрос голосовым сообщением.`,
        );
      } else {
        await ctx.reply(
          `🎉 Спасибо! Вы ответили на все вопросы.\n\n` +
            `Мы внимательно изучим ваши ответы и свяжемся с вами в ближайшее время.`,
        );
      }
    } else {
      await ctx.reply("Голосовое сообщение получено и сохранено.");
    }
  } catch (error) {
    console.error("Ошибка при обработке голосового сообщения:", error);
    await ctx.reply("Произошла ошибка при обработке голосового сообщения.");
  }
});

export async function sendMessage(chatId: string, text: string) {
  const sentMessage = await bot.api.sendMessage(chatId, text);
  return sentMessage;
}
