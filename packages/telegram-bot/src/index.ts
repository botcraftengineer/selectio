import { bot } from "./bot";

bot.start();

console.log("Telegram bot запущен");

export { bot, sendMessage } from "./bot";
export { checkUsername, initClient, sendMessageByUsername } from "./client";
