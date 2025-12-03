# Telegram API Deployment

## Обзор

HTTP API для авторизации и отправки сообщений через Telegram MTProto.

## Endpoints

- `POST /auth/send-code` - отправить код авторизации
- `POST /auth/sign-in` - войти с кодом
- `POST /auth/check-password` - войти с 2FA паролем
- `POST /messages/send` - отправить сообщение
- `POST /messages/send-by-username` - отправить по username
- `POST /messages/send-by-phone` - отправить по телефону
- `GET /health` - health check

## Kubernetes Deployment

### Архитектура

```
┌─────────────────────────────────────┐
│         Load Balancer / Ingress     │
│     telegram-api.yourdomain.com     │
└─────────────────┬───────────────────┘
                  │
         ┌────────┴────────┐
         │   Service       │
         │  telegram-api   │
         └────────┬────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
┌───▼───┐    ┌───▼───┐    ┌───▼───┐
│ Pod 1 │    │ Pod 2 │    │ Pod N │
│ :8001 │    │ :8001 │    │ :8001 │
└───────┘    └───────┘    └───────┘
```

### Особенности

- ✅ **Масштабируемость**: 2-10 реплик с HPA
- ✅ **Load Balancing**: Автоматический между подами
- ✅ **Rolling Updates**: Zero downtime
- ✅ **Health Checks**: Liveness + Readiness probes
- ✅ **Auto-scaling**: По CPU/Memory

### Build & Deploy

```bash
# Build
docker build -f packages/tg-client/Dockerfile.api \
  -t your-registry/telegram-api:latest .

# Push
docker push your-registry/telegram-api:latest

# Deploy
kubectl apply -f packages/tg-client/k8s/api-deployment.yaml
kubectl apply -f packages/tg-client/k8s/api-service.yaml
kubectl apply -f packages/tg-client/k8s/api-hpa.yaml

# Опционально: Ingress
kubectl apply -f packages/tg-client/k8s/api-ingress.yaml
```

### Проверка

```bash
# Статус
kubectl get pods -l app=telegram-api
kubectl get svc telegram-api
kubectl get hpa telegram-api

# Логи
kubectl logs -f deployment/telegram-api

# Health
kubectl port-forward deployment/telegram-api 8001:8001
curl http://localhost:8001/health
```

## Scaling

### Manual Scaling

```bash
# Увеличить до 5 реплик
kubectl scale deployment telegram-api --replicas=5

# Проверить
kubectl get pods -l app=telegram-api
```

### Auto-scaling (HPA)

HPA автоматически масштабирует от 2 до 10 реплик:

```yaml
minReplicas: 2
maxReplicas: 10
metrics:
  - CPU: 70%
  - Memory: 80%
```

Проверка:

```bash
# Статус HPA
kubectl get hpa telegram-api

# Детали
kubectl describe hpa telegram-api

# Метрики
kubectl top pods -l app=telegram-api
```

## Ingress

### Настройка

Обновите `api-ingress.yaml`:

```yaml
spec:
  tls:
  - hosts:
    - telegram-api.yourdomain.com  # Ваш домен
    secretName: telegram-api-tls
  rules:
  - host: telegram-api.yourdomain.com  # Ваш домен
```

### Deploy

```bash
kubectl apply -f packages/tg-client/k8s/api-ingress.yaml
```

### Проверка

```bash
# Статус
kubectl get ingress telegram-api

# Тест
curl https://telegram-api.yourdomain.com/health
```

### Rate Limiting

Ingress настроен с rate limit:

```yaml
annotations:
  nginx.ingress.kubernetes.io/rate-limit: "100"
```

100 запросов в минуту на IP.

## Мониторинг

### Metrics

API экспортирует метрики через `/health`:

```bash
curl http://localhost:8001/health
# {"status":"ok","service":"tg-client"}
```

### Prometheus

Добавьте ServiceMonitor:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: telegram-api
spec:
  selector:
    matchLabels:
      app: telegram-api
  endpoints:
  - port: http
    path: /health
    interval: 30s
```

### Grafana Dashboard

Пример запросов:

```promql
# Количество реплик
count(kube_pod_info{pod=~"telegram-api.*"})

# CPU usage
rate(container_cpu_usage_seconds_total{pod=~"telegram-api.*"}[5m])

# Memory usage
container_memory_usage_bytes{pod=~"telegram-api.*"}

# Request rate
rate(http_requests_total{service="telegram-api"}[5m])
```

## Security

### Network Policy

Ограничить доступ к API:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: telegram-api
spec:
  podSelector:
    matchLabels:
      app: telegram-api
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 8001
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

### TLS

Используйте cert-manager для автоматических сертификатов:

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

## Troubleshooting

### Pod не запускается

```bash
# Проверить статус
kubectl get pods -l app=telegram-api

# Events
kubectl describe pod -l app=telegram-api

# Логи
kubectl logs -l app=telegram-api
```

### 502 Bad Gateway

```bash
# Проверить readiness
kubectl get pods -l app=telegram-api
# STATUS должен быть Running, READY должен быть 1/1

# Проверить health endpoint
kubectl port-forward deployment/telegram-api 8001:8001
curl http://localhost:8001/health
```

### HPA не масштабирует

```bash
# Проверить metrics-server
kubectl top nodes
kubectl top pods

# Если не работает, установить metrics-server:
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

### High latency

```bash
# Проверить количество реплик
kubectl get hpa telegram-api

# Увеличить вручную
kubectl scale deployment telegram-api --replicas=5

# Проверить ресурсы
kubectl top pods -l app=telegram-api
```

## Load Testing

### Apache Bench

```bash
# 1000 запросов, 10 одновременно
ab -n 1000 -c 10 http://telegram-api.yourdomain.com/health
```

### k6

```javascript
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '3m', target: 50 },
    { duration: '1m', target: 0 },
  ],
};

export default function () {
  let res = http.get('http://telegram-api.yourdomain.com/health');
  check(res, { 'status is 200': (r) => r.status === 200 });
}
```

## CI/CD

### GitHub Actions

```yaml
name: Deploy Telegram API

on:
  push:
    branches: [main]
    paths:
      - 'packages/tg-client/src/api/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build image
        run: |
          docker build -f packages/tg-client/Dockerfile.api \
            -t ${{ secrets.REGISTRY }}/telegram-api:${{ github.sha }} .
      
      - name: Push image
        run: docker push ${{ secrets.REGISTRY }}/telegram-api:${{ github.sha }}
      
      - name: Deploy to k8s
        run: |
          kubectl set image deployment/telegram-api \
            telegram-api=${{ secrets.REGISTRY }}/telegram-api:${{ github.sha }}
          kubectl rollout status deployment/telegram-api
```

## Best Practices

1. **Используйте HPA** для автоматического масштабирования
2. **Настройте Ingress** с TLS и rate limiting
3. **Мониторьте метрики** через Prometheus/Grafana
4. **Используйте NetworkPolicy** для безопасности
5. **Настройте PodDisruptionBudget** для HA
6. **Логируйте все запросы** для отладки
7. **Используйте health checks** для надежности

## Заключение

API готов к production с:
- ✅ Auto-scaling (2-10 реплик)
- ✅ Load balancing
- ✅ Zero downtime updates
- ✅ Health checks
- ✅ TLS/HTTPS
- ✅ Rate limiting

Все проверки типов пройдены ✅
