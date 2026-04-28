# ♟ ChessLingo

> **Играй в шахматы — учи английский.** Интерактивное веб-приложение, объединяющее полноценную шахматную игру с изучением английского языка через геймификацию.

---

## 📋 Содержание

- [О проекте](#о-проекте)
- [Возможности](#возможности)
- [Технологический стек](#технологический-стек)
- [Архитектура проекта](#архитектура-проекта)
- [Установка и запуск](#установка-и-запуск)
- [Конфигурация окружения](#конфигурация-окружения)
- [Firebase — настройка](#firebase--настройка)
- [Stripe — настройка](#stripe--настройка)
- [Gemini AI — настройка](#gemini-ai--настройка)
- [Мультиплеер (WebSocket-сервер)](#мультиплеер-websocket-сервер)
- [Игровые режимы](#игровые-режимы)
- [Шахматный движок](#шахматный-движок)
- [Анализ партий](#анализ-партий)
- [Система прогресса и геймификация](#система-прогресса-и-геймификация)
- [Магазин](#магазин)
- [Деплой](#деплой)
- [Структура файлов](#структура-файлов)
- [API-маршруты](#api-маршруты)

---

## О проекте

**ChessLingo** — это SPA (Single Page Application) на базе Next.js 14, в котором шахматы используются как мотивирующий контекст для изучения английского языка. После каждой партии игрок проходит обучающие мини-игры (задания на перевод, грамматику, идиомы), зарабатывает монеты и очки опыта, повышает ранг и соревнуется в таблице лидеров.

Проект ориентирован на русскоязычных пользователей, изучающих английский с нуля (уровни A1–C2).

---

## Возможности

### Шахматная часть
- **Игра против ИИ** с пятью уровнями сложности: Bullet, Easy, Medium, Hard, Master
- **Игра с другом** через приглашение по коду комнаты (мультиплеер в реальном времени)
- **Ranked-матчи** с системой рейтинга
- **English Mode** — задания на английский язык между ходами
- Поддержка всех правил: рокировка, взятие на проходе, превращение пешки
- Таймер с контролем времени: 1, 3, 5, 10, 15, 30 минут или без ограничений
- Режим просмотра истории ходов (навигация по позициям)

### Анализ партий
- Классификация каждого хода: Brilliant / Great / Best / Good / Inaccuracy / Mistake / Blunder
- Подсчёт точности (accuracy %) отдельно для белых и чёрных
- Определение стиля игры: Aggressive Attacker, Positional Player, Tactical Fighter, Solid Defender, Creative Genius, Endgame Specialist
- Тепловая карта мышления по клеткам (Think Heatmap)
- AI-коучинг через Google Gemini 1.5 Flash: 3 конкретных совета + название дебюта

### Изучение английского
- Более 100 упражнений шести типов: перевод, определение слова, заполнение пропусков, грамматика, выбор ответа, идиомы
- Уровни A1–C2 по шкале CEFR
- Шахматная тематика вопросов (Chess vocabulary + General English)

### Профиль и прогресс
- Ранговая система по шахматным фигурам: Pawn → Knight → Bishop → Rook → Queen → King
- Стрик (серия ежедневных игр), XP, монеты, статистика партий
- История сыгранных игр с сохранением в Firestore

### Магазин и кастомизация
- Покупка наборов фигур, досок, эффектов, аватаров, эмотов за монеты или реальные деньги (Stripe)
- Редкость предметов: Common / Rare / Epic / Legendary
- Pro-подписка с расширенным доступом к контенту

### Таблица лидеров
- Глобальный рейтинг по очкам с фильтрацией
- Отображение города, страны, ранга и стрика каждого игрока

---

## Технологический стек

| Слой | Технология |
|---|---|
| Фреймворк | Next.js 14 (App Router) |
| Язык | TypeScript 5 |
| UI | React 18, Tailwind CSS 3, Framer Motion |
| Иконки | Lucide React |
| Стейт-менеджмент | Zustand 4 (с persist) |
| Шахматный движок | Собственная реализация на TypeScript + chess.js |
| AI (ходы) | Собственный движок с итеративным углублением, альфа-бета отсечением, MVV-LVA |
| AI (коучинг) | Google Gemini 1.5 Flash (`@google/generative-ai`) |
| База данных | Firebase Firestore |
| Аутентификация | Firebase Auth |
| Мультиплеер | Socket.IO 4 (отдельный WS-сервер) |
| Платежи | Stripe |
| Деплой | Firebase Hosting / Vercel |

---

## Архитектура проекта

```
chesslingo/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── page.tsx                # Корневая страница, роутинг между экранами
│   │   ├── layout.tsx              # HTML-обёртка, глобальные шрифты
│   │   ├── globals.css             # CSS-переменные и глобальные стили
│   │   └── api/
│   │       ├── ai-move/route.ts    # POST /api/ai-move  — ход ИИ
│   │       ├── analyze/route.ts    # POST /api/analyze  — анализ партии
│   │       ├── leaderboard/route.ts
│   │       └── stripe-checkout/route.ts
│   ├── components/
│   │   ├── board/                  # Шахматная доска и игровой экран
│   │   │   ├── GamePage.tsx        # Главный игровой контейнер
│   │   │   ├── ChessBoard.tsx      # Рендер доски, drag-n-drop фигур
│   │   │   ├── MoveList.tsx        # Список ходов (SAN)
│   │   │   ├── CoachPanel.tsx      # Панель тренера
│   │   │   ├── AnalysisPanel.tsx   # Постигровой анализ
│   │   │   └── PromotionModal.tsx  # Диалог выбора фигуры при превращении
│   │   ├── ui/                     # Экраны-страницы
│   │   │   ├── AuthModal.tsx       # Вход / регистрация
│   │   │   ├── ProfilePage.tsx     # Профиль пользователя
│   │   │   ├── LeaderboardPage.tsx # Таблица лидеров
│   │   │   ├── ShopPage.tsx        # Магазин
│   │   │   ├── EnglishChallenge.tsx# Мини-игра английского
│   │   │   ├── GameOverModal.tsx   # Итоги партии + анализ
│   │   │   └── ProModal.tsx        # Продажа подписки
│   │   └── layout/
│   │       └── Navbar.tsx          # Навигационная панель
│   ├── lib/
│   │   ├── chess-engine.ts         # Полный движок шахмат (1200+ строк)
│   │   ├── english-challenges.ts   # Банк заданий A1–C2
│   │   ├── shop-data.ts            # Каталог товаров магазина
│   │   ├── auth-actions.ts         # Firebase Auth + Firestore CRUD
│   │   ├── firebase.ts             # Firebase Client SDK init
│   │   └── firebase-admin.ts       # Firebase Admin SDK init (серверный)
│   ├── store/
│   │   └── useStore.ts             # Глобальное состояние (Zustand)
│   ├── hooks/
│   │   └── useMultiplayer.ts       # Socket.IO хук для мультиплеера
│   ├── server/
│   │   └── ws-server.ts            # Standalone WebSocket-сервер
│   └── types/
│       └── index.ts                # Все TypeScript-типы проекта
├── .env.local                      # Ключи (не коммитить в git!)
├── firestore.rules                 # Правила безопасности Firestore
├── firestore.indexes.json          # Индексы Firestore
├── firebase.json                   # Конфиг Firebase Hosting
├── next.config.js
├── tailwind.config.ts
└── tsconfig.json
```

---

## Установка и запуск

### Требования
- **Node.js 18+** — [nodejs.org](https://nodejs.org)
- **npm** (идёт с Node.js)

### Локальный запуск

```bash
# 1. Клонируйте репозиторий или распакуйте архив
unzip chesslingo.zip -d chesslingo
cd chesslingo

# 2. Установите зависимости
npm install

# 3. Создайте файл .env.local (см. раздел ниже)
cp .env.local.example .env.local
# Заполните своими ключами

# 4. Запустите Next.js в режиме разработки
npm run dev
```

Откройте браузер: [http://localhost:3000](http://localhost:3000)

### Запуск с мультиплеером

Мультиплеер работает через отдельный WebSocket-сервер (Socket.IO). Его нужно запустить параллельно с Next.js:

```bash
# Терминал 1 — Next.js
npm run dev

# Терминал 2 — WebSocket-сервер
npx ts-node src/server/ws-server.ts
# или, если добавлен в package.json scripts:
npm run server
```

WebSocket-сервер запускается на порту **3001** по умолчанию. Порт можно изменить через переменную окружения `WS_PORT`.

### Продакшн-сборка

```bash
npm run build
npm start
```

---

## Конфигурация окружения

Создайте файл `.env.local` в корне проекта. Все переменные обязательны для полноценной работы:

```env
# ── Firebase (Client SDK) ──────────────────────────────────────────────────
# Получить: Firebase Console → Project Settings → Your apps
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# ── Firebase Admin SDK (серверный) ────────────────────────────────────────
# Получить: Firebase Console → Project Settings → Service accounts → Generate new private key
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_ADMIN_CLIENT_EMAIL=

# ── Stripe ────────────────────────────────────────────────────────────────
# Получить: dashboard.stripe.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_MONTHLY=price_...     # ID тарифа месячной подписки
STRIPE_PRICE_ANNUAL=price_...      # ID тарифа годовой подписки

# ── Google Gemini ─────────────────────────────────────────────────────────
# Получить: aistudio.google.com
GEMINI_API_KEY=

# ── NextAuth ──────────────────────────────────────────────────────────────
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=                   # Случайная строка, например: openssl rand -base64 32
```

> ⚠️ **Никогда не коммитьте `.env.local` в репозиторий.** Файл уже включён в `.gitignore`.

---

## Firebase — настройка

1. Создайте проект на [console.firebase.google.com](https://console.firebase.google.com)
2. Подключите **Authentication** → включите провайдер Email/Password (и Google, если нужно)
3. Создайте базу данных **Firestore** в режиме Production
4. Задеплойте правила безопасности:

```bash
# Установите Firebase CLI
npm install -g firebase-tools
firebase login

# Инициализируйте и задеплойте правила
firebase init firestore
firebase deploy --only firestore:rules
```

Правила находятся в `firestore.rules`. Структура доступа:
- `users/{uid}` — читать могут все авторизованные, писать — только владелец
- `games/{gameId}` — только владелец игры
- `leaderboard/{entry}` — публичное чтение, запись только через серверный API

5. Задеплойте индексы Firestore:

```bash
firebase deploy --only firestore:indexes
```

---

## Stripe — настройка

1. Зарегистрируйтесь на [stripe.com](https://stripe.com)
2. Создайте два тарифа (Products → Add product):
   - **Pro Monthly** — укажите ID в `STRIPE_PRICE_MONTHLY`
   - **Pro Annual** — укажите ID в `STRIPE_PRICE_ANNUAL`
3. Для локальной разработки используйте **тестовые ключи** (`pk_test_...`, `sk_test_...`)
4. Для вебхуков настройте Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/stripe-checkout
```

---

## Gemini AI — настройка

1. Перейдите на [aistudio.google.com](https://aistudio.google.com)
2. Создайте API-ключ
3. Укажите его в `GEMINI_API_KEY`

Gemini используется только для постигрового анализа (`/api/analyze`). Если ключ не указан, приложение вернёт стандартные советы без AI.

---

## Мультиплеер (WebSocket-сервер)

Сервер `src/server/ws-server.ts` реализует комнаты Socket.IO для игры вдвоём:

| Событие | Направление | Описание |
|---|---|---|
| `create_room` | client → server | Создать новую комнату, получить код |
| `join_room` | client → server | Войти по коду комнаты |
| `room_created` | server → client | Комната создана (возвращает roomId и цвет) |
| `game_start` | server → all | Оба игрока подключились |
| `move` | client → server | Отправить ход |
| `opponent_move` | server → client | Ход противника |
| `resign` | client → server | Сдаться |
| `offer_draw` | client → server | Предложить ничью |
| `accept_draw` | client → server | Принять ничью |
| `game_over` | server → all | Игра завершена |
| `chat` | client → server | Чат-сообщение |
| `chat_message` | server → all | Трансляция сообщения |

Для деплоя WebSocket-сервера в продакшн рекомендуется использовать отдельный процесс (например, Railway, Fly.io или PM2 на VPS).

---

## Игровые режимы

| Режим | Описание |
|---|---|
| `ai` | Игра против компьютера с выбором сложности |
| `friend` | Онлайн-игра с другом через код комнаты |
| `ranked` | Рейтинговая игра (влияет на ELO) |
| `puzzle` | Шахматные задачи (в разработке) |
| `english` | Специальный режим с заданиями по английскому после каждого хода |

### Уровни сложности ИИ

| Уровень | Глубина поиска | Особенность |
|---|---|---|
| Bullet | 2 | Быстрый, средняя сила |
| Easy | 2 | 15% случайных ходов для возможности победить |
| Medium | 3 | Сильный поиск |
| Hard | 4 | Мастер-уровень |
| Master | 4 | Максимальная сила |

---

## Шахматный движок

Весь движок написан на TypeScript (`src/lib/chess-engine.ts`, ~1200 строк) без внешних зависимостей (кроме chess.js для PGN).

Реализовано:
- Генерация всех легальных ходов для каждой фигуры
- Проверка шаха, мата и пата
- Рокировка (короткая и длинная)
- Взятие на проходе (en passant)
- Превращение пешки
- **Алгоритм поиска лучшего хода**: итеративное углубление + альфа-бета отсечение + эвристика MVV-LVA (Most Valuable Victim — Least Valuable Attacker)
- Оценочная функция: материальный баланс + бонусы за позицию (piece-square tables)
- Тихий поиск (quiescence search) для стабилизации оценки

---

## Анализ партий

После завершения партии вызывается `/api/analyze`:

1. **Классификация ходов** по разнице оценки (evalAfter − evalBefore):
   - `brilliant` ≥ +150 центипешек
   - `great` ≥ +50
   - `best` ≥ 0
   - `good` ≥ −30
   - `inaccuracy` ≥ −100
   - `mistake` ≥ −200
   - `blunder` < −200

2. **Точность** (Accuracy %): рассчитывается как `100 − средние потери`, нормированные к диапазону 40–99%

3. **Стиль игры**: определяется соотношением взятий, ходов в центр, ходов пешками и лёгкими фигурами

4. **Тепловая карта**: интенсивность по клеткам на основе частоты ходов и времени размышления

5. **AI-коучинг**: запрос к Gemini 1.5 Flash с PGN и статистикой → 3 персональных совета + название дебюта

---

## Система прогресса и геймификация

### Ранговая система

| Ранг | Минимальный рейтинг |
|---|---|
| Pawn | 0 |
| Knight | 400 |
| Bishop | 800 |
| Rook | 1200 |
| Queen | 1800 |
| King | 2500 |

### Внутриигровая валюта — Монеты

- Начисляются за победы, ежедневный стрик, задания по английскому
- Тратятся в магазине на косметические предметы

### XP и стрик

- XP накапливается за каждую сыгранную партию и пройденное задание
- Стрик — число дней подряд с активностью в приложении

---

## Магазин

Магазин (`src/lib/shop-data.ts`) содержит предметы пяти категорий:

| Категория | Примеры |
|---|---|
| Pieces (наборы фигур) | Classic, Neon Glow, Oak Master, Crystal |
| Boards (доски) | Classic Wood, Marble, Neon Grid, Aurora |
| Effects (эффекты) | Sparkle Trail, Fire Burst, Lightning |
| Avatars (аватары) | Grandmaster Fox, Chess Wizard |
| Emotes (эмоции) | GG, Think, Gg |

Предметы с `stripePriceId` покупаются через Stripe (реальные деньги), остальные — за монеты.

---

## Деплой

### Firebase Hosting (рекомендуется для статики)

```bash
npm run build
firebase deploy --only hosting
```

### Vercel (рекомендуется для Next.js)

```bash
npm install -g vercel
vercel --prod
```

Не забудьте добавить все переменные из `.env.local` в настройки окружения Vercel.

### WebSocket-сервер (продакшн)

WebSocket-сервер необходимо деплоить отдельно. Рекомендуемые варианты:
- **Railway** — автодеплой из GitHub, поддержка WebSocket
- **Fly.io** — бесплатный тир, близко к Firebase-серверам
- **VPS + PM2** — для полного контроля

```bash
# Запуск через PM2
pm2 start src/server/ws-server.ts --name chesslingo-ws --interpreter ts-node
```

---

## Структура файлов

```
src/
├── app/
│   ├── page.tsx              # Корневой роутинг (game / leaderboard / shop / profile)
│   ├── layout.tsx            # HTML-шаблон
│   ├── globals.css           # Дизайн-токены (CSS-переменные), шрифты, анимации
│   └── api/
│       ├── ai-move/          # Ход ИИ
│       ├── analyze/          # Постигровой анализ с Gemini
│       ├── leaderboard/      # Получение таблицы лидеров из Firestore
│       └── stripe-checkout/  # Создание Stripe Checkout Session
├── components/
│   ├── board/
│   │   ├── GamePage.tsx      # Оркестратор игры: таймер, AI-ходы, окончание
│   │   ├── ChessBoard.tsx    # SVG/HTML доска с drag-n-drop
│   │   ├── MoveList.tsx      # Нотация ходов с навигацией
│   │   ├── CoachPanel.tsx    # Подсказки тренера во время игры
│   │   ├── AnalysisPanel.tsx # Постигровой разбор
│   │   └── PromotionModal.tsx
│   └── ui/
│       ├── AuthModal.tsx     # Google OAuth + Email/Password
│       ├── ProfilePage.tsx   # Статистика, история игр, настройки
│       ├── LeaderboardPage.tsx
│       ├── ShopPage.tsx
│       ├── EnglishChallenge.tsx  # Мини-игра с 4 вариантами ответа
│       ├── GameOverModal.tsx     # Итоги + анализ + монеты
│       └── ProModal.tsx          # Оформление подписки
├── lib/
│   ├── chess-engine.ts       # Движок шахмат (~1200 строк)
│   ├── english-challenges.ts # Банк заданий (100+ упражнений A1–C2)
│   ├── shop-data.ts          # Каталог магазина
│   ├── auth-actions.ts       # Firebase Auth хелперы
│   ├── firebase.ts           # Client SDK
│   └── firebase-admin.ts     # Admin SDK (серверный)
├── store/
│   └── useStore.ts           # Zustand store: auth + game + ui
├── hooks/
│   └── useMultiplayer.ts     # Socket.IO хук
├── server/
│   └── ws-server.ts          # Standalone WebSocket-сервер
└── types/
    └── index.ts              # Все типы TypeScript
```

---

## API-маршруты

### `POST /api/ai-move`

Возвращает лучший ход ИИ для текущей позиции.

**Запрос:**
```json
{
  "state": { /* BoardState */ },
  "difficulty": "medium"
}
```

**Ответ:**
```json
{
  "move": { "from": 52, "to": 36 },
  "evalScore": 15
}
```

---

### `POST /api/analyze`

Анализирует партию и возвращает статистику + советы Gemini.

**Запрос:**
```json
{
  "moves": [ /* MoveRecord[] */ ],
  "pgn": "1. e4 e5 2. Nf3 ..."
}
```

**Ответ:**
```json
{
  "analysis": {
    "accuracy": { "white": 82, "black": 61 },
    "playerStyle": "Aggressive Attacker",
    "stats": { "brilliant": 1, "blunder": 2, "..." : 0 },
    "thinkHeatmap": [ /* 64 значения 0–1 */ ],
    "coachMessages": ["Совет 1", "Совет 2", "Совет 3"],
    "openingName": "Ruy Lopez"
  }
}
```

---

### `GET /api/leaderboard`

Возвращает топ игроков из Firestore.

### `POST /api/stripe-checkout`

Создаёт Stripe Checkout Session для оформления Pro-подписки.

---

## Лицензия

Проект является приватным. Все права защищены.
