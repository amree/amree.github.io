---
title: Speed Up Ruby on Rails Development Environment
date: 2021-05-09
tags: [ruby]
---

There will be a time when your Rails development environment started to become
very slow due to multiple reasons, but mostly because your codebase is very big
and the monolith architecture is just too sweet for you to pass on.

<!--more-->

An example of this is you have to wait like 10 seconds (or worse) when you
change something in your Rails code and hit that refresh button. Normally,
starting Rails console/server also can be affected.

What works for me might not work for you, but it should help you to get started.
BTW, I'm optimizing 7 years old codebase. So here are some tips for speed
improvements.

Get a baseline first on how slow it is so that you know you are actually
improving it instead of just using your feeling:

```bash
time bundle exec rake environment
```

This should show you the load time without spring. Any changes we make should
make the numbers better than before.  Alright, now we need to identify what's
causing the slowness. We can use
[https://github.com/nevir/Bumbler](https://github.com/nevir/Bumbler) gem for
this. Just run this command first:

```bash
bumbler
```

It will show you gems that are taking time to be loaded/require.


But what can you do with that output? Start from the bottom and see if you put
your gem in the right development. You don't have to put your server monitoring
gem in the development environment, right?

You can also do `require: false` in your Gemfile for certain gems that are being
used rarely, but you need to `require` it manually when you want to use it.

Use your judgment wisely. Check out how
[https://github.com/discourse/discourse/blob/master/Gemfile](https://github.com/discourse/discourse/blob/master/Gemfile)
is doing it

Next, run:

```bash
bumbler --initializers
```

This will show you the load time of initializers.

In my case, it was the routes (we have thousands of routes due to our support of
multiple languages). So, reducing the routes will help but we can't remove the
routes, it's one of our best features.

Since you won't always be using ALL of them in the development, so you can do
this:

```ruby
config.i8n.available_locales = [:en] if ENV.fetch("MIN_LOCALE", "0") == "1"
```

What does it do? By default, it will use all of the languages except when you
have that `MIN_LOCALE` environment variable which you would only put in your
local development.

Another place to check would be your Admin routes. Again, you are not accessing
your Admin routes all the time, so, you can use the same trick in your
`routes.rb`. Try optimizing your codebase based on what bumbler told you.

One last tip would be to do some cleanup on your gems. Remove gems that are not
being used. Sometimes we just forgot that we don't need it anymore.

That's it, folks. Here is my result from this exercise:

- Reduce slow requires by 41%
- Reduce Initialize require by 72%
- Reduce the number of routes by 91%
- Reduce rake time by 55%

Thanks for reading
