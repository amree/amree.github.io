---
title: Introduction to Ruby on Rails and Dockerfile
date: 2021-12-04
tags: [docker, rails]
---

I think everyone knows by now how good Docker is in making sure we have
*almost* the same setup everywhere. However, I think it is not easy as everyone
thought for people new to it. There are just so many questions that I have to
the point they discouraged me from using it as my daily driver.

I decided to spend some time to look into this and document this journey
through this blog post. I hope this will help me and you in learning this
awesome service. There will be more after this, but we will start with this one
first.

At the end of this blog post, you will be able to run a Ruby on Rails
application with a working asset compilation using just a `Dockerfile`. We will
be using SQLite first for now.

## Using Dockerfile

Let us start with a simple `Dockerfile`. You can create a directory and place
this file there. Right now, we just want to create a new Rails application
without installing the rails gem on our local machine.

```docker
# Dockerfile
FROM ruby:2.6.3

RUN apt-get update && apt-get install -y --no-install-recommends \
  curl build-essential libpq-dev && \
  curl -sL https://deb.nodesource.com/setup_10.x | bash - && \
  curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - && \
  echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list && \
  apt-get update && \
  apt-get install -y nodejs yar

WORKDIR /app

RUN gem install rails bundler

ENTRYPOINT ["/bin/bash"]
```

We will go through this file line by line

```docker
FROM ruby:2.6.3
```

