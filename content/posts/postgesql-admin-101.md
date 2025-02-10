---
title: PostgreSQL Admin 101
date: 2025-01-01
tags: [postgresql]
readingTime: true
toc: true
---

PostgreSQL has always been one of my daily tools that gets the least attention,
yet somehow it manages to consume a lot of my time due to my lack of proper
understanding of how it works behind the scenes.

I decided to improve this situation by learning PostgreSQL from the perspective
of an admin in 2025. This post was originally written on X, but I decided to
move it to a blog since it was becoming troublesome to search and keep track of
what I had written. I've bookmarked all the original threads in this
[gist](https://gist.github.com/amree/e0b2e0d8ea6c78dadb837fbbf83d19f3).

This post is expected to be quite long since it combines multiple posts written
over several months. Alright, let's get into it.

## Terminologies

WIP

## Installation

I think it would be a lot easier if we use Docker as we can keep on resetting the configuration if we need to throughout the entire learning experience.

Rather than using [Docker Desktop](https://www.docker.com/products/docker-desktop/), I have been using [OrbStack](https://orbstack.dev/) for a while. I can’t really explain the difference but it feels a lot faster for me. Feel free to check them out if you want to, but to be clear, we are not really using the GUI. We will mostly be using CLI, like a real admin™

I am not going through the Docker basic, but the first thing we need to know is the name of the Docker image. For our case, it is [postgres](https://hub.docker.com/_/postgres). Let’s run the docker for the first time with:

```
docker run --name lab-pg17 -d postgres
```

FYI, `-d` means we will run it in detached mode and `postgres` is the image name from Docker Hub. Once that is done, we should be able to see the list of running containers with:

```
$ docker ps -a

CONTAINER ID   IMAGE                           COMMAND                  CREATED          STATUS                      PORTS     NAMES
b5eddafd7495   postgres                        "docker-entrypoint.s…"   34 seconds ago   Exited (1) 34 seconds ago             lab-pg-17
```

Howeer, we can see the `STATUS` is `Exited`. So, something went wrong. We should be able to read the logs with:

```
$ docker logs lab-pg17

Error: Database is uninitialized and superuser password is not specified.
       You must specify POSTGRES_PASSWORD to a non-empty value for the
       superuser. For example, "-e POSTGRES_PASSWORD=password" on "docker run".

       You may also use "POSTGRES_HOST_AUTH_METHOD=trust" to allow all
       connections without a password. This is *not* recommended.

       See PostgreSQL documentation about "trust":
       https://www.postgresql.org/docs/current/auth-trust.html
```

Ah, so, we need to specify certain variables in order to successfully run the image. Let’s run it again with:

```
$ docker run --name lab-pg17 -e POSTGRES_PASSWORD=secret -d postgres

docker: Error response from daemon: Conflict. The container name "/lab-pg17" is already in use by container "38bd2cc8fa95bae20d389a995b0c715696cd2bc961fafcd3752f0f9fd528361e". You have to remove (or rename) that container to be able to reuse that name.
```

Now, we are getting a different error as we are using the same failed container as before. We can just remove the previous container and run the same command again:

```
$ docker rm lab-pg17
$ docker run --name lab-pg17 -e POSTGRES_PASSWORD=secret -d postgres
$ docker ps

CONTAINER ID   IMAGE                           COMMAND                  CREATED          STATUS          PORTS      NAMES
35fcdbff0032   postgres                        "docker-entrypoint.s…"   20 seconds ago   Up 20 seconds   5432/tcp   lab-pg17
```

As usual, we will verify the status of the container with `docker ps` and we shouldn’t be seeing the `Exited` status anymore. Then, we can connect to the our new PostgreSQL with:

```
$ docker exec -it lab-pg17 psql -U postgres

psql (17.2 (Debian 17.2-1.pgdg120+1))
Type "help" for help.

postgres=#
```

We should end up in the PostgreSQL prompt.

For those who is familiar with Docker, you shoud realize by now that we didn’t specify a volume, which means, it’s a little bit tricky for us to figure out where we can access the files used for the database in our local. It’ll be easier if it’s available for us to view or edit without going into the container. One way to achieve this is by specifying where our volume is so that the volume will be mounted. We can do it with:

```bash
$ mkdir learn-postgresql
$ docker rm -rf lab-pg17
$ docker run --name lab-pg17 \
  -v ./data0:/var/lib/postgresql/data \
  -e POSTGRES_PASSWORD=secret \
  -d postgres
```

We should be able to see `data0` in the current directory which is being used as the configuration for our PostgreSQL. Feel free to use a different name other than `data0` if you want to.

```
$ tree -L 1 data0
data0
├── PG_VERSION
├── base
...
├── postgresql.auto.conf
├── postgresql.conf
├── postmaster.opts
└── postmaster.pid
```

Since we are already in the Docker topic, we should know that we can’t customize the image. For an example, I would like to use `ps` to list all running processes inside the docker itself. However, the command won’t be available as the image that we are using was not installed with the right package.

We can utilize `Dockerfile` In order to ensure we will always have a basic set of command lines that we can use in the future. Create a `Dockerfile` and put these code:

```dockerfile
FROM postgres:17.2
RUN apt-get update && apt-get install -y procps
```

What it would do is use `postgres:17.2` as the base image and then install the other packages that we set in Line 2. Then, we can create our custom image:

```bash
docker build -t lab-pg17 .
```

That means we have a custom image available for us to use. Let’s create a new container based on that image:

```bash
$ docker rm -f lab-pg17
$ docker run --name lab-pg17 \
  -v ./data0:/var/lib/postgresql/data \
  -e POSTGRES_PASSWORD=secret \
  -d lab-pg17
```

Let’s get inside the container to verify the `ps` command is working as expected:

```bash
$ docker exec -it lab-pg17 bash
root@3cc9f4f39c20:/# ps
    PID TTY          TIME CMD
     34 pts/0    00:00:00 bash
     40 pts/0    00:00:00 ps
root@3cc9f4f39c20:/#
```

As you can see, we just created `lab-pg17` container from `lab-pg17` image instead of the original `postgres` image.
## Basic Configuration

### pg_hba.conf

WIP

## Replication

Intro WIP

### Setting up Replication


