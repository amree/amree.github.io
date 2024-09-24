---
title: Ruby on Rails and Docker for Testing
date: 2022-01-13
tags: [docker, rails]
---

In the previous
[post](https://dev.to/amree/ruby-on-rails-development-using-docker-o1d), we
managed to figure out a way to make our Docker setup work for Development. It’s
time to figure out how we can run our tests with it. In the end, we should be
able to run single and multiple tests. This also includes Capybara tests using
headless Chrome.

We will also look into how to use multiple docker-compose files to override
what we have based on the environment. But we’ll start with something simple
first.

Let us install RSpec first but I will skip this part and refer you guys to this
[guide](https://relishapp.com/rspec/rspec-rails/docs/gettingstarted). However,
we need to update `.rspec` to be:

```
--require rails_helper
```

Without that, we will get an uninitialized constant error.

The first thing we need to do is to prepare the database.

```bash
docker-compose run -e "RAILS_ENV=test" web rails db:create db:migrate
```

That is quite straightforward as we just override the `RAILS_ENV` to `test` and
prepare the database based on that environment. However, I had problems because
I was using `DATABASE_URL` from `docker-compose` and that will override the
database name.

Maybe there are better ways to do this, but this is how I fixed it:

```yaml
# config/database.yml
default: &default
  adapter: postgresql
  encoding: unicode
  username: <%= ENV['DATABASE_USERNAME'] %>
  password: <%= ENV['DATABASE_PASSWORD'] %>
  host: <%= ENV['DATABASE_HOST'] %>
  pool: <%= ENV.fetch("RAILS_MAX_THREADS") { 5 } %>

development:
  <<: *default
  database: blog_development

test:
  <<: *default
  database: blog_test

production:
  <<: *default
  database: app_production
  username: app
  password: <%= ENV['APP_DATABASE_PASSWORD'] %>

# docker-compose.yml
services:
  # ...
    environment:
      - DATABASE_USERNAME=postgres
      - DATABASE_PASSWORD=password
      - DATABASE_HOST=db
```

As you can see, we only provide the username, password and host. We will let
the database name change based on the environment it is being run.

Add a simple spec:

```ruby
# spec/models/post_spec.rb
describe Post, type: :model do
  it "can be created successfully" do
    post = Post.new

    post.save

    expect(post.persisted?).to eql(true)
  end
end
```

We can then run the spec by running:

```bash
docker-compose run --rm -e "RAILS_ENV=test" web bundle exec rspec spec/models/post_spec.rb
```

### Multiple Compose Files

As you can see from the previous guide, we had to override the environment
variable using `-e`. This is ok for one or two variables but it is not scalable
when we have more than that. docker-compose has [extend
feature](https://docs.docker.com/compose/extends/) that would allow us to use a
base compose file and override with another one.

Using the same example from the above, we can create a new docker-compose file:

```yaml
# docker-compose.test.yml
services:
  web:
    environment:
      - RAILS_ENV=test
```

After that, we can run the spec with:

```bash
docker-compose \
  -f docker-compose.yml \
  -f docker-compose.test.yml \
  run --rm web bundle exec rspec spec/models/post_spec.rb
```

This means we can separate different configs depending on the environment. We
just need to a base config and override with the file we specified.

Do remember not to commit the `docker-compose.*.yml` as it might contain
sensitive information. Create a template file such as
`docker-compose.test.template.yml` for others to copy and change accordingly.

Another important note is if we have `docker-compose.override.yml`, we don’t
have to specify `-f` to override the compose config as docker will do that
automatically.

Use `docker-compose config` to see your final config. Use `-f override_file` if
needed. That might be helpful in debugging complex configurations.

### Browser Testing

Add a simple spec for feature testing first:

```ruby
# spec/features/user_creates_post_spec.rb
RSpec.describe "User creates post", type: :system, js: true do
  scenario "successfully" do
    visit posts_path

    expect(page).to have_content("New Post")
  end
end
```

**Headless**

Add these files first:

```ruby
# spec/support/capybara.rb
RSpec.configure do |config|
  config.before :each, type: :system, js: true do
    url = "http://#{ENV['SELENIUM_REMOTE_HOST']}:4444/wd/hub"

    driven_by :selenium, using: :chrome, options: {
      browser: :remote,
      url: url,
      desired_capabilities: :chrome
    }

    Capybara.server_host = `/sbin/ip route|awk '/scope/ { print $9 }'`.strip
    Capybara.server_port = "43447"
    session_server       = Capybara.current_session.server
    Capybara.app_host    = "http://#{session_server.host}:#{session_server.port}"
  end
end
```

```ruby
# docker-compose.test.yml
services:
  web:
    environment:
      - RAILS_ENV=test
      - SELENIUM_REMOTE_HOST=selenium
    depends_on:
      - selenium

  selenium:
    image: selenium/standalone-chrome
```

As you can see, we are going to use a selenium container for the test to run.
The `web` container will access it at port `4444` and we do not need to open it
as they communicated with each other within docker’s network itself. We will
also open Capybara at port `43447`.

**Non-headless**

TBD - This is something that I haven’t been able to figure out. I will
definitely update it once I managed to solve it.

### Parallel Testing

TBD - More on this once I’ve figured the production part.

## References

- [https://www.cloudbees.com/blog/testing-rails-application-docker](https://www.cloudbees.com/blog/testing-rails-application-docker)
- [https://docs.docker.com/compose/extends/](https://docs.docker.com/compose/extends/)
