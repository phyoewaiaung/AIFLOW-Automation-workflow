FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
COPY apps ./apps
COPY packages ./packages

RUN npm install

RUN npx prisma generate -w @autoflow/api

WORKDIR /app/apps/api
RUN npm run build

EXPOSE 3001

CMD ["npm", "run", "start"]