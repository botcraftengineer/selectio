import axios from "axios";
import { err, ok, type Result } from "../base";

interface CheckHHCredentialsResult {
  isValid: boolean;
  cookies?: Array<{ name: string; value: string }>;
  error?: string;
}

const axiosInstance = axios.create({
  timeout: 10000, // 10 seconds
});

/**
 * Checks HH credentials validity
 */
export async function checkHHCredentials(
  username: string,
  password?: string,
  existingCookies: Array<{ name: string; value: string }> = [],
): Promise<Result<CheckHHCredentialsResult, string>> {
  try {
    // Form Cookie header
    const cookieHeader = existingCookies
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");

    // First do GET request to get XSRF token and initial cookies
    const getResponse = await axiosInstance.get(
      "https://hh.ru/account/login?backurl=%2F&role=employer",
      {
        headers: {
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
          Cookie: cookieHeader,
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        },
        maxRedirects: 0,
        validateStatus: (status) => status < 400,
      },
    );

    // Extract cookies
    const setCookieHeaders = getResponse.headers["set-cookie"] || [];
    let xsrfToken = "";

    const allCookiesMap = new Map<string, string>();

    // Fill with existing
    for (const c of existingCookies) {
      allCookiesMap.set(c.name, c.value);
    }

    // Update with new ones
    for (const cookieStr of setCookieHeaders) {
      const parts = cookieStr.split(";");
      if (parts.length > 0) {
        const nameValue = parts[0];
        if (nameValue) {
          const [name, value] = nameValue.split("=");
          if (name && value) {
            allCookiesMap.set(name.trim(), value.trim());
          }
        }
      }

      // Check for both x-xsrftoken and _xsrf
      const xsrfMatch = cookieStr.match(/x-xsrftoken=([^;]+)/i);
      const underscoreXsrfMatch = cookieStr.match(/_xsrf=([^;]+)/i);

      if (xsrfMatch?.[1]) {
        xsrfToken = xsrfMatch[1];
      } else if (underscoreXsrfMatch?.[1]) {
        xsrfToken = underscoreXsrfMatch[1];
      }
    }

    if (!xsrfToken) {
      const existingXsrfCookie = existingCookies.find(
        (c) => c.name.toLowerCase() === "x-xsrftoken" || c.name === "_xsrf",
      );
      if (existingXsrfCookie) {
        xsrfToken = existingXsrfCookie.value;
      }
    }

    if (!xsrfToken && getResponse.headers["x-xsrftoken"]) {
      xsrfToken = getResponse.headers["x-xsrftoken"] as string;
    }

    if (!xsrfToken) {
      return err("XSRF токен не найден при попытке входа");
    }

    const newCookieHeader = Array.from(allCookiesMap.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");

    if (!password) {
      return err("Требуется пароль для проверки");
    }
    const formData = new URLSearchParams();
    formData.append("failUrl", "/account/login?backurl=%2F&role=employer");
    formData.append("accountType", "EMPLOYER");
    formData.append("role", "employer");
    formData.append("remember", "yes");
    formData.append("isBot", "false");
    formData.append("username", username);
    formData.append("password", password);

    const postResponse = await axiosInstance.post(
      "https://hh.ru/account/login?backurl=%2F&role=employer",
      formData.toString(),
      {
        headers: {
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: `${newCookieHeader}; x-xsrftoken=${xsrfToken}`,
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          "X-Xsrftoken": xsrfToken,
        },
        maxRedirects: 0,
        validateStatus: (status) => status < 400 || status === 302,
      },
    );

    const isLoginPage =
      postResponse.request?.path?.includes("/login") ||
      (typeof postResponse.data === "string" &&
        postResponse.data.includes("account.login")) ||
      (postResponse.status === 302 &&
        postResponse.headers.location?.includes("/login"));

    if (isLoginPage) {
      return ok({
        isValid: false,
        error: "Неверный логин или пароль",
      });
    }

    const finalExCookies = postResponse.headers["set-cookie"] || [];
    for (const cookieStr of finalExCookies) {
      const parts = cookieStr.split(";");
      if (parts.length > 0) {
        const nameValue = parts[0];
        if (nameValue) {
          const [name, value] = nameValue.split("=");
          if (name && value) {
            allCookiesMap.set(name.trim(), value.trim());
          }
        }
      }
    }

    const finalCookies = Array.from(allCookiesMap.entries()).map(
      ([name, value]) => ({ name, value }),
    );

    return ok({
      isValid: true,
      cookies: finalCookies,
      error: undefined,
    });
  } catch (error) {
    const msg =
      error instanceof Error
        ? error.message
        : "Неизвестная ошибка при проверке";
    console.error("checkHHCredentials error:", error);
    return err(msg);
  }
}
