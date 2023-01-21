# Developing

## Configure

Install dependencies with NPM.

```sh
npm install
```

Configure the app for development with a .env file. Copy the [template.env](template.env) file and edit it as necessary.

```sh
cp template.env .env
```

## Run

You can run the app in development mode where it will keep running until it's terminated. This supports debugging the TypeScript source
without transpiling to JavaScript ahead of time.

```sh
npm run start
```

The app can be transpiled and ran as a standalone NodeJS app.

```sh
npm run build
npm run start:built
```

## Build

### Publish NPM

```sh
# major | minor | patch
export VERSION_TYPE=patch
# Manual Dev Build Publish : premajor | preminor | prepatch | prerelease
npm --no-git-tag-version version pre${VERSION_TYPE}
# Incremental Build
npm --no-git-tag-version version prerelease
npm publish --tag beta

# Manual Prod Build Publish : major | minor | patch
npm version patch
export VERSION_NOW=v$(npm pkg get version | sed 's/"//g')
git push
git push origin ${VERSION_NOW}
npm publish
```

### Docker Image

There's a [Dockerfile](docker/Dockerfile) that can be used to build a Docker image. Create a multi-architechture docker image and push it
to a registry with the included [build script](docker/build.sh).

```sh
docker/build.sh
# Tag and push to a specific registry and scope
DOCKER_REGISTRY=myregistry.tld DOCKER_SCOPE=myscope docker/build.sh
```
