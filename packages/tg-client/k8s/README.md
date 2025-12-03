# Kubernetes Deployment

## Структура

```
k8s/
├── deployment.yaml         # Боты Deployment
├── service.yaml           # Боты Service (health)
├── servicemonitor.yaml    # Prometheus ServiceMonitor
├── api-deployment.yaml    # API Deployment
├── api-service.yaml       # API Service (ClusterIP + LoadBalancer)
├── api-ingress.yaml       # API Ingress (опционально)
└── api-hpa.yaml          # API HorizontalPodAutoscaler
```

## Требования

- Kubernetes 1.19+
- k3s или любой другой Kubernetes кластер
- PostgreSQL (доступен из кластера)
- Secrets с credentials

## Secrets

Создайте secrets перед деплоем:

```bash
# App secrets
kubectl create secret generic app-secrets \
  --from-literal=database-url="postgresql://user:pass@host:5432/db" \
  --from-literal=encryption-key="your-32-char-encryption-key" \
  --from-literal=inngest-event-key="your-inngest-key"

# AWS secrets (для S3)
kubectl create secret generic aws-secrets \
  --from-literal=access-key-id="your-aws-key" \
  --from-literal=secret-access-key="your-aws-secret"
```

## Deployment

### 1. Build Docker images

```bash
# В корне проекта (важно!)

# Боты
docker build -f packages/tg-client/Dockerfile -t your-registry/telegram-bots:latest .
docker push your-registry/telegram-bots:latest

# API
docker build -f packages/tg-client/Dockerfile.api -t your-registry/telegram-api:latest .
docker push your-registry/telegram-api:latest
```

**Важно:** Сборка использует Turborepo pruning для оптимизации:
- ✅ Только необходимые зависимости
- ✅ Меньший размер образа
- ✅ Быстрее сборка
- ✅ Лучше кэширование слоев

### 2. Обновите deployments

Замените `your-registry` на ваш registry в:
- `deployment.yaml` (боты)
- `api-deployment.yaml` (API)
- `api-ingress.yaml` (домен)

### 3. Deploy

```bash
# Все сразу
kubectl apply -f packages/tg-client/k8s/

# Или по отдельности
kubectl apply -f packages/tg-client/k8s/deployment.yaml
kubectl apply -f packages/tg-client/k8s/service.yaml
kubectl apply -f packages/tg-client/k8s/api-deployment.yaml
kubectl apply -f packages/tg-client/k8s/api-service.yaml
kubectl apply -f packages/tg-client/k8s/api-ingress.yaml  # опционально
kubectl apply -f packages/tg-client/k8s/api-hpa.yaml      # опционально
```

### 4. Проверка

#### Боты

```bash
# Проверить pods
kubectl get pods -l app=telegram-bots

# Логи
kubectl logs -f deployment/telegram-bots

# Health check
kubectl port-forward deployment/telegram-bots 8002:8002
curl http://localhost:8002/healthz
curl http://localhost:8002/readyz
curl http://localhost:8002/metrics
```

#### API

```bash
# Проверить pods
kubectl get pods -l app=telegram-api

# Логи
kubectl logs -f deployment/telegram-api

# Health check
kubectl port-forward deployment/telegram-api 8001:8001
curl http://localhost:8001/health

# Тест API
curl -X POST http://localhost:8001/auth/send-code \
  -H "Content-Type: application/json" \
  -d '{"apiId":123456,"apiHash":"hash","phone":"+79991234567"}'
```

## Health Checks

### Liveness Probe

Проверяет, что процесс жив:

```
GET /healthz
→ 200 OK { "status": "ok" }
```

Если fails 3 раза подряд → pod перезапускается.

### Readiness Probe

Проверяет, что боты готовы принимать сообщения:

```
GET /readyz
→ 200 OK { "status": "ready", "bots": 3, "details": [...] }
→ 503 Service Unavailable { "status": "not ready", "bots": 0 }
```

