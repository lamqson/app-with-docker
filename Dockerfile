# build environment
FROM node:14.8.0
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install -g @angular/cli
RUN npm install
COPY . ./
RUN npm run build:dev
EXPOSE 8080
CMD [ "node", "server.js" ]