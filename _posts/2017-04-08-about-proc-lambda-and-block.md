---
layout: post
title: About Proc, Lambda and Block
meta-description: About Proc, Lambda and Block
---

I keep on searching for this topic, so I guess it's time I put it on my blog.


This is an example of a `proc`:

```ruby
the_proc = proc { puts "I'm the proc" }
```

To execute `the_proc`, I need to explicityly to use:

```ruby
the_proc.call # or
the_proc.() # introduced in Ruby 1.9 or
the_proc[]
```

You can create a lambda using this syntax:

```ruby
the_lambda = lambda { puts "I'm the lambda" }
the_lambda = lambda { |s| puts "I'm the lambda" }
the_lambda = -> { puts "I'm the lambda" } # introduced in Ruby 1.9
the_lambda = -> (x, y) { puts "I'm the lambda" }
```

Just like with `proc` you can execute it using one of these three methods:

```ruby
the_lambda.call # or
the_lambda.() # or
the_lambda[]
```

Differences between `lambda` and `proc`:
* `lambda` will raise an error if argument wasn't provided during the call (if
  there's any argument defined in the declaration). `proc` will just silently
set it to nil for this situation.
* For `proc`, if there's a `return` defined, it'll return from the enclosing
  method. But for `lambda`, it will just return from the `lambda` itself.

```ruby
the_proc = proc { puts "proc"; return }
the_lambda = -> { puts "lambda"; return }

def test(arg)
  puts "first"
  arg.call
  puts "second"
end

test(the_proc)

# first
# proc
# LocalJumpError: unexpected return

test(the_lambda)

# first
# lambda
# second
```

So, what is block in Ruby? Using the above example of `proc`, a block is
actually the piece of code that sits between those two curly braces, in this
case that would be: `puts "proc"; return`.

The only way to get access to the block is through the proc or lambda as block
is not an object.

A basic example of block usage would be:

```ruby
def output
  puts "start"
  yield
  puts "end"
end

output { puts "amree" }
```

As you can see from the example, we actually don't have direct access to the
block. In order to get access to that block, we need to wrap it in `proc` and
this how you do it:

```ruby
def output(&block)
  # ...
end
```

You can use `block.call` or just use the `yield` keyword to execute the block.
The biggest benefit of this approach is that we can control in which context
it's being executed. This is very useful in building DSL.

For e.g, let's take a look at a simple DSL (that looks like Rails router):

```ruby
class Router
  def initialize
    @routes = {}
  end

  def match(route)
    @routes.update route
  end

  def routes(&block) # block will be converted into a Proc
    # block.call
    # This will be called in the root context which will throw an error as
    # routes method is defined in Router, not outside.

    # instance_eval { @routes }
    # It is expecting a block

    instance_eval(&block)
    # Will convert it to a block when it's being used on method call

    puts @routes
  end
end

Router.new.routes do
  match "/users" => "users#index"
  # Ruby will automatically convert it to hash because it's the last parameter.
  # Basically, it's the same as:
  # match({ "/users" => "users#index" })

  match "/login" => "sessions#new"
end
```