Если fails → pod исключается из Service (не получает трафик).

## Metrics

Prometheus метрики доступны на `/metrics`:

```
telegram_bots_total 3
telegram_bots_info{workspace_id="ws_123",username="bot1"} 1
telegram_bots_info{workspace_id="ws_456",username="bot2"} 1
```

Для сбора метрик используйте ServiceMonitor (требуется Prometheus Operator).

## Graceful Shutdown

При остановке pod (rolling update, scale down):

1. Kubernetes отправляет SIGTERM
2. Pod перестает получать новый трафик (readiness = false)
3. Приложение останавливает всех ботов
4. После 30 секунд (terminationGracePeriodSeconds) pod убивается

## Scaling

**Важно:** Используйте только 1 реплику!

```yaml
replicas: 1
```

Причина: Несколько реплик будут обрабатывать одни и те же сообщения (дублирование).

Если нужна высокая доступность:
- Используйте `restartPolicy: Always`
- Настройте liveness/readiness probes
- k8s автоматически перезапустит pod при падении

## Rolling Updates

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 0  # Всегда держать 1 pod работающим
    maxSurge: 1        # Создать новый pod перед удалением старого
```

Процесс:
1. Создается новый pod
2. Новый pod проходит readiness check
3. Старый pod получает SIGTERM
4. Старый pod gracefully останавливается
5. Старый pod удаляется

## Мониторинг

### Логи

```bash
# Все логи
kubectl logs -f deployment/telegram-bots

# Последние 100 строк
kubectl logs --tail=100 deployment/telegram-bots

# С timestamp
kubectl logs --timestamps deployment/telegram-bots
```

### Events

```bash
kubectl get events --sort-by='.lastTimestamp' | grep telegram-bots
```

### Describe

```bash
kubectl describe deployment telegram-bots
kubectl describe pod -l app=telegram-bots
```

## Troubleshooting

### Pod не запускается

```bash
# Проверить статус
kubectl get pods -l app=telegram-bots

# Проверить events
kubectl describe pod -l app=telegram-bots

# Проверить логи
kubectl logs -l app=telegram-bots
```

### Readiness probe fails

```bash
# Проверить health endpoint
kubectl port-forward deployment/telegram-bots 8002:8002
curl http://localhost:8002/readyz

# Возможные причины:
# - Нет активных интеграций в БД
# - Ошибка подключения к БД
# - Ошибка авторизации в Telegram
```

### Боты не получают сообщения

1. Проверить, что pod running:
```bash
kubectl get pods -l app=telegram-bots
```

2. Проверить логи:
```bash
kubectl logs -f deployment/telegram-bots
```

3. Проверить readiness:
```bash
curl http://localhost:8002/readyz
```

4. Проверить интеграции в БД:
```sql
SELECT * FROM integrations WHERE type = 'telegram' AND is_active = 'true';
```

## Обновление

```bash
# Build новый image
docker build -f packages/tg-client/Dockerfile -t your-registry/telegram-bots:v2 .
docker push your-registry/telegram-bots:v2

# Обновить deployment
kubectl set image deployment/telegram-bots telegram-bots=your-registry/telegram-bots:v2

# Или через apply
kubectl apply -f packages/tg-client/k8s/deployment.yaml

# Следить за rollout
kubectl rollout status deployment/telegram-bots
```

## Rollback

```bash
# Откатить к предыдущей версии
kubectl rollout undo deployment/telegram-bots

# Откатить к конкретной ревизии
kubectl rollout history deployment/telegram-bots
kubectl rollout undo deployment/telegram-bots --to-revision=2
```

## Resources

Рекомендуемые ресурсы:

```yaml
resources:
  requests:
    memory: "256Mi"  # Минимум для работы
    cpu: "100m"      # 0.1 CPU
  limits:
    memory: "512Mi"  # Максимум
    cpu: "500m"      # 0.5 CPU
```

Настройте под вашу нагрузку (количество ботов, сообщений).
