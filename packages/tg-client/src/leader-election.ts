import { sql } from "@selectio/db";
import { db } from "@selectio/db/client";

/**
 * Leader Election для координации нескольких реплик ботов
 * Гарантирует, что только 1 pod активно обрабатывает сообщения
 */
export class LeaderElection {
  private isLeader = false;
  private leaderCheckInterval: Timer | null = null;
  private readonly podName: string;
  private readonly lockKey = "telegram-bots-leader";
  private readonly ttl = 30000; // 30 секунд

  constructor() {
    // Используем HOSTNAME из Kubernetes
    this.podName = process.env.HOSTNAME || `pod-${Date.now()}`;
  }

  /**
   * Запустить leader election
   */
  async start(): Promise<void> {
    console.log(`🗳️ Запуск leader election для ${this.podName}`);

    // Пытаемся стать лидером сразу
    await this.tryBecomeLeader();

    // Проверяем каждые 10 секунд
    this.leaderCheckInterval = setInterval(async () => {
      await this.tryBecomeLeader();
    }, 10000);
  }

  /**
   * Остановить leader election
   */
  async stop(): Promise<void> {
    if (this.leaderCheckInterval) {
      clearInterval(this.leaderCheckInterval);
      this.leaderCheckInterval = null;
    }

    if (this.isLeader) {
      await this.releaseLock();
    }
  }

  /**
   * Попытаться стать лидером
   */
  private async tryBecomeLeader(): Promise<void> {
    try {
      // Пытаемся получить или обновить lock
      const result = await db.execute(sql`
        INSERT INTO leader_locks (key, holder, expires_at)
        VALUES (
          ${this.lockKey},
          ${this.podName},
          NOW() + INTERVAL '30 seconds'
        )
        ON CONFLICT (key) DO UPDATE
        SET 
          holder = ${this.podName},
          expires_at = NOW() + INTERVAL '30 seconds',
          updated_at = NOW()
        WHERE 
          leader_locks.expires_at < NOW()
          OR leader_locks.holder = ${this.podName}
        RETURNING holder
      `);

      const wasLeader = this.isLeader;

      if (result.rows.length > 0 && result.rows[0]?.holder === this.podName) {
        this.isLeader = true;

        if (!wasLeader) {
          console.log(`✅ ${this.podName} стал лидером`);
        }
      } else {
        if (wasLeader) {
          console.log(`⚠️ ${this.podName} потерял лидерство`);
        }
        this.isLeader = false;
      }
    } catch (error) {
      console.error("❌ Ошибка leader election:", error);
      this.isLeader = false;
    }
  }

  /**
   * Освободить lock
   */
  private async releaseLock(): Promise<void> {
    try {
      await db.execute(sql`
        DELETE FROM leader_locks
        WHERE key = ${this.lockKey} AND holder = ${this.podName}
      `);
      console.log(`🔓 ${this.podName} освободил lock`);
      this.isLeader = false;
    } catch (error) {
      console.error("❌ Ошибка освобождения lock:", error);
    }
  }

  /**
   * Проверить, является ли текущий pod лидером
   */
  getIsLeader(): boolean {
    return this.isLeader;
  }

  /**
   * Получить имя текущего лидера
   */
  async getCurrentLeader(): Promise<string | null> {
    try {
      const result = await db.execute(sql`
        SELECT holder
        FROM leader_locks
        WHERE key = ${this.lockKey} AND expires_at > NOW()
        LIMIT 1
      `);

      return result.rows[0]?.holder || null;
    } catch (error) {
      console.error("❌ Ошибка получения лидера:", error);
      return null;
    }
  }
}
