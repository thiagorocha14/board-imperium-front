FROM node:24-alpine AS dev
WORKDIR /app

ENV NG_CLI_ANALYTICS=false

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 4200
CMD ["npm", "run", "start", "--", "--host", "0.0.0.0"]
