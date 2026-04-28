# 🚀 Установка ChessMasterPro

## Требования
- Node.js 18+ (https://nodejs.org)
- npm (идёт с Node.js)

## Шаги

```bash
# 1. Распакуй zip в папку
unzip chessapp-fixed-full.zip -d chessapp
cd chessapp

# 2. Установи зависимости
npm install

# 3. Запусти в режиме разработки
npm run dev
```

Открой браузер: http://localhost:3000

## Для продакшена
```bash
npm run build
npm start
```

## Примечания
- `.env.local` уже содержит все ключи Firebase, Stripe, Gemini — трогать не нужно
- `node_modules` не включены в zip — `npm install` скачает всё автоматически
