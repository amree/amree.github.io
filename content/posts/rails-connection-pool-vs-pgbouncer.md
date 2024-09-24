---
title: Rails Connection Pool vs Pgbouncer
date: 2022-08-31
tags: [postgresql, rails]
---

Rails by default comes with connection pooler on the application side but I
always wonder what is the difference if we use another connection pooler such
as PgBouncer. So, here is some notes on trying to understand *some* of it.

To try this out, I'm using docker so that I don't have to install extra
application:

```bash
$ mkdir conn-poc; cd conn-poc
$ rails new blog --api -T --database=postgresql

$ mkdir bouncer
$ mkdir db

# create docker network so that PgBouncer and PostgreSQL can communicate with eacher other
$ docker network create conn-poc-1-net

# start postgresql
$ cd db
$ docker run --rm \
  --net conn-poc-1-net \
  --name conn-poc-1-pg \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=blog_development \
  -v $(pwd):/var/lib/postgresql/data  \
  -p 6432:5432 \
  -it postgres:13.8-alpine

# start pgbouncer
$ cd bouncer
$ docker run --rm \
  --net conn-poc-1-net \
  --name conn-poc-1-bouncer \
  -e DATABASE_URL="postgres://postgres:postgres@conn-poc-1-pg/blog_development" \
  -v $(pwd):/etc/pgbouncer \
  -p 7432:5432 \
  edoburu/pgbouncer
```

PgBouncer config:
```ini
[databases]
blog_development = host=conn-poc-1-pg port=5432 user=postgres

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 5432
user = postgres
auth_file = /etc/pgbouncer/userlist.txt
auth_type = md5
ignore_startup_parameters = extra_float_digits
pool_mode = transaction
```

Update some of the code:
```yml
# config/database.yml
default: &default
  adapter: postgresql
  encoding: unicode
  username: "postgres"
  password: "postgres"
  port: <%= ENV.fetch("DB_PORT") %>
  host: localhost
  pool: <%= ENV.fetch("RAILS_MAX_THREAD") %>
  checkout_timeout: 5
  idle_timeout: 3
  prepared_statements: false
```
```ruby
# config/puma.rb
workers ENV.fetch("WEB_CONCURRENCY") { 2 }
```

Setup the DB and create a table:
```bash
$ rails g model User name
$ rails db:create db:migrate
```

```ruby
# config/routes.rb
Rails.application.routes.draw do
  root "home#index"
end

# app/controllers/home_controller.rb
class HomeController < ApplicationController
  def index
    render json: User.first
  end
end

# config/environments/development.rb
config.hosts.clear
```

We can connect to the PostgreSQL with:
```bash
# 6432 = Connect to PostgreSQL directly
# 7432 = Connect throught PgBouncer
psql -U postgres -h localhost -d blog_development -p 6432
```

We can use this SQL to check the amount of connections:
```sql
SELECT * FROM pg_stat_activity WHERE datname = 'blog_development'
```

To run the server, I use this command (values will be changed depending on what I want to try):
```bash
DB_PORT=7432 \
  RAILS_MAX_THREAD=5 \
  WEB_CONCURRENCY=3 \
  rails s -b 0.0.0.0
```

To send request, we can use this command:
```bash
# Apache benchmark
docker run --rm jordi/ab -c 500 -n 500 http://host.docker.internal:3000/
```

The result:

![image](/images/posts/2022-08-31/result.png)


## Calculating the amount of database needed

The first part is to figure out the max connections per process:
- The pool size in `database.yml` depends on how many threads/concurrency that
you set
- If you set `RAILS_MAX_THREAD` to 10, then, that's the amount the pool size
needed
- But you might different value when you have a background job, e.g: Sidekiq
- Sidekiq might have different concurrency, so, if the concurrency is set to
20, then you need to increase the pool size to accomodate that. So, there's a
chance the web might have bigger value unless you can specify different config
between the worker and the web server (assuming they live in different server)

Once we have figured that out, we need to think about the amount of process
that we will have:
- A process is something like how many puma/sidekiq process that you have
- In this exercise, I'm using `WEB_CONCURRENCY`

Example:
- Puma: WEB_CONCURRENCY=2
- Puma: RAILS_MAX_THREAD=5

This means, we need to have at least 2x5 = 10 connections. We also need to set
the DB pool size to 5.

Let's add Sidekiq to the mix:
- bundle exec sidekiq -C config/sidekiq/payment.yml
- bundle exec sidekiq -C config/sidekiq/data.yml

Assuming `concurrency` set to 20 each in those configs, we need to have 2 x 20
= 40 connections. DB pool should be set to 20 in this case.

So, we need a total of 10 + 40 = 50 connections.

Again, we need to ensure proper DB pool size is set.

## Notes

These are some the notes based on my observations:
- Opening rails console won't immediately open a connection
- Without PgBouncer, Rails will immediately open all possible connections
- PgBouncer will increase the connections after I ran the benchmark couple of
times, but never reached the max
- Both Rails and PgBouncer has an option to disconnect idle connections
- Without the right pool/thread size, Rails will throw
`ActiveRecord::ConnectionTimeoutError` error
- I had to use transaction mode with `prepared_statement` option disabled. Need
to read more about this
- I'm not splitting the read and write

## Conclusion

- I assumed PgBouncer will always use less connections which is kind of true
but I'm not sure if more requests comes in, will the amount of connections
keeps on increasing to the max?
- We can rely on the timeout to remove the idle connections for both Rails and
PgBouncer
- PgBouncer is definitely a must if we are connecting to the DB from various
applications and one of them might not have their own pool manager
- Based on some searching, it's not possible to disable Rails connection pooler
and just use PgBouncer
- I think PgBouncer is capable of processing multiple SQL using one connection
because it has the multiplex feature, but I can't confirm this, yet

## References

- https://devcenter.heroku.com/articles/best-practices-pgbouncer-configuration#pgbouncer-s-connection-pooling-modes
- https://www.pgbouncer.org/config.html
- https://makandracards.com/makandra/45360-using-activerecord-with-threads-might-use-more-database-connections-than-you-think
- https://maxencemalbois.medium.com/the-ruby-on-rails-database-connections-pool-4ce1099a9e9f
- https://dev.to/hopsoft/optimizing-rails-connections-4gkd
