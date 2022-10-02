# Node Route53 Dynamic DNS

[![Build Status](https://github.com/LinkedMink/node-route53-dynamic-dns/actions/workflows/build-main.yml/badge.svg)](https://github.com/LinkedMink/node-route53-dynamic-dns/actions?query=workflow%3A%22build-main%22)
[![NPM Version](https://img.shields.io/npm/v/@linkedmink/node-route53-dynamic-dns)](https://www.npmjs.com/package/@linkedmink/node-route53-dynamic-dns)
[![Docker Image Size](https://img.shields.io/docker/image-size/linkedmink/node-route53-dynamic-dns/latest)](https://hub.docker.com/r/linkedmink/node-route53-dynamic-dns)

This is a NodeJS background process that updates AWS Route 53 DNS address records whenever the public IP of the hosting environment changes.
This can be useful for home or small business networks where an ISP doesn't issue a static IP.

- Supports multiple records in multiple zones
- Supports IPv6
- Supports containers (tested with Docker)
- Simple HTTP server
  - Can be used for health checks
  - Outputs current IP and managed records

## Prerequisites

- NodeJS 16
- Hosted Zones with AWS Route 53

## Usage

The README will focus on running the app as a user (see [Additional Documentation](#additional-documentation) for build and dev info)

### Base Package

You can run the [npm package](https://www.npmjs.com/package/@linkedmink/node-route53-dynamic-dns) as a self-contained executable.
Install the package globally.

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
npx node-route53-dynamic-dns iam-policy
```

After the configuration has been set, execute the packages main command.

```sh
npx node-route53-dynamic-dns
```

### Containers

You can run the app on any container runtime like Docker and configure it using environment variables and/or mounted files. A
[Docker image](https://hub.docker.com/r/linkedmink/node-route53-dynamic-dns) has been built and published to Docker Hub. An example
configuration [docker-compose.yml](docker/docker-compose.yml) file is included in the repo. It has configuration to mount the
[secrets.env](docker/secrets.env) as Docker secret. Copy the files and edit them as needed (see [template.env](template.env)).

```sh
cp docker/{docker-compose.yml,secrets.env} /my/docker/config/path

# Change AWS_ACCESS_KEY_ID, AWS_ACCESS_KEY_SECRET, and HOSTNAMES_TO_UPDATE at minimum
cd /my/docker/config/path
nano docker-compose.yml
nano secrets.env

# Test out the configuration
sudo docker compose up
# Run the app in the background
sudo docker compose up -d
```

### systemd Example

You can configure the app to run as a detached service at system startup in the background. Here's an example of how you can do
it on Linux with systemd.

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
# EnvironmentFile=/path/to/envFile

ExecStart=/usr/bin/env npx node-route53-dynamic-dns

TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
HEREDOC

sudo mv ./node-route53-dynamic-dns.service /etc/systemd/system
sudo systemctl daemon-reload
sudo systemctl start node-route53-dynamic-dns
sudo systemctl enable node-route53-dynamic-dns
```

## Additional Documentation

You can modify, build, and run the app as you see fit. If you have a useful modification or fix, consider contributing.

- [developing.md](docs/developing.md)
