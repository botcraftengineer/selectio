# Zero Downtime для Telegram ботов

## Проблема

При rolling update ботов:
1. Старый pod получает SIGTERM и останавливается
2. Новый pod еще запускается
3. **Сообщения от пользователей теряются!**

Telegram не хранит сообщения в очереди - если бот не онлайн, сообщение пропадает.

## Решение 1: Увеличить terminationGracePeriodSeconds

Дать старому поду больше времени на graceful shutdown:

```yaml
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 60  # Было 30
      
      containers:
      - name: telegram-bots
        lifecycle:
          preStop:
            exec:
              # Ждем, пока новый pod станет ready
              command: ["/bin/sh", "-c", "sleep 30"]
```

**Как работает:**
1. Новый pod запускается (10-15s)
2. Новый pod проходит readiness check (5-10s)
3. Старый pod получает SIGTERM
4. Старый pod ждет 30s (preStop)
5. За это время новый pod уже готов
6. Старый pod останавливается

**Проблема:** Все равно есть gap, если новый pod долго запускается.

## Решение 2: Использовать StatefulSet (Рекомендуется)

StatefulSet гарантирует упорядоченное обновление:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: telegram-bots
spec:
  serviceName: telegram-bots
  replicas: 1
  
  # Упорядоченное обновление
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      partition: 0  # Обновлять по одному
  
  # Упорядоченное создание/удаление
  podManagementPolicy: OrderedReady
  
  template:
    spec:
      terminationGracePeriodSeconds: 60
      
      containers:
      - name: telegram-bots
        # ... остальное как в Deployment
        
        readinessProbe:
          httpGet:
            path: /readyz
            port: 8002
          initialDelaySeconds: 10
          periodSeconds: 5
          successThreshold: 2  # Должен быть ready 2 раза подряд
```

**Как работает:**
1. StatefulSet создает новый pod
2. Ждет, пока он станет Ready (successThreshold: 2)
3. Только потом удаляет старый pod
4. **Гарантия: всегда есть 1 ready pod**

## Решение 3: Временно 2 реплики при обновлении

Используем lifecycle hook для координации:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: telegram-bots
spec:
  replicas: 1
  
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1        # Создать 1 дополнительный pod
      maxUnavailable: 0  # Не удалять старый, пока новый не ready
  
  template:
    spec:
      terminationGracePeriodSeconds: 60
      
      containers:
      - name: telegram-bots
        readinessProbe:
          httpGet:
            path: /readyz
            port: 8002
          initialDelaySeconds: 15
          periodSeconds: 5
          failureThreshold: 3
          successThreshold: 2  # Важно!
        
        lifecycle:
          preStop:
            exec:
              command:
              - /bin/sh
              - -c
              - |
                # Ждем 30 секунд перед остановкой
                echo "Waiting for new pod to be ready..."
                sleep 30
                echo "Shutting down gracefully..."
```

**Как работает:**
1. Создается 2-й pod (maxSurge: 1)
2. Новый pod проходит readiness (successThreshold: 2)
3. Старый pod получает SIGTERM
4. Старый pod ждет 30s (preStop)
5. Старый pod останавливается
6. **Результат: всегда минимум 1 ready pod**

**Проблема:** Временно 2 бота обрабатывают сообщения → дублирование!

## Решение 4: Leader Election (Лучшее решение)

Используем leader election, чтобы только 1 бот был активен:

```typescript
// packages/tg-client/src/leader-election.ts
import { db } from "@selectio/db/client";
import { sql } from "@selectio/db";

export class LeaderElection {
  private isLeader = false;
  private leaderCheckInterval: Timer | null = null;
  private readonly podName: string;
  private readonly lockKey = "telegram-bots-leader";
  private readonly ttl = 30000; // 30 секунд

  constructor() {
    this.podName = process.env.HOSTNAME || `pod-${Date.now()}`;
  }

  async start(): Promise<void> {
    // Пытаемся стать лидером
    await this.tryBecomeLeader();

    // Проверяем каждые 10 секунд
    this.leaderCheckInterval = setInterval(async () => {
      await this.tryBecomeLeader();
    }, 10000);
  }

  async stop(): Promise<void> {
    if (this.leaderCheckInterval) {
      clearInterval(this.leaderCheckInterval);
    }

    if (this.isLeader) {
      await this.releaseLock();
    }
  }

  private async tryBecomeLeader(): Promise<void> {
    try {
      // Пытаемся получить lock
      const result = await db.execute(sql`
        INSERT INTO leader_locks (key, holder, expires_at)
        VALUES (${this.lockKey}, ${this.podName}, NOW() + INTERVAL '30 seconds')
        ON CONFLICT (key) DO UPDATE
        SET holder = ${this.podName},
            expires_at = NOW() + INTERVAL '30 seconds'
        WHERE leader_locks.expires_at < NOW()
        RETURNING holder
      `);

      if (result.rows.length > 0) {
        const wasLeader = this.isLeader;
        this.isLeader = true;

        if (!wasLeader) {
          console.log(`✅ ${this.podName} стал лидером`);
        }
      } else {
        if (this.isLeader) {
          console.log(`⚠️ ${this.podName} потерял лидерство`);
        }
        this.isLeader = false;
      }
    } catch (error) {
      console.error("Ошибка leader election:", error);
      this.isLeader = false;
    }
  }

  private async releaseLock(): Promise<void> {
    await db.execute(sql`
      DELETE FROM leader_locks
      WHERE key = ${this.lockKey} AND holder = ${this.podName}
    `);
    console.log(`🔓 ${this.podName} освободил lock`);
  }

  getIsLeader(): boolean {
    return this.isLeader;
  }
}
```

