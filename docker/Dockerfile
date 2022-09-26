FROM node:16-alpine

ARG ENVIRONMENT=production

ENV NODE_ENV ENVIRONMENT
ENV IS_CONTAINER_ENV true

WORKDIR /usr/src/app

COPY package*.json ./

# RUN apk update
# RUN apk add curl python3 --no-cache --virtual build-dependencies build-base gcc

RUN npm ci

COPY . .

RUN ls -la ./

CMD [ "npm", "run", "start:built" ]
