import { runHHParser } from "./parsers/hh";

// TODO: получить userId из аргументов командной строки или переменных окружения
const userId = process.env.USER_ID || "system";
runHHParser(userId).catch(console.error);
