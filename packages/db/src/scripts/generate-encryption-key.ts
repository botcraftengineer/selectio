import { generateEncryptionKey } from "../utils/encryption";

console.log("Сгенерированный ключ шифрования:");
console.log(generateEncryptionKey());
console.log("\nДобавьте его в .env файл:");
console.log(`ENCRYPTION_KEY=${generateEncryptionKey()}`);
