---
title: Ruby on Rails Development Using Docker
date: 2022-01-01
tags: [docker, rails]
---

Check out my previous post if you want to start learning from just a
Dockerfile. As you may have realized, it's not scalable if we keep on using the
long command to manage our containers. We haven't even started talking about
different services such as PostgreSQL and Redis, yet.

In this post, we are aiming to use `docker-compose` to make our development
experience easier.

### Prepare our application

I'm assuming we are starting from fresh where we don't have any Ruby on Rails
application ready, yet. I'll put a note later if you are starting with an
existing application.

The files that we need in order to dockerize our application are:

- Gemfile - List of gems that are going to be installed
- Gemfile.lock - Locked version of `Gemfile`
- package.json - List of npm packages that are going to be installed
- yarn.lock - Locked version of `package.json`

Why these files? They are the ones that will determine what packages will be
installed in order for us to have a working Rails application.

How do we get them without installing the Rails application in our system?
Similar to what we did before, we need to create a temporary application to
copy them.

Create a directory and put this `Dockerfile` inside:

```docker
FROM ruby:2.6.3

RUN apt-get update && apt-get install -y --no-install-recommends \
  curl build-essential libpq-dev && \
  curl -sL https://deb.nodesource.com/setup_16.x | bash - && \
  curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - && \
  echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list && \
  apt-get install -y nodejs
RUN rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN npm install -g yarn
RUN gem install rails:6.1.4.4 bundler:2.3.4

CMD ["rails", "server", "-b", "0.0.0.0"]
```

Then, run these commands to generate a new rails application:

```bash
docker build . -t blog

docker run --rm -it \
  -v $(pwd):/app \
  -v bundle-2.6.3:/bundle \
  -v node_modules-rails-6.1.4.1:/app/node_modules \
  -e BUNDLE_PATH=/bundle \
  blog \
  bash

# run this in the container
rails new . --database=postgresql
```

Once that is done, we will have all of the necessary files to really start our
new application.

Our next target is to run the basic application successfully. Replace the
existing `Dockerfile` with this content:

```docker
FROM ruby:2.6.3

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    libpq-dev \
  && curl -sL https://deb.nodesource.com/setup_16.x | bash - \
  && curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - \
  && echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list \
  && apt-get install -y nodejs \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN gem install rails:6.1.4.4 bundler:2.3.4
COPY Gemfile* /app
RUN bundle install --jobs "$(nproc)"

RUN npm install -g yarn
COPY package.json /app
COPY yarn.lock /app
RUN yarn install

ADD . /app

EXPOSE 3000
CMD ["rails", "server", "-b", "0.0.0.0"]
```

Create another file `docker-compose.yml`

```yaml
services:
  db:
    image: postgres:14.1-alpine
    volumes:
      - db:/var/lib/postgresql/data
    environment:
      - POSTGRES_PASSWORD=password

  webpacker:
    build: .
    command: bash -c "bin/webpack-dev-server"
    ports:
      - "3035:3035"
    volumes:
      - .:/app
      - bundle:/bundle
      - node_modules:/app/node_modules
    environment:
      - BUNDLE_PATH=/bundle
      - WEBPACKER_DEV_SERVER_HOST=0.0.0.0

  web:
    build: .
    command: bash -c "rm -f /app/tmp/pids/server.pid && rails s -b 0.0.0.0"
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - bundle:/bundle
      - node_modules:/app/node_modules
    environment:
      - BUNDLE_PATH=/bundle
      - DATABASE_URL=postgres://postgres:password@db/blog_development
      - WEBPACKER_DEV_SERVER_HOST=webpacker
    depends_on:
      - db
      - webpacker

volumes:
  db: {}
  bundle: {}
  node_modules: {}
```

Run these commands:

```bash
docker-compose build
docker-compose run --rm web rails db:create db:migrate
```

Run `docker-compose up` to see if it works. You can verify all containers are
running by issuing `docker container ls`. There should be three containers:
`web`, `webpacker` and the `db`.

