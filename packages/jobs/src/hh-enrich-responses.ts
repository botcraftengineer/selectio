import { runEnricher } from "./parsers/hh/enricher";

// TODO: получить userId из аргументов командной строки или переменных окружения
const userId = process.env.USER_ID || "system";
runEnricher(userId).catch(console.error);
