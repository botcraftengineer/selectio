/**
 * Кастомная ошибка для передачи дополнительных данных
 */
export class TgClientError extends Error {
  constructor(
    message: string,
    public data?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "TgClientError";
  }
}

/**
 * SDK клиент для обращения к Telegram Client API
 */
export class TgClientSDK {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl =
      baseUrl || process.env.TG_CLIENT_URL || "http://localhost:8001";
  }

  private async request<T>(
    endpoint: string,
    data: Record<string, unknown>,
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = (await response.json()) as {
        error?: string;
        sessionData?: string;
      };
      throw new TgClientError(error.error || "Request failed", {
        sessionData: error.sessionData,
      });
    }

    return (await response.json()) as T;
  }

  /**
   * Отправить код авторизации на телефон
   */
  async sendCode(params: {
    apiId: number;
    apiHash: string;
    phone: string;
  }): Promise<{
    success: boolean;
    phoneCodeHash: string;
    timeout: number;
    sessionData: string;
  }> {
    return this.request("/auth/send-code", params);
  }

  /**
   * Войти с кодом из SMS
   */
  async signIn(params: {
    apiId: number;
    apiHash: string;
    phone: string;
    phoneCode: string;
    phoneCodeHash: string;
    sessionData?: string;
  }): Promise<{
    success: boolean;
    sessionData: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      username: string;
      phone: string;
    };
  }> {
    return this.request("/auth/sign-in", params);
  }

  /**
   * Войти с паролем 2FA
   */
  async checkPassword(params: {
    apiId: number;
    apiHash: string;
    phone: string;
    password: string;
    sessionData: string;
  }): Promise<{
    success: boolean;
    sessionData: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      username: string;
      phone: string;
    };
  }> {
    return this.request("/auth/check-password", params);
  }

  /**
   * Отправить сообщение
   */
  async sendMessage(params: {
    apiId: number;
    apiHash: string;
    sessionData: Record<string, string>;
    chatId: string;
    text: string;
  }): Promise<{
    success: boolean;
    messageId: string;
    chatId: string;
  }> {
    return this.request("/messages/send", params);
  }

  /**
   * Отправить сообщение по username
   */
  async sendMessageByUsername(params: {
    apiId: number;
    apiHash: string;
    sessionData: Record<string, string>;
    username: string;
    text: string;
  }): Promise<{
    success: boolean;
    messageId: string;
    chatId: string;
  }> {
    return this.request("/messages/send-by-username", params);
  }

  /**
   * Отправить сообщение по телефону
   */
  async sendMessageByPhone(params: {
    apiId: number;
    apiHash: string;
    sessionData: Record<string, string>;
    phone: string;
    text: string;
    firstName?: string;
  }): Promise<{
    success: boolean;
    messageId: string;
    chatId: string;
    userId: string;
  }> {
    return this.request("/messages/send-by-phone", params);
  }

  /**
   * Проверить здоровье сервиса
   */
  async health(): Promise<{ status: string; service: string }> {
    const response = await fetch(`${this.baseUrl}/health`);
    return (await response.json()) as { status: string; service: string };
  }
}

// Экспортируем singleton instance
export const tgClientSDK = new TgClientSDK();
