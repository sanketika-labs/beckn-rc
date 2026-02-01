FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache git

COPY package*.json ./

RUN npm install

WORKDIR /app
COPY . .

RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]