Обновляем bot-manager:

```typescript
// packages/tg-client/src/bot-manager.ts
import { LeaderElection } from "./leader-election";

class BotManager {
  private leaderElection: LeaderElection | null = null;

  async startAll(): Promise<void> {
    // Запускаем leader election
    this.leaderElection = new LeaderElection();
    await this.leaderElection.start();

    // Ждем, пока станем лидером
    while (!this.leaderElection.getIsLeader()) {
      console.log("⏳ Ожидание лидерства...");
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log("✅ Стали лидером, запускаем ботов...");

    // Запускаем ботов только если мы лидер
    // ... остальной код
  }

  async stopAll(): Promise<void> {
    if (this.leaderElection) {
      await this.leaderElection.stop();
    }
    // ... остальной код
  }
}
```

**Как работает:**
1. Оба пода запускаются
2. Они соревнуются за lock в БД
3. Только 1 становится лидером
4. Только лидер запускает ботов
5. При падении лидера, другой pod становится лидером
6. **Гарантия: всегда ровно 1 активный бот**

## Решение 5: Использовать Telegram Webhook вместо Long Polling

Вместо того, чтобы боты сами опрашивали Telegram, используем webhook:

```typescript
// Telegram отправляет сообщения на наш endpoint
app.post("/webhook/:workspaceId", async (c) => {
  const workspaceId = c.req.param("workspaceId");
  const update = await c.req.json();

  // Обрабатываем сообщение
  await handleUpdate(workspaceId, update);

  return c.json({ ok: true });
});
```

**Преимущества:**
- ✅ Telegram гарантирует доставку (retry)
- ✅ Можно масштабировать API (несколько реплик)
- ✅ Нет проблемы с downtime

**Проблема:** MTProto не поддерживает webhook, только Bot API.

## Рекомендация

**Используйте Решение 3 + Решение 4:**

1. **Deployment с maxSurge: 1, maxUnavailable: 0**
2. **Leader Election** для координации
3. **Увеличенный terminationGracePeriodSeconds**

### Итоговый deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: telegram-bots
spec:
  replicas: 2  # Теперь 2 реплики для HA
  
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  
  template:
    spec:
      terminationGracePeriodSeconds: 60
      
      containers:
      - name: telegram-bots
        env:
        - name: HOSTNAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        
        readinessProbe:
          httpGet:
            path: /readyz
            port: 8002
          initialDelaySeconds: 15
          periodSeconds: 5
          successThreshold: 2
          failureThreshold: 3
        
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8002
          initialDelaySeconds: 30
          periodSeconds: 10
          failureThreshold: 3
        
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 30"]
```

### Миграция БД

```sql
CREATE TABLE IF NOT EXISTS leader_locks (
  key VARCHAR(255) PRIMARY KEY,
  holder VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_leader_locks_expires ON leader_locks(expires_at);
```

## Мониторинг

### Проверить лидера

```bash
# Логи
kubectl logs -l app=telegram-bots | grep "лидером"

# БД
psql -c "SELECT * FROM leader_locks WHERE key = 'telegram-bots-leader';"
```

### Метрики

```typescript
// Добавить в health-server.ts
app.get("/metrics", (c) => {
  const isLeader = botManager.isLeader() ? 1 : 0;
  
  return c.text(`
telegram_bots_is_leader ${isLeader}
telegram_bots_total ${botManager.getBotsCount()}
  `);
});
```

## Тестирование

```bash
# 1. Запустить 2 реплики
kubectl scale deployment telegram-bots --replicas=2

# 2. Проверить, что только 1 лидер
kubectl logs -l app=telegram-bots | grep "лидером"

# 3. Убить лидера
kubectl delete pod telegram-bots-xxx

# 4. Проверить, что другой pod стал лидером
kubectl logs -l app=telegram-bots | grep "лидером"

# 5. Отправить сообщение боту
# Должно обработаться без потерь
```

## Заключение

**Без leader election:** Сообщения теряются при обновлении  
**С leader election:** Zero downtime, всегда есть активный бот

Рекомендуется использовать **Решение 4 (Leader Election)** ✅
