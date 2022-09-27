# Node Route53 Dynamic DNS

![Build State](https://github.com/LinkedMink/node-route53-dynamic-dns/actions/workflows/build-main.yml/badge.svg)

This is a NodeJS background process that updates AWS Route 53 DNS address records whenever the public IP of the hosting environment changes.
This can be useful for home or small business networks where an ISP doesn't issue a static IP.

- Supports multiple records in multiple zones
- Supports IPv6
- Supports containers (tested with Docker)
- Simple HTTP server
  - Can be used for health checks
  - Outputs current IP and managed records

## Getting Started

### Prerequisite

- NodeJS 16
- Hosted Zones with AWS Route 53

### Service

You can run the package as a self-contained executable background process and configure your system to run it in the backgound.

```sh
npm install -g @linkedmink/node-route53-dynamic-dns
```

The app can be configured using a [.env](https://github.com/motdotla/dotenv#dotenv) file in the current working directory. See the
[template.env](template.env) for defaults and comments about the allowed options. Alternatively you can use environment variables
with names matching the keys in `template.env`.

Configure an AWS IAM user with access to the zones and records you wish to update. If you have a user with permissive access (an admin),
you can run the bundled script to geneate a restrictive access policy for the specific zones and records you want to update. Set
`AWS_ACCESS_KEY_ID`, `AWS_ACCESS_KEY_SECRET` to a user with access, and change the target records in `HOSTNAMES_TO_UPDATE`.

```sh
npm run script:create-policy-json
```

After the configuration has been set, execute the packages main function.

```sh
npx node-route53-dynamic-dns
```

#### systemd Example

You can configure the app to run as a detached service at system startup. Here's how you can do it on Linux with systemd

```sh
cat << HEREDOC > "node-route53-dynamic-dns.service"
# /etc/systemd/system/node-route53-dynamic-dns.service
[Unit]
Description=NodeJS client to update AWS Route53 DNS records from the host's public IP

[Service]
# WorkingDirectory=/path/to/.env/directory
# Or configure with environment variables
# Environment=HOSTNAMES_TO_UPDATE=["myhost.public.tld"]
# Environment=AWS_ACCESS_KEY_ID=
# Environment=AWS_ACCESS_KEY_SECRET=
# Or use systemd EnvironmentFile
# EnvironmentFile=/path/to/env.txt

ExecStart=/usr/bin/env npx node-route53-dynamic-dns

TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
HEREDOC

sudo mv ./node-route53-dynamic-dns.service /etc/systemd/system
sudo systemctl daemon-reload
sudo systemctl start node-exporter
sudo systemctl enable node-exporter
```

### Container

You can run the app on any container runtime like Docker and configure it using environment variables. See the example

## Developing

### Configure

Install dependencies with NPM.

```sh
npm install
```

Configure the app for development with a .env file. Copy the [template.env](template.env) file and edit it as necessary.

```sh
cp template.env .env
```

### Run

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

### Build

#### Publish NPM

```sh
# Manual Dev Build Publish : premajor | preminor | prepatch | prerelease
npm --no-git-tag-version version prerelease
npm publish --tag beta

# Manual Prod Build Publish : major | minor | patch
npm version patch
git push origin v1.0.1
npm publish
```

#### Docker Image

There's a [Dockerfile](docker/Dockerfile) that can be used to build a Docker image. Create a multi-architechture docker image and push it
to a registry with the included [build script](docker/build.sh).

```sh
docker/build.sh
# Tag and push to a specific registry and scope
DOCKER_REGISTRY=myregistry.tld DOCKER_SCOPE=myscope docker/build.sh
```
