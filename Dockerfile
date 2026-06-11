FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json ./
COPY frontend/package.json frontend/package.json
COPY backend/package.json backend/package.json

RUN npm install

COPY . .

RUN npm run db:generate --workspace backend
RUN npm run build --workspace backend
RUN npm run build --workspace frontend

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/frontend ./frontend
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 4000

CMD ["npm", "run", "start", "--workspace", "backend"]

