---
title: How Bcrypt Compares Password
date: 2019-01-19
tags: [ruby]
---

I've always wondered about this.

<!--more-->

Creating password in database:

```ruby
> password = 'secret'
> encrypted_password_in_database = BCrypt::Password.create(password)
```

Comparing password:

```ruby
> BCrypt::Password.new(encrypted_password_in_database) == 'secret'
=> true
```

`==` is actually a method defined in [bcrypt-ruby](https://www.rubydoc.info/github/codahale/bcrypt-ruby/BCrypt%2FPassword:==)

Devise is comparing it using something like constant-time secure comparison but
bcrypt-ruby project decided not to go with that. Read more about it here:
- https://github.com/codahale/bcrypt-ruby/issues/42
- https://github.com/codahale/bcrypt-ruby/pull/43
- https://github.com/codahale/bcrypt-ruby/pull/119
