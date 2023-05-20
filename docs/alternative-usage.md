# Alternative Usage

Here are alternative ways you can setup the app on various systems.

## systemd

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

## Init Script - OpenWRT

The app was tested with the latest OpenWRT and NodeJS snapshot packages.

- https://openwrt.org/docs/techref/initscripts
- https://openwrt.org/docs/guide-developer/procd-init-scripts

```sh
opkg update
opkg install node node-npm
mkdir /etc/nodejs

cat << HEREDOC > "/etc/nodejs/node-route53-dynamic-dns.env"
LOG_LEVEL=verbose
BIND_PORT=61080
IP_V6_ENABLED=false
HOSTNAMES_TO_UPDATE=`[
    "myhost.public.tld",
    "vpn.public.tld"
]`

AWS_ACCESS_KEY_ID=
AWS_ACCESS_KEY_SECRET=

HEREDOC

cat << HEREDOC > "/etc/init.d/node-route53-dynamic-dns"
#!/bin/sh /etc/rc.common
# Init NPM Package: @linkedmink/node-route53-dynamic-dns
# https://github.com/LinkedMink/node-route53-dynamic-dns

USE_PROCD=1

# Starts after networking starts
START=21
# Stops before networking stops
STOP=89

DOTENV_FILE=/etc/nodejs/node-route53-dynamic-dns.env

start_service() {
    procd_open_instance node-route53-dynamic-dns

    procd_set_param command /usr/bin/env npx node-route53-dynamic-dns
    procd_append_param command --env-file \${DOTENV_FILE}

    procd_set_param respawn \${respawn_threshold:-3600} \${respawn_timeout:-5} \${respawn_retry:-5}
    procd_set_param file \${DOTENV_FILE}
    procd_set_param pidfile /var/run/node-route53-dynamic-dns.pid

    procd_set_param stdout 1
    procd_set_param stderr 1

    procd_close_instance
}

HEREDOC

chmod 400 /etc/nodejs/node-route53-dynamic-dns.env
chmod u+x /etc/init.d/node-route53-dynamic-dns

/etc/init.d/node-route53-dynamic-dns start
```
