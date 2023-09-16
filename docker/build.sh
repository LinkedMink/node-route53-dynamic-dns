#!/usr/bin/env bash

IMAGE_NAME="node-route53-dynamic-dns"
ARCHITECTURES="linux/amd64,linux/amd64/v3,linux/arm64,linux/arm/v7"
DOCKER_ARGS=""
VERSION=$(npm pkg get version | sed 's/"//g')

if [ -z "$DOCKER_REGISTRY" ]; then
  DOCKER_REGISTRY="" 
elif [[ "$DOCKER_REGISTRY" != "*/" ]]; then
  DOCKER_REGISTRY="${DOCKER_REGISTRY}/"
fi

if [ -z "$DOCKER_SCOPE" ]; then
  DOCKER_SCOPE="linkedmink/" 
elif [[ "$DOCKER_SCOPE" != "*/" ]]; then
  DOCKER_SCOPE="${DOCKER_SCOPE}/"
fi

startTime=$(date +"%s")
echo "---------- Build Started: $startTime ----------"
npm run build
PACKAGE_ARCHIVE=$(npm pack | tail -1)
tar --extract --verbose --file="$PACKAGE_ARCHIVE" --directory="docker"
cp ./package-lock.json ./docker/package

docker buildx build ./docker/package \
  --build-arg ENVIRONMENT=production \
  --file "docker/Dockerfile" \
  --platform "${ARCHITECTURES}" \
  --tag "${DOCKER_REGISTRY}${DOCKER_SCOPE}${IMAGE_NAME}:latest" \
  --tag "${DOCKER_REGISTRY}${DOCKER_SCOPE}${IMAGE_NAME}:${VERSION}" \
  --progress "plain" \
  --push

endTime=$(date +"%s")
elapsed="$((endTime - startTime))"
echo "---------- Build Finished: ${elapsed} seconds ----------"
