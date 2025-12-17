---
title: Setup Free Uptime Monitoring Service in Heroku
date: 2013-06-28
tags: [devops]
---

A free way for us to setup free version of uptime service.

<!--more-->

Clone the [uptime](https://github.com/fzaninotto/uptime.git) repository

```bash
git clone https://github.com/fzaninotto/uptime.git
```

Get into the directory

```bash
cd uptime
```

Login using [heroku command line](https://devcenter.heroku.com/categories/command-line)

```bash
heroku login
```

Run this command to create the `Procfile`:

```bash
echo "web: node app.js" > Procfile
```

Commit your changes

```bash
git add .
git commit -m 'Added Procfile'
```

Create your heroku app

```bash
heroku create yourappname
```

Add MongoDB to your app

```bash
heroku addons:add mongolab
```

Get your MongoDB connection info

```txt
heroku config
  === uptimee Config Vars
  MONGOLAB_URI: mongodb://username:password@host:port/dbname
  PATH:         bin:node_modules/.bin:/usr/local/bin:/usr/bin:/bin
```

Use the info you just got and update `config/default.yml`:

```yml
mongodb:
  server:   host:port
  database: dbname
  user:     username
  password: password
```

I've also updated other settings

```yml
monitor:
  apiUrl: 'http://localhost/api' # must be accessible without a proxy
  # apiUrl: 'http://localhost:8021/api' # must be accessible without a proxy

server:
  port: 80
  # port: 8021

email:
  dashboardUrl: 'http://localhost'
  # dashboardUrl: 'http://localhost:8021'
```

Commit your changes

```bash
git add .
git commit -m 'Updated the configurations'
```

Push your files

```bash
git push heroku master
```

Make sure there's one dyno running for the `web`:

```bash
heroku ps:scale web=1
```

You can verify it's running using

```bash
heroku ps
=== web (1X): `node app.js`
web.1: up 2013/06/28 19:03:30 (~ 3m ago)
```

Open your app

```bash
git push heroku master
```

That's it, good luck! :)
