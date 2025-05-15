# Usar imagem oficial Node.js
FROM node:18-slim

# Definir diretório de trabalho dentro do container
WORKDIR /app

# Copiar arquivos de dependência
COPY package*.json ./

# Instalar as dependências
RUN npm install

# Copiar o restante do código
COPY . .

# Expôr a porta usada pelo backend
EXPOSE 3000

# Comando para iniciar o app
CMD ["npm", "start"]
