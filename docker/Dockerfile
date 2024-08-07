FROM node:20-alpine

ARG ENVIRONMENT=production

ENV NODE_ENV $ENVIRONMENT
ENV IS_CONTAINER_ENV true

USER node
# RUN mkdir /home/node/app
WORKDIR /home/node/app

COPY package*.json .
RUN npm ci

COPY . .
RUN npm run build
RUN npm prune --omit dev

EXPOSE 61080/tcp

CMD [ "node", "--enable-source-maps", "dist/index.js" ]
