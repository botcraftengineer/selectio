import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;

/**
 * Получить ключ шифрования из переменной окружения
 */
function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY не установлен в переменных окружения");
  }
  if (key.length !== 64) {
    throw new Error("ENCRYPTION_KEY должен быть 64 символа (32 байта в hex)");
  }
  return key;
}

/**
 * Шифрует данные
 */
export function encrypt(text: string): string {
  const key = Buffer.from(getEncryptionKey(), "hex");
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Формат: iv:authTag:encrypted
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Расшифровывает данные
 */
export function decrypt(encryptedData: string): string {
  const key = Buffer.from(getEncryptionKey(), "hex");
  const parts = encryptedData.split(":");

  if (parts.length !== 3) {
    throw new Error("Неверный формат зашифрованных данных");
  }

  const iv = Buffer.from(parts[0]!, "hex");
  const authTag = Buffer.from(parts[1]!, "hex");
  const encrypted = parts[2]!;

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Шифрует объект credentials
 */
export function encryptCredentials(
  credentials: Record<string, string>
): Record<string, string> {
  const encrypted: Record<string, string> = {};

  for (const [key, value] of Object.entries(credentials)) {
    encrypted[key] = encrypt(value);
  }

  return encrypted;
}

/**
 * Расшифровывает объект credentials
 */
export function decryptCredentials(
  encryptedCredentials: Record<string, string>
): Record<string, string> {
  const decrypted: Record<string, string> = {};

  for (const [key, value] of Object.entries(encryptedCredentials)) {
    decrypted[key] = decrypt(value);
  }

  return decrypted;
}

/**
 * Генерирует новый ключ шифрования (для первоначальной настройки)
 */
export function generateEncryptionKey(): string {
  return randomBytes(32).toString("hex");
}
