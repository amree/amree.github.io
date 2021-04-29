---
layout: post
title: Manage Multiple App URL in Local Development
meta-description: Manage Multiple App URL in Local Development using haproxy
---

These days we might have multiple local applications that are running on different ports (e.g: `http://localhost:3000, http://localhost:3001` and so on). This is pretty troublesome as we have to remember which application is running on which port.

`haproxy` can redirect a URL to a certain host with different port (this is impossible with `hosts`). Here's how we can do it in OS X:

Install `haproxy`

```bash
brew install haproxy
```

Create a new file at `/usr/local/etc/haproxy.cfg` and put these contents (customize as you wish):

```
global
  maxconn 4096
  daemon

defaults
  log global
  mode http

  timeout connect 5000ms
  timeout client  50000ms
  timeout server  50000ms

frontend web_gateway
  bind *:80

  # https://cbonte.github.io/haproxy-dconv/1.7/configuration.html#7.1
  acl is_web hdr_beg(host) myapp.local
  acl is_api hdr(host) -i api.myapp.local
  acl is_admin hdr(host) -i admin.myapp.local

  use_backend web if is_web
  use_backend api if is_api
  use_backend admin if is_admin

backend web
  # https://cbonte.github.io/haproxy-dconv/1.7/configuration.html#server
  server web 127.0.0.1:3000

backend api
  server api 127.0.0.1:3001

backend admin
  server admin 127.0.0.1:3002

```

Make sure you put the hosts declared before in `/etc/hosts`:

```
127.0.0.1  localhost
127.0.0.1  myapp.local.sg # We can use different domain here
127.0.0.1  myapp.local.hk
127.0.0.1  admin.myapp.local
127.0.0.1  api.myapp.local
```

Run this command to ensure `haproxy` will always be running

```bash
brew services start haproxy
```