This will pull an image from [DockerHub](https://hub.docker.com/_/ruby) and use
it as the base. This particular line will pull the image tagged as `2.6.3`,
which is not listed on the main page. However, you can always look it up from
the Tags page.

There are still many variants that you can choose from. That will determine the
size of your local image and the library that is loaded with it.

I also learnt that once you build the image using that base, you can only clear
it using `docker builder prune`

```docker
RUN apt-get update ...
```

This line will install all of our required libraries in order to make sure we
can run what we want. Try not to install unnecessary applications/services to
reduce the image size.

```docker
WORKDIR /app
```

This will set `/app` as our default directory. Every subsequent command will be run from that directory.

```docker
ENTRYPOINT ["/bin/bash"]
```

This is the command that will be executed when we run the container. In this
case, we need access to `bash` first so that we can create a new rails
application and install all the required gems.

Let's build the container for the first time:

```bash
docker build . -t blog
```

Whenever we build the image, we need to tag it using `-t`. We also need to
supply the `Dockerfile` but we can just `.` and docker will find the file on
its own.

We will see the base image is downloaded and cached. It may take some time for
the first time, but it will be faster once everything is cached.

Since we need to create a new Rails application, we will interact with the
container:

```bash
docker run --rm -it blog
```

`--rm` will ensure there will be no unused container once we exit from it. We can verify it using `docker container ls`. `-it` is actually `--interactive + --tty` and it is for to interact with the container. The explanation is a bit long, but we can read it from these pages ([1](https://stackoverflow.com/a/59965320/113573), [2](https://stackoverflow.com/a/22287905/113573)). The `blog` param is just the image name that was created using `docker build`.

Once we got it, we realize we don't have anything yet, so, we need to create the Rails application with:

```bash
rails new .
```

Once everything is installed and you exit the container, you will realize the
Rails application you generated is not available in your local copy. It is also
not available in your docker container if you use the `docker run` again.
Obviously, we don't want to keep on creating a new Rails application.

Create another directory in the same level as the `Dockerfile` called `blog`.
This directory will be mapped to `/app` in our container.

We can use volume for this:

```bash
docker run --rm -it -v /local/path/to/blog:/app blog
```

This time, we can create a Rails application with `rails new .` from within the
container itself and it will be persisted in our local copy as well. Any
changes made from our machine (the host) and the container will be reflected on
both sides.

Once that is done, try exiting and entering your container again. We will
realize `rails -v` will throw us an error saying we are missing lots of gems.
This is happening because our gem installation wasn't persisted. In order to
fix this, we can use the volume feature again.

This time, we won't be mounting from our local directory just like we did with
our Rails application, instead, it will be created first and then we will
supply it as one of the arguments:

We just need to specify a new volume name and it will be created automatically
and in this case, we are using `bundle` as the volume name:

```bash
docker run --rm -it \
  -v /local/path/to/blog:/app \
  -v bundle:/bundle \
  -e BUNDLE_PATH=/bundle \
  blog
```

`BUNDLE_PATH` is just an environment variable that is used by `ruby` to install
the bundled gems. Just do `bundle` and exit once it's done. Run the container
with the same command and `rails -v` won't give us any error.

Run this command to finish setting up our Rails application:

```bash
rails db:create db:migrate
```

Normally we can just use `rails s` to access our welcome page, but we can't yet
as there is no way we can access it from the host. In order to solve this, we
need to expose a port when we run the container:

```bash
docker run --rm -it \
  -v /local/path/to/blog:/app \
  -v bundle:/bundle \
  -e BUNDLE_PATH=/bundle \
  -p 3000:3000
  blog
```

We also need to start our server using `rails -b 0.0.0.0` as we want it to be
accessible to the host as well. You should be able to see the Welcome page now
when you open [http://localhost:3000/](http://localhost:3000/)

We need to use this line in order to get the `docker run` to run the rails
server automatically without going into the `bash` first anymore:

```bash
ENTRYPONT ["/bin/bash"]
# vs
CMD ["rails", "server", "-b", "0.0.0.0"]
```

I think this [answer](https://stackoverflow.com/a/34245657/113573) explained
about `ENTRYPOINT` vs `CMD` pretty well.

### webpacker

I didn't manage to get this working on the first try due to the lack of
knowledge on how docker and webpacker works. But, you guys are lucky because I
have the summary on how to get it to work.

`./bin/webpack-dev/server` that compiles our asset is serving the files from
the memory, not from our file system. However, it writes to
`public/packs/manifest.json` if it doesn't exist or maybe during the update as
well.

Without a working `webpacker`, you might run into a situation where the `rails
server` is the one doing the compilation which is slow and wrong.

Normally, both of them would run in the same host, but with docker, you are
running them in different containers. So, we need to ensure the webpacker and
web containers can connect with each other.

If we don't specify any network when we run our docker container, it will be
connected to the `bridge` network by default. You can connect to another
container using the IP but not through the container name. To fix this, you
need to create a different network:

```bash
docker network create blog-net # bridge driver by default
```

Once that is done, we need to update our `docker run commands`:

```bash
# for webpacker
docker run --rm -it \
  -v /local/path/to/blog:/app \
  -v bundle:/bundle \
  -e BUNDLE_PATH=/bundle \
  -e WEBPACKER_DEV_SERVER_HOST=0.0.0.0 \
  -p 3035:3035 \ # needed for auto reload page
  --network blog-net \
  --name webpacker \
  blog \
  bin/webpack-dev-server

# for rails
docker run --rm -it \
  -v /local/path/to/blog:/app \
  -v bundle:/bundle \
  -e BUNDLE_PATH=/bundle \
  -e WEBPACKER_DEV_SERVER_HOST=webpacker \
  -p 3000:3000 \
  --network blog-net \
  --name web \
  blog
```

The main reason for these changes is to ensure our `rails` container can access
`webpacker` container. Confused about the network part? I did and this
[tutorial](https://docs.docker.com/network/network-tutorial-standalone/) helped
me a lot.

Basically, the Rails container need to know where it can find the assets, which
is from the `webpacker` host. The webpacker itself need to ensure that the
assets can be accessed by anyone.

### Tips

Some other tips that I discovered:

- `rails` is not in `/bundle` but it is in the original directory which is
`/usr/local/bundle`. I think this is because of the base image. Then, this
raises another question which is how do we upgrade rails themselves?
- We can override the `ENTRYPOINT` with:

    ```bash
    docker run --rm -it blog command-to-override
    ```

- This also means we can use it to run other rails command such as `rails
db:migrate`, `rails g scaffold` and so on.
- If you don't want to kill the container when exiting it, you can use `Ctrl +
P, Ctrl + Q`. After that, you can use `docker attach container-name` to get in
again.

## docker-compose

As we have noticed, the `docker run` command is getting longer. It doesn't make
sense to keep on passing that command to everyone. What about the database?
Webpack? Etc. As the title said, we can use `docker-compose` to improve our
docker experience.

I will talk about it in the next post.

## Reference

- [https://medium.com/tsftech/how-to-fully-utilise-docker-compose-during-development-4b723caed798](https://medium.com/tsftech/how-to-fully-utilise-docker-compose-during-development-4b723caed798)
- [https://medium.com/swlh/docker-caching-introduction-to-docker-layers-84f20c48060a](https://medium.com/swlh/docker-caching-introduction-to-docker-layers-84f20c48060a)
- [https://www.freecodecamp.org/news/painless-rails-development-environment-setup-with-docker/](https://www.freecodecamp.org/news/painless-rails-development-environment-setup-with-docker/)
- [https://www.plymouthsoftware.com/articles/dockerising-webpacker](https://www.plymouthsoftware.com/articles/dockerising-webpacker)
- [https://github.com/rails/webpacker/issues/1019#issuecomment-351066969](https://github.com/rails/webpacker/issues/1019#issuecomment-351066969)
- [https://docs.docker.com/network/network-tutorial-standalone/](https://docs.docker.com/network/network-tutorial-standalone/)
- [https://github.com/rails/webpacker/issues/863#issuecomment-346081995](https://github.com/rails/webpacker/issues/863#issuecomment-346081995)
