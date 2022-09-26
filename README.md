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

### Container

## Developing

### Configure

Install dependencies with NPM.

```sh
npm install
```

Configure the app for development with a [.env](template.env) file. Copy the file and edit it as necessary (inline comments for settings).

```sh
cp template.env .env
```

Configure an AWS IAM user with access to the zones and records you wish to update. If you have a user with permissive access (an admin),
you can run the bundled script to geneate a restrictive access policy for the specific zones and records you want to update. Set
`AWS_ACCESS_KEY_ID`, `AWS_ACCESS_KEY_SECRET` to a user with access, and change the target records in `HOSTNAMES_TO_UPDATE`.

```sh
npm run script:create-policy-json
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
