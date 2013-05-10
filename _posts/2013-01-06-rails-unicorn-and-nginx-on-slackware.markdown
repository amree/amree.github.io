---
layout: post
title: Rails, Unicorn and Nginx on Slackware
meta-description: Deploying Rails on Slackware using Unicorn and Nginx
comments: true
---

#{{ page.title }}

I was trying to deploy a Rails application using Apache and got into some problems when I tried to
configure the app so that Apache will be the one that serves the precompiled assets (javascripts,
css, images and others). Since I'm on tight deadline (yeah, I should've tested production mode much
more earlier), I tried my luck with Nginx and it worked easily without any hassle. So, this is
how I did it.

## Goals

* Precompiled assets will be served by Nginx and not the Rails server itself.
* Assets will be served in gzip.

## Environments

* Slackware v14
* Rails v3.2.10
* Ruby v1.9.3

## Guides

First of all, install [nginx](http://slackbuilds.org/repository/14.0/network/nginx/) from Slackbuild.

Be sure to turn off Apache's startup script if you have it installed:

    chmod -x /etc/rc.d/rc.httpd

This is to ensure no conflict since both of them by default will use port 80.

Put `unicorn` in your Gemfile and run `bundle`.

I'm putting my Rails app in `/opt/neuro`, so, adjust it accordingly.

Create `nginx.conf` in  `/opt/neuro/config/nginx.conf`:

{% highlight nginx %}
upstream unicorn {
  server unix:/tmp/unicorn.neuro.sock fail_timeout=0;
}

server {
  listen 80 default deferred;
  server_name neuro.husmnet
  root /opt/neuro/public;

  location ^~ /assets/ {
    root /opt/neuro/public;
    gzip_static on;
    expires max;
    add_header Cache-Control public;
  }

  try_files $uri/index.html $uri @unicorn;

  location @unicorn {
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Host $http_host;
    proxy_redirect off;
    proxy_pass http://unicorn;
  }

  error_page 500 502 503 504 /500.html;
  client_max_body_size 4G;
  keepalive_timeout 10;
}

{% endhighlight %}

Create `unicorn.rb` in `/opt/neuro/config/unicorn.rb`

{% highlight ruby %}

root = "#{Dir.pwd}"

# Define worker directory for Unicorn
working_directory root

# Location of PID file
pid "#{root}/tmp/pids/unicorn.pid"

# Define Log paths
stderr_path "#{root}/log/unicorn.log"
stdout_path "#{root}/log/unicorn.log"

# Listen on a UNIX data socket
listen "/tmp/unicorn.neuro.sock", :backlog => 64
# houllisten 8080, :tcp_nopush => true

worker_processes 2

# Load rails before forking workers for better worker spawn time
preload_app true

# Restart workes hangin' out for more than 240 secs
timeout 240

Replace `/etc/nginx/nginx.conf` with this content:

# user  root;
worker_processes  1;

error_log  /var/log/nginx/error.log;
#error_log  logs/error.log  notice;
#error_log  logs/error.log  info;

#pid        logs/nginx.pid;

events {
  worker_connections  1024;
}

http {
  include       mime.types;
  default_type  application/octet-stream;

  sendfile        on;

  keepalive_timeout  65;

  gzip  on;

  include /etc/nginx/sites-enabled/*;
}
{% endhighlight %}

Create `sites-enabled` directory in `/etc/nginx` and create a softlink to the `nginx.conf` in our app:

    $ mkdir /etc/nginx/sites-enabled
    $ ln -s /opt/neuro/config/nginx.conf neuro.conf

Before starting it for the first time, let us monitor important logs (open it using different
terminals) :

    $ tail -f /var/log/nginx/error.log
    $ tail -f /opt/neuro/log/unicorn.log

Make sure you've precompiled your assets:

    $ rake assets:clean
    $ rake assets:precompile

Start unicorn:

    $ cd /opt/neuro
    $ unicorn -c config/unicorn.rb -E production -D

Start nginx:

    $ nginx

Congratulation! Make sure there's no error in your logs. If there're, you can use these commands to
stop `nginx` and `unicorn` to start everything back:

    $ nginx -s stop
    $ killall unicorn

Let's test the gzip compression using `curl`:

    $ curl -LI --compressed http://neuro.husmnet/

You'll get something like this (notice the gzip info):

    HTTP/1.1 200 OK
    Server: nginx/1.2.2
    Date: Sat, 05 Jan 2013 21:00:26 GMT
    Content-Type: text/html; charset=utf-8
    Connection: keep-alive
    Status: 200 OK
    X-UA-Compatible: IE=Edge,chrome=1
    ETag: "a66ac1d43d8f07ecc0737e64dd8a3366"
    Cache-Control: max-age=0, private, must-revalidate
    Set-Cookie: _neuro_session=BAh7B0kiD3Nlc3Npb25faWQGOgZFRkkiJTQ2YTU2NjE3MDY0Y2RkNzk0Yzk3ODhhNDJlYmQ3ODA3BjsAVEkiEF9jc3JmX3Rva2VuBjsARkkiMVNvOXVTS2I2RXJIcTljbS9WeGRDODZyTUpVZENXL2NPVnJhTGR0V2xydGM9BjsARg%3D%3D--173e9d56a5cc434eb675b6626d90aced1cc17cd6; path=/; HttpOnly
    X-Request-Id: 760e233de4980dc75169f2c68a53dc31
    X-Runtime: 0.017885
    X-Rack-Cache: miss
    Content-Encoding: gzip

I admit, this is a very simple config, but it's good enough for a beginner like me to get started.
 So, good luck!
