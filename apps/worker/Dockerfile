FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
COPY apps ./apps
COPY packages ./packages

RUN npm install

RUN npx prisma generate -w @autoflow/api

WORKDIR /app/apps/worker
RUN npm run build

CMD ["npm", "run", "start"]