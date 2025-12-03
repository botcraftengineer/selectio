# Kubernetes Deployment Guide

## Обзор

Telegram боты запускаются в k3s как single-replica Deployment с:
- ✅ Health checks (liveness/readiness probes)
- ✅ Graceful shutdown (30s termination grace period)
- ✅ Prometheus metrics
- ✅ Rolling updates без downtime
- ✅ Auto-restart при падении

## Быстрый старт

### 1. Создать secrets

```bash
kubectl create secret generic app-secrets \
  --from-literal=database-url="postgresql://user:pass@host:5432/db" \
  --from-literal=encryption-key="$(openssl rand -base64 32)" \
  --from-literal=inngest-event-key="your-inngest-key"

kubectl create secret generic aws-secrets \
  --from-literal=access-key-id="your-aws-key" \
  --from-literal=secret-access-key="your-aws-secret"
```

### 2. Build & Push image

```bash
# В корне проекта
docker build -f packages/tg-client/Dockerfile -t your-registry/telegram-bots:latest .
docker push your-registry/telegram-bots:latest
```

### 3. Deploy

```bash
# Обновить image в deployment.yaml
sed -i 's|your-registry/telegram-bots:latest|your-actual-registry/telegram-bots:latest|' packages/tg-client/k8s/deployment.yaml

# Apply
kubectl apply -f packages/tg-client/k8s/
```

### 4. Проверка

```bash
# Статус
kubectl get pods -l app=telegram-bots

# Логи
kubectl logs -f deployment/telegram-bots

# Health
kubectl port-forward deployment/telegram-bots 8002:8002
curl http://localhost:8002/healthz  # → {"status":"ok"}
curl http://localhost:8002/readyz   # → {"status":"ready","bots":3}
```

## Health Endpoints

### /healthz (Liveness)

Проверяет, что процесс жив:

```bash
curl http://localhost:8002/healthz
# {"status":"ok"}
```

Используется для:
- Определения, нужно ли перезапустить pod
- Если fails 3 раза → pod перезапускается

### /readyz (Readiness)

Проверяет, что боты готовы:

```bash
curl http://localhost:8002/readyz
# {"status":"ready","bots":3,"details":[...]}
```

Используется для:
- Определения, готов ли pod принимать трафик
- Если fails → pod исключается из Service

### /metrics (Prometheus)

Метрики в формате Prometheus:

```bash
curl http://localhost:8002/metrics
# telegram_bots_total 3
# telegram_bots_info{workspace_id="ws_123",username="bot1"} 1
```

## Архитектура

```
┌─────────────────────────────────────┐
│         Kubernetes Pod              │
│                                     │
│  ┌──────────────────────────────┐  │
│  │   Telegram Bots Process      │  │
│  │                              │  │
│  │  ┌────────┐  ┌────────┐     │  │
│  │  │ Bot 1  │  │ Bot 2  │ ... │  │
│  │  │(ws_123)│  │(ws_456)│     │  │
│  │  └────────┘  └────────┘     │  │
│  │                              │  │
│  │  ┌────────────────────────┐ │  │
│  │  │   Health Server :8002  │ │  │
│  │  │  /healthz /readyz      │ │  │
│  │  └────────────────────────┘ │  │
│  └──────────────────────────────┘  │
│                                     │
│  Probes:                            │
│  ├─ Liveness  → /healthz           │
│  └─ Readiness → /readyz            │
└─────────────────────────────────────┘
         │
         ├─→ PostgreSQL (integrations)
         ├─→ S3 (voice files)
         └─→ Inngest (transcription)
```

## Graceful Shutdown

При rolling update или scale down:

```
1. Kubernetes отправляет SIGTERM
   ↓
2. Pod перестает получать трафик (readiness = false)
   ↓
3. Приложение вызывает botManager.stopAll()
   ↓
4. Все боты корректно отключаются
   ↓
5. После 30 секунд pod убивается (если не завершился)
```

Код в `start-bot.ts`:

```typescript
process.on("SIGTERM", async () => {
  console.log("🛑 Получен SIGTERM, останавливаем ботов...");
  await botManager.stopAll();
  process.exit(0);
});
```

## Rolling Updates

Стратегия обновления:

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 0  # Всегда держать 1 pod
    maxSurge: 1        # Создать новый перед удалением старого
```

Процесс:
1. ✅ Создается новый pod (v2)
2. ✅ Новый pod проходит readiness check
3. ✅ Старый pod (v1) получает SIGTERM
4. ✅ Старый pod gracefully останавливается
5. ✅ Старый pod удаляется
6. ✅ Zero downtime!

## Мониторинг

### Grafana Dashboard

Пример запросов:

```promql
# Количество ботов
telegram_bots_total

