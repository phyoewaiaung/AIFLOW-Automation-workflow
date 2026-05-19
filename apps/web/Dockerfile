FROM node:20-alpine

WORKDIR /app

RUN corepack enable

COPY package.json package-lock.json* ./
COPY packages ./packages
COPY apps ./apps

RUN npm install --ignore-scripts

WORKDIR /app/apps/web
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]