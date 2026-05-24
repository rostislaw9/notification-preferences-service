# Notification Preferences Service

Сервис управления предпочтениями уведомлений — единый источник правды о том, какие типы уведомлений и по каким каналам разрешено отправлять конкретному пользователю.

Стек: NestJS · TypeScript · PostgreSQL · Prisma ORM · Luxon · Docker Compose.

---

## Архитектура

Проект построен по **слоистой модульной архитектуре** внутри `src/modules/preferences/`:

```text
src/
├── config/                        # Конфигурация из переменных окружения
├── health/                        # Эндпоинт проверки здоровья сервиса
├── modules/
│   └── preferences/
│       ├── application/           # Сервисы и DTOs (бизнес-логика без инфраструктуры)
│       │   ├── dto/
│       │   └── services/
│       │       ├── preferences.service.ts
│       │       └── notification-policy-evaluator.service.ts
│       ├── domain/                # Сущности, enum-ы, интерфейсы репозиториев (ports)
│       │   ├── entities/
│       │   ├── enums/
│       │   └── ports/
│       ├── infrastructure/        # Реализации репозиториев на Prisma
│       │   ├── prisma/
│       │   └── repositories/
│       └── presentation/          # HTTP-контроллеры, Swagger
│           └── preferences.controller.ts
├── app.module.ts
└── main.ts
prisma/
├── schema.prisma
├── migrations/
└── seed.ts
test/                              # Интеграционные (e2e) тесты
```

### Ответственность слоёв

| Слой | Что делает |
| --- | --- |
| **Domain** | Сущности, enum-ы, интерфейсы репозиториев. Нет зависимостей от фреймворков и ORM. |
| **Application** | Сервисы с бизнес-логикой, DTOs с валидацией. Зависит только от доменных интерфейсов. |
| **Infrastructure** | Реализации репозиториев через Prisma. |
| **Presentation** | NestJS-контроллеры, Swagger-аннотации. |

### Порядок приоритетов при вычислении решения

`NotificationPolicyEvaluator` применяет правила строго по приоритету:

1. **Глобальные политики** — жёсткий запрет/разрешение по `(notificationType, channel, region?)`. Наивысший приоритет, пользователь не может переопределить.
2. **Quiet hours** — пользовательские quiet hours перекрывают глобальные. Учитывается таймзона (Luxon). Применяются только к `marketing`-уведомлениям; `transactional` и `system` всегда проходят.
3. **Пользовательские настройки** — явный opt-in/opt-out по `(notificationType, channel)`.
4. **Дефолтные настройки** — системные умолчания по `(notificationType, channel)`.
5. **Фоллбэк** — разрешить, если ни одно правило не сработало.

---

## Требования

- Node.js 20+
- Yarn
- Docker + Docker Compose

---

## Быстрый старт

### 1. Установить зависимости

```bash
git clone <repo-url>
cd notification-preferences-service
yarn install
```

### 2. Настроить окружение

```bash
cp .env.example .env
```

### 3. Запустить PostgreSQL

```bash
docker compose up postgres -d
```

### 4. Применить миграции и заполнить БД начальными данными

```bash
yarn prisma:migrate:dev
yarn prisma:seed
```

### 5. Запустить сервис

```bash
yarn start:dev
```

