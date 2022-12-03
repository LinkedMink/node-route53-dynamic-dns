FROM node:18-alpine

ARG ENVIRONMENT=production

ENV NODE_ENV ENVIRONMENT
ENV IS_CONTAINER_ENV true

# node:x:1000:1000:Linux User,,,:/home/node:/bin/sh
ENV APP_USER=node
ENV APP_UID=1000
ENV APP_GID=1000
ENV APP_ROOT_DIR=/home/node

# RUN apk update
# RUN apk add curl python3 --no-cache --virtual build-dependencies build-base gcc

WORKDIR ${APP_ROOT_DIR}

COPY --chown=${APP_UID}:${APP_GID} . .

USER ${APP_USER}

RUN npm ci

RUN ls -la ./

CMD [ "npm", "run", "start:built" ]
