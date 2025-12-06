import sharp from "sharp";

export interface ImageOptimizeOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: "webp" | "jpeg" | "png";
}

/**
 * Оптимизирует изображение и возвращает base64
 */
export async function optimizeImageToBase64(
  input: Buffer | string,
  options: ImageOptimizeOptions = {},
): Promise<string> {
  const { width = 256, height = 256, quality = 80, format = "webp" } = options;

  let buffer: Buffer;

  // Если input - это base64 или data URL, конвертируем в Buffer
  if (typeof input === "string") {
    if (input.startsWith("data:")) {
      // Извлекаем base64 из data URL
      const base64Data = input.split(",")[1];
      if (!base64Data) {
        throw new Error("Некорректный data URL");
      }
      buffer = Buffer.from(base64Data, "base64");
    } else {
      // Предполагаем, что это чистый base64
      buffer = Buffer.from(input, "base64");
    }
  } else {
    buffer = input;
  }

  // Обрабатываем изображение
  const processed = await sharp(buffer)
    .resize(width, height, {
      fit: "cover",
      position: "center",
    })
    .toFormat(format, { quality })
    .toBuffer();

  // Возвращаем data URL
  const mimeType = `image/${format}`;
  const base64 = processed.toString("base64");
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Оптимизирует аватарку пользователя
 */
export async function optimizeAvatar(input: Buffer | string): Promise<string> {
  return optimizeImageToBase64(input, {
    width: 100,
    height: 100,
    quality: 85,
    format: "webp",
  });
}

/**
 * Оптимизирует логотип workspace
 */
export async function optimizeLogo(input: Buffer | string): Promise<string> {
  return optimizeImageToBase64(input, {
    width: 100,
    height: 100,
    quality: 85,
    format: "webp",
  });
}