Open [http://localhost:3000/](http://localhost:3000/) to ensure everything is
good.

Generate some resources so that we can have something that we can try on:

```bash
docker-compose run web rails g scaffold Post title body:text
docker-compose run web rails db:migrate
```

Things to try out:

- Create a new Post and see if you can persist it
- Change the `application.js` and see if your webpacker will compile the
changes
- See if your hot reload works when your js file changed

Cool, now we have a running local rails application using Docker. We will start
tackling some normal workflows one by one.

### Base Image

This is actually something I realized later, but I’m adding it to the top to
help us save some time when trying out other stuff mentioned below. Normally, I
would use this config whenever I wanted to add a new service in our
`docker-compose`:

```yaml
services:
  console:
    build: .
    command: bash -c "rails console"
    volumes:
      - .:/app
      - bundle:/bundle
      - node_modules:/app/node_modules
    environment:
      - BUNDLE_PATH=/bundle
      - DATABASE_URL=postgres://postgres:password@db/blog_development
      - WEBPACKER_DEV_SERVER_HOST=webpacker
    depends_on:
      - db
```

That will actually rebuild the image again which means installing all the apt,
gems, npm, etc.  You can try `docker-compose up` and see what happened. I’ll
wait.

To prevent this, we can build an image first and use the same to all of our
services:

```yaml
services:
  base_web:
    build: .
    image: base_web
    command: /bin/true

  webpacker:
    # build: . # remove
    image: base_web

  web:
    # build: . # remove
    image: base_web

  worker:
    # build: . # remove
    image: base_web
```

### Adding a new gem

Actually, we can just add into the `Gemfile` just like we normally do and run

```bash
docker-compose run --rm web bundle install
```

However, I do notice that running `docker-compose build` will re-install
everything again. I’m not sure yet how to handle this and it doesn’t make sense
to keep on installing all gems every time we change something in `Gemfile`.
I’ll just defer this to later.

### Accessing pry console

The first thing that I noticed is `docker-compose up` will launch all services
together and you won’t be able to access the prompt when you load the page. It
will just go past the console as if nothing happened:

```bash
web_1        | Processing by PostsController#index as HTML
web_1        |
web_1        | From: /app/controllers/posts_controller.rb:8 PostsController#index:
web_1        |
web_1        |      5: def index
web_1        |      6:   @posts = Post.all
web_1        |      7:
web_1        |  =>  8:   require 'pry'; binding.pry
web_1        |      9:
web_1        |     10:   puts "a"
web_1        |     11: end
web_1        |
[1] pry(#<PostsController>)>
web_1        |   Rendering layout layouts/application.html.erb
web_1        |   Rendering layout layouts/application.html.erb
```

In order to catch/access the prompt, we need to update the `docker-compose.yml`
for the web part:

```yaml
web:
  tty: true
  stdin_open: true
```

Run `docker-compose up` again and load the page with `pry` code. Once it’s
stopped, open a new terminal and run

```bash
docker attach container_name
```

We can get the right container name by running `docker container ls`. Make sure
we choose the web’s container name as that is where the prompt is.

Once we ran that command, we will notice nothing happened. We are actually
already in the prompt itself. Just press a key, e.g: enter and we will get the
prompt. Once we have exited the prompt, the would still be in the container
itself. To detach, just press `CTRL-p CTRL-q` key sequence.

By the way, we can tail the log from another window by running:

```bash
docker-compose logs --follow
```

### Sidekiq

It is pretty common to use background job processing in our app and one of the
most popular services out there would be Sidekiq. Add `sidekiq` gem to our
`Gemfile` and install it using the steps mentioned above.

We need to make some adjustments to existing configurations:

```yaml
# docker-compose.yml
services:
  # ...
  redis:
    image: redis:6.2-alpine
    command: redis-server
    volumes:
      - redis:/data

  web:
	  # ...
    environment:
      # ...
      - REDIS_URL=redis://redis:6379
    depends_on:
      # ...
      - redis

  worker:
    build: .
    command: bash -c "bundle exec sidekiq"
    volumes:
      - .:/app
      - bundle:/bundle
      - node_modules:/app/node_modules
    environment:
      - BUNDLE_PATH=/bundle
      - DATABASE_URL=postgres://postgres:password@db/blog_development
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

volumes:
  # ...
  redis: {}
```

Create a simple worker to test it out:

```ruby
# app/workers/test_worker.rb
class TestWorker
  include Sidekiq::Worker

  def perform
    Post.create(title: "Blogging at #{Time.current}")
  end
end
```

Do a `docker-compose down` and then `docker-compose up` to restart everything.
Run console to manually execute the worker:

```bash
docker-compose run --rm web rails console

> TestWorker.perform_async
```

We will notice the worker will be processed from the server log. It will look
like this:

```bash
worker_1  | 2021-12-31T03:49:18.807Z pid=1 tid=gpmykgmlp class=TestWorker jid=1f261ce8ab3bdb0b7c11d2e2 INFO: start
worker_1  | 2021-12-31T03:49:19.137Z pid=1 tid=gpmykgmlp class=TestWorker jid=1f261ce8ab3bdb0b7c11d2e2 elapsed=0.329 INFO: done
```

Do note that the worker will be run automatically whenever we use
`docker-compose up`. We can always run it manually using:

```bash
docker-compose run --rm web bundle exec sidekiq
```

Basically use the existing container and do make sure we already set the right
Redis connection for Sidekiq to work.

### Development ENV(s)

It is pretty common to have environment variables loaded with different values
based on the environment. It could also be different because it is unique to
the developer himself. So, how do we handle this? Let us assume we want to load
`FOO=bar` in every service that we created.

Just add this config in our services, e.g:

```yaml
# .env.dev
FOO=bar

# docker-compose.yml
services:
	# ...
	web:
		# ...
		env_file:
		- .env.dev

	# do the same for worker, webpacker, etc
```

We can test it out with:

```bash
docker-compose run --rm web bash

> echo $FOO
bar
```

You might be asking, wouldn’t this mean we are stuck with the same development
variable for all environments? Yes, that would be a problem, but we will solve
it in the next chapter. Right now, we just need to worry about our development
environment to simplify learning.

With the addition of `.env*`, we need to ensure it won’t be persisted into the
docker image for security reasons. I know we can do this with `.dockerignore`,
but I’m not sure how to verify or validate it. I’ll keep that in mind first and
return to this later.

### Private or Commercial gems

This actually took me the longest to understand how it works and I don’t think
I have the best solution yet, but it is working with some caveats. Let’s get on
to it.

I am using Sidekiq paid version in one of my projects but this problem can be
applied to private gems hosted in GitLab as well. Let us tackle Sidekiq’s gem
first.

Sidekiq required us to supply a username and password. We need to figure out
how to make it work during the build and runtime. We will talk about the
disadvantages of this approach later.

```
## Gemfile
gem 'sidekiq-ent', source: "https://enterprise.contribsys.com/"

## .dockerignore
/.env.development
/build_credentials
/docker-compose.override.yml

## .gitignore
/.env.development
/build_credentials
/docker-compose.override.yml

## Dockerfile
# ..
RUN gem install rails:6.1.4.4 bundler:2.3.4
COPY Gemfile* /app
COPY bundle_install.sh .
RUN --mount=type=secret,id=bundle_credentials ./bundle_install.sh
# ..
```

```bash
# bundle_install.sh
#!/bin/bash

set -euo pipefail

# Pre-installation
if [ -f /run/secrets/bundle_credentials ]; then
  export $(grep -v '^#' /run/secrets/bundle_credentials | xargs)
fi

# Run installation
bundle install --jobs "$(nproc)"

# Cleanup
```

```bash
# bundle_credentials
BUNDLE_ENTERPRISE__CONTRIBSYS__COM=username:password
BUNDLE_GITLAB__COM=amree:personal_token
```

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:14.1-alpine
    volumes:
      - db:/var/lib/postgresql/data
    environment:
      - POSTGRES_PASSWORD=password

  redis:
    image: redis:6.2-alpine
    command: redis-server
    volumes:
      - redis:/data

  webpacker:
    image: blog_base
    command: bash -c "bin/webpack-dev-server"
    ports:
      - "3035:3035"
    volumes:
      - .:/app
      - bundle:/bundle
      - node_modules:/app/node_modules
    environment:
      - BUNDLE_PATH=/bundle
      - WEBPACKER_DEV_SERVER_HOST=0.0.0.0

  web:
    image: blog_base
    command: bash -c "rm -f /app/tmp/pids/server.pid && rails s -b 0.0.0.0"
    tty: true
    stdin_open: true
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - bundle:/bundle
      - node_modules:/app/node_modules
    environment:
      - BUNDLE_PATH=/bundle
      - DATABASE_URL=postgres://postgres:password@db/blog_development
      - WEBPACKER_DEV_SERVER_HOST=webpacker
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - webpacker
      - redis

  worker:
    image: blog_base
    command: bash -c "bundle exec sidekiq"
    volumes:
      - .:/app
      - bundle:/bundle
      - node_modules:/app/node_modules
    environment:
      - BUNDLE_PATH=/bundle
      - DATABASE_URL=postgres://postgres:password@db/blog_development
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

volumes:
  db: {}
  bundle: {}
  node_modules: {}
  redis: {}
```

```yaml
# docker-compose.override.yml
services:
  webpacker:
    env_file:
      - .env.development

  web:
    env_file:
      - .env.development

  worker:
    env_file:
      - .env.development
```

That is quite some changes 😅  But this is needed for security purposes. We
don’t want our image to contain sensitive information. It is OK if we are not
going to push it to production, but for best practice, we will just try this
out first even though it’s a little bit complicated. Things may change once I
started to look into the deployment part, but let’s focus on what we have
first.

We are using a couple of features from Docker here, mainly secret and override.
Credit to this blog
[post](https://pythonspeed.com/articles/build-secrets-docker-compose/) that
solves most of the problems. We just need to adapt what was written to our
problem.

**docker secret**

This is the secure way to build our image without persisting the secret in the
image itself. From what I understand, the secret won’t be saved in the image as
it’s mounted temporarily, which is why we need to run the bundle install the
script instead of outside.

We can’t even export the value out and we also do not want to save the value
somewhere where people can access it once they managed to get our image. This
is also the reason why we move the `bundle install` into the script as that is
where the required credentials are available without being exposed to the
image.

**docker override**

This feature would allow us to specify different values for the variables based
on different environments. A small tip: Use `docker-compose config` to check
your final output.

Do note we need these two features for different reasons. docker secret is
going to be used when we build the image and docker override is being used when
we are running the services from `docker-compose`.

Since we can’t use the secret feature from `docker-compose`, we will just build
the image using `docker` from now on. The image generated will be used in
`docker-compose.yml` by specifying the tag name.

To build the image:

```bash
docker build -t blog_base --progress=plain --secret id=bundle_credentials,src=.env.development .
```

As you can see, we tag it as `blog_base` and use the same name in `docker-compose.yml`

If we want to verify whether the credential was leaked, we can use:

```bash
docker history blog_base --format "table{{.ID}}, {{.CreatedBy}}" --no-trunc
```

## Random Notes

- Volumes were created with a namespace, most likely based on the directory
name. I had to reinstall the gems because of this
([ref](https://stackoverflow.com/a/41222926))
- The default username for `postgres` image is `postgres`

## References

- [https://github.com/docker/compose/issues/4560](https://github.com/docker/compose/issues/4560)
- [https://gist.github.com/briankung/ebfb567d149209d2d308576a6a34e5d8](https://gist.github.com/briankung/ebfb567d149209d2d308576a6a34e5d8)
- [https://docs.docker.com/compose/environment-variables/](https://docs.docker.com/compose/environment-variables/)
- [https://docs.docker.com/engine/reference/builder/#dockerignore-file](https://docs.docker.com/engine/reference/builder/#dockerignore-file)
- [https://pythonspeed.com/articles/build-secrets-docker-compose/](https://pythonspeed.com/articles/build-secrets-docker-compose/)
- [https://docs.docker.com/develop/develop-images/build_enhancements/#new-docker-build-secret-information](https://docs.docker.com/develop/develop-images/build_enhancements/#new-docker-build-secret-information)
- [https://github.com/nickjj/docker-rails-example](https://github.com/nickjj/docker-rails-example)
- [https://stackoverflow.com/questions/19331497/set-environment-variables-from-file-of-key-value-pairs](https://stackoverflow.com/questions/19331497/set-environment-variables-from-file-of-key-value-pairs)
