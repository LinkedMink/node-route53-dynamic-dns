#/bin/sh

IMAGE_NAME="node-route53-dynamic-dns"
ARCHITECTURES="linux/amd64,linux/arm64"
DOCKER_ARGS=""

if [ -z "$DOCKER_REGISTRY" ]; then
  DOCKER_REGISTRY="" 
fi
if [[ "$DOCKER_REGISTRY" != "*/" ]]
then
  DOCKER_REGISTRY="${DOCKER_REGISTRY}/"
fi

if [ -z "$DOCKER_SCOPE" ]; then
  DOCKER_SCOPE="linkedmink/" 
fi
if [[ "$DOCKER_SCOPE" != "*/" ]]
then
  DOCKER_SCOPE="${DOCKER_SCOPE}/"
fi

startTime=$(date +"%s")
echo "---------- Build Started: $startTime ----------"
npm run build

docker buildx build . \
  --build-arg ENVIRONMENT=production \
  --file "docker/Dockerfile" \
  --platform "${ARCHITECTURES}" \
  --tag "${DOCKER_REGISTRY}${DOCKER_SCOPE}${IMAGE_NAME}:latest" \
  --progress "plain" \
  --push \

endTime=$(date +"%s")
elapsed="$((endTime - startTime))"
echo "---------- Build Finished: ${elapsed} seconds ----------"
