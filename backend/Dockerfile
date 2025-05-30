# Etapa 1: build da aplicação
FROM node:18-alpine AS builder

WORKDIR /app

# Copia apenas arquivos necessários
COPY package*.json ./
RUN npm install --omit=dev

# Copia o restante do código
COPY . .

# Etapa 2: imagem enxuta para execução
FROM node:18-alpine

WORKDIR /app

# Copia os arquivos da etapa de build
COPY --from=builder /app .

# 🛠 Adiciona suporte a bcrypt nativo (Alpine precisa do 'python3' e 'make' para build nativo)
RUN apk add --no-cache python3 make g++ \
  && npm install -g npm@10 \
  && npm rebuild bcrypt --build-from-source \
  && addgroup app && adduser -S -G app app \
  && chown -R app:app /app \
  && npm cache clean --force

USER app

EXPOSE 3000

CMD ["node", "app.js"]