Сервис доступен на [http://localhost:3000](http://localhost:3000).  
Swagger UI: [http://localhost:3000/docs](http://localhost:3000/docs)  
Health check: [http://localhost:3000/health](http://localhost:3000/health)

---

## Запуск через Docker Compose (полный стек)

```bash
docker compose up --build
```

Поднимает PostgreSQL и приложение, автоматически применяет миграции при старте.

---

## API

### `GET /users/:id/preferences`

Возвращает настройки уведомлений и quiet hours пользователя.

```bash
curl http://localhost:3000/users/user-1/preferences
```

Формат ответа:

```json
{
  "preferences": [
    { "id": "...", "userId": "user-1", "notificationType": "marketing", "channel": "email", "enabled": false }
  ],
  "quietHours": {
    "id": "...", "userId": "user-1", "timezone": "Europe/Berlin",
    "startHour": 22, "startMin": 0, "endHour": 8, "endMin": 0
  }
}
```

### `POST /users/:id/preferences`

Обновляет настройки уведомлений и/или quiet hours. Оба поля необязательны — можно обновлять их по отдельности или вместе. Операция идемпотентна.

```bash
# Обновить настройки и задать quiet hours
curl -X POST http://localhost:3000/users/user-1/preferences \
  -H 'Content-Type: application/json' \
  -d '{
    "preferences": [
      { "notificationType": "marketing", "channel": "email", "enabled": false },
      { "notificationType": "transactional", "channel": "sms", "enabled": true }
    ],
    "quietHours": {
      "timezone": "America/New_York",
      "startHour": 22,
      "startMin": 0,
      "endHour": 8,
      "endMin": 0
    }
  }'

# Удалить quiet hours
curl -X POST http://localhost:3000/users/user-1/preferences \
  -H 'Content-Type: application/json' \
  -d '{ "quietHours": null }'
```

### `POST /evaluate`

Проверяет, можно ли отправить уведомление.

```bash
curl -X POST http://localhost:3000/evaluate \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "user-1",
    "notificationType": "marketing",
    "channel": "email",
    "region": "EU",
    "datetime": "2026-05-21T21:30:00Z"
  }'
```

Формат ответа:

```json
{
  "decision": "deny",
  "reason": "GDPR marketing opt-in required in EU"
}
```

#### Допустимые значения полей

| Поле | Значения |
| --- | --- |
| `notificationType` | `marketing`, `transactional`, `system` |
| `channel` | `email`, `sms`, `push`, `messenger` |
| `region` | Любая строка, например `EU`, `US` (необязательно) |
| `datetime` | Строка в формате ISO 8601 |

---

## Тесты

### Юнит-тесты

```bash
yarn test
```

Покрывают:

- Дефолтные настройки (allow/deny)
- Пользовательские переопределения
- Приоритет глобальных политик
- Quiet hours (ночное окно, учёт таймзоны)
- Освобождение transactional от quiet hours
- Идемпотентность

### Интеграционные тесты (e2e)

Требуется запущенный PostgreSQL (`docker compose up postgres -d`).

```bash
yarn test:e2e
```

Покрывают все сценарии задания: сценарий 1 (дефолты), 2 (изменение настроек), 3 (quiet hours через API), 4 (глобальные политики), 5 (идемпотентность).

### Отчёт о покрытии

```bash
yarn test:cov
```

---

## База данных

### Миграции

```bash
# Создать и применить новую миграцию (dev)
yarn prisma:migrate:dev --name <название>

# Применить pending-миграции (production / CI)
yarn prisma:migrate:deploy

# Сбросить БД (только dev)
yarn db:reset
```

### Seed

Заполняет БД начальными данными:

- Дефолтные настройки для всех комбинаций `(notificationType, channel)`
- Пример глобальной политики: запрет `marketing/email` в регионе `EU` (GDPR)
- Глобальное окно quiet hours (`22:00–08:00 America/New_York`)
- Пример пользовательской настройки для `user-1`

```bash
yarn prisma:seed
```

### Prisma Studio

```bash
yarn prisma:studio
```

---

## Переменные окружения

| Переменная | По умолчанию | Описание |
| --- | --- | --- |
| `NODE_ENV` | `development` | Окружение |
| `PORT` | `3000` | HTTP-порт |
| `LOG_LEVEL` | `debug` | Уровень логирования Pino |
| `DATABASE_URL` | — | Строка подключения к PostgreSQL |
| `POSTGRES_USER` | `notifications` | Пользователь БД (Docker Compose) |
| `POSTGRES_PASSWORD` | `notifications_secret` | Пароль БД (Docker Compose) |
| `POSTGRES_DB` | `notifications_db` | Имя БД (Docker Compose) |

---

## Архитектурные решения

- **Repository pattern с Symbol-токенами для инъекции** — application-слой полностью отвязан от Prisma. В тестах репозитории подменяются mock-объектами без поднятия инфраструктуры.
- **Upsert-семантика** (`ON CONFLICT DO UPDATE`) — повторный вызов `POST /users/:id/preferences` с теми же данными безопасен и идемпотентен.
- **Quiet hours не блокируют `transactional` и `system`** — только `marketing`. Соответствует сценарию 3 задания: транзакционные уведомления должны доходить даже в quiet hours.
- **Luxon** — обработка таймзон с учётом ночных окон (например, 22:00–08:00), когда конец раньше начала по UTC.
- **Структурированное логирование** через `nestjs-pino` / `pino` с `pino-pretty` в режиме разработки. На уровне `INFO` логируются: изменения настроек, каждое решение `allow`/`deny`.
- **Graceful shutdown** — перехват `SIGTERM`/`SIGINT`, вызов `app.close()` перед завершением процесса.
- **Строгий TypeScript** (`strict: true`) по всему коду.

---

## Что добавить до продакшена

1. **Аутентификация и авторизация** — JWT-middleware, чтобы пользователь мог менять только свои настройки; отдельный admin-scope для управления глобальными политиками.

2. **Пагинация** `GET /users/:id/preferences` — сейчас возвращаются все записи одним ответом.

3. **Кэширование** — короткоживущий read-through кэш (Redis или in-process) для `POST /evaluate`, чтобы не делать повторные запросы к БД по одному и тому же `(userId, type, channel)`. Evaluator уже stateless и pure — кэширование безопасно.

4. **Метрики** — счётчики Prometheus `evaluation.allow` / `evaluation.deny` с метками `notificationType`, `channel`, `reason`; гистограмма задержки оценки. Единственный метод `evaluate()` — идеальная точка инструментирования.

5. **Журнал аудита** — append-only таблица с записью каждого изменения настроек: `actorId`, `timestamp`, значения до и после. Необходимо для соответствия GDPR и отладки.

6. **Admin API** для управления глобальными политиками и дефолтными настройками (сейчас только через seed/миграцию).

7. **Soft-delete настроек** вместо физического upsert — сохранение истории изменений.

8. **Rate limiting** на `POST /evaluate` для защиты от злоупотреблений со стороны upstream-сервисов.

9. **Outbox pattern** — публикация доменного события `PreferencesChanged` в брокер сообщений (Kafka/RabbitMQ), чтобы downstream-сервисы инвалидировали свои кэши без поллинга.

10. **Сквозная трассировка** — пробрасывание `X-Request-Id` / OpenTelemetry trace context через все лог-записи и запросы к БД.