# Боты по workspace
sum by (workspace_id) (telegram_bots_info)

# Uptime
up{job="telegram-bots"}

# Restarts
rate(kube_pod_container_status_restarts_total{pod=~"telegram-bots.*"}[5m])
```

### Alerts

```yaml
# AlertManager rules
groups:
- name: telegram-bots
  rules:
  - alert: TelegramBotsDown
    expr: up{job="telegram-bots"} == 0
    for: 1m
    annotations:
      summary: "Telegram bots are down"
  
  - alert: NoBotsRunning
    expr: telegram_bots_total == 0
    for: 5m
    annotations:
      summary: "No bots are running"
```

## Scaling

**Важно:** Используйте только 1 реплику!

```yaml
replicas: 1
```

Почему:
- Несколько реплик = дублирование сообщений
- Каждая реплика обрабатывает ВСЕ сообщения
- MTProto не поддерживает load balancing

Для HA:
- ✅ Используйте `restartPolicy: Always`
- ✅ Настройте liveness/readiness probes
- ✅ k8s автоматически перезапустит при падении

## Resources

Рекомендации:

```yaml
resources:
  requests:
    memory: "256Mi"  # Базовое потребление
    cpu: "100m"      # 0.1 CPU
  limits:
    memory: "512Mi"  # Пик при обработке голосовых
    cpu: "500m"      # 0.5 CPU
```

Настройте под вашу нагрузку:
- 1-5 ботов: 256Mi/100m
- 5-20 ботов: 512Mi/200m
- 20+ ботов: 1Gi/500m

## Troubleshooting

### Pod в CrashLoopBackOff

```bash
# Проверить логи
kubectl logs -l app=telegram-bots --previous

# Частые причины:
# - Нет доступа к БД
# - Неверный ENCRYPTION_KEY
# - Нет активных интеграций
```

### Readiness probe fails

```bash
# Проверить endpoint
kubectl port-forward deployment/telegram-bots 8002:8002
curl http://localhost:8002/readyz

# Если {"status":"not ready","bots":0}:
# - Проверить интеграции в БД
# - Проверить логи на ошибки авторизации
```

### Боты не получают сообщения

```bash
# 1. Проверить pod
kubectl get pods -l app=telegram-bots
# STATUS должен быть Running

# 2. Проверить readiness
kubectl describe pod -l app=telegram-bots | grep -A5 Readiness
# Ready должен быть True

# 3. Проверить логи
kubectl logs -f deployment/telegram-bots
# Должно быть "👂 Слушаем входящие сообщения..."

# 4. Проверить metrics
curl http://localhost:8002/metrics | grep telegram_bots_total
# Должно быть > 0
```

### Memory leak

```bash
# Мониторить память
kubectl top pod -l app=telegram-bots

# Если растет:
# - Проверить количество ботов
# - Увеличить limits
# - Перезапустить pod
kubectl rollout restart deployment/telegram-bots
```

## Best Practices

### 1. Используйте init containers для миграций

```yaml
initContainers:
- name: migrate
  image: your-registry/migrations:latest
  command: ["bun", "run", "migrate"]
```

### 2. Используйте PodDisruptionBudget

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: telegram-bots
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: telegram-bots
```

### 3. Настройте HPA (если нужно)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: telegram-bots
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: telegram-bots
  minReplicas: 1
  maxReplicas: 1  # Всегда 1!
```

### 4. Используйте NetworkPolicy

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: telegram-bots
spec:
  podSelector:
    matchLabels:
      app: telegram-bots
  policyTypes:
  - Egress
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - namespaceSelector: {}
    ports:
    - protocol: TCP
      port: 443  # Telegram API
```

## CI/CD

### GitHub Actions

```yaml
name: Deploy Telegram Bots

on:
  push:
    branches: [main]
    paths:
      - 'packages/tg-client/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build image
        run: |
          docker build -f packages/tg-client/Dockerfile \
            -t ${{ secrets.REGISTRY }}/telegram-bots:${{ github.sha }} .
      
      - name: Push image
        run: docker push ${{ secrets.REGISTRY }}/telegram-bots:${{ github.sha }}
      
      - name: Deploy to k8s
        run: |
          kubectl set image deployment/telegram-bots \
            telegram-bots=${{ secrets.REGISTRY }}/telegram-bots:${{ github.sha }}
          kubectl rollout status deployment/telegram-bots
```

## Заключение

Telegram боты готовы к production в k3s с:
- ✅ Zero downtime updates
- ✅ Auto-restart при падении
- ✅ Health checks
- ✅ Prometheus metrics
- ✅ Graceful shutdown

Все проверки типов пройдены ✅
