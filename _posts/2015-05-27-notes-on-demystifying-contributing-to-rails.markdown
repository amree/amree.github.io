---
layout: post
title: Notes on Demystifying Contributing to Rails
meta-description: My notes on Breaking Down the Barrier - Demystifying Contributing to Rails by Eileen Uchitelle from RailsConf 2015
comments: true
---

#{{ page.title }}

This is my notes for presentation by [Eileen Uchitelle](https://twitter.com/eileencodes) from RailsConf 2015. You can find the video at [Confreaks](http://confreaks.tv/videos/railsconf2015-breaking-down-the-barrier-demystifying-contributing-to-rails). The slide can be found at [Speaker Deck](https://speakerdeck.com/eileencodes/breaking-down-the-barrier-demystifying-contributing-to-rails).

This presentation is more about how to get yourself ready to contribute to Rails at GitHub.

These are the required environments:

- Ruby version manager (rbenv, rvm, chruby)
- Ruby 2.2.2 (Rails 5 is using 2.2.2)
- Databases for Active Record (MySQL, PostgreSQL, SQLite3)
- Git and GitHub account

You don't need MySQL and PostgreSQL since SQLite3 will be used by default. But if you want to test certain feature spesific to the database, you need to install them. If you do need them, you can setup the necessary databases and users using the following guide (taken from Eileen's blog[1]).

### MySQL

Create the user:

    mysql> CREATE USER 'rails'@'localhost';
    mysql> GRANT ALL PRIVILEGES ON activerecord_unittest.*
           to 'rails'@'localhost';
    mysql> GRANT ALL PRIVILEGES ON activerecord_unittest2.*
           to 'rails'@'localhost';
    mysql> GRANT ALL PRIVILEGES ON inexistent_activerecord_unittest.*
           to 'rails'@'localhost';

Create the database:

    $ cd activerecord
    $ bundle exec rake db:mysql:build

### PostgreSQL

For Linux:

    sudo -u postgres createuser --superuser $USER

For OS X:

    createuser --superuser $USER

Create the database:

    $ cd activerecord
    $ bundle exec rake db:postgresql:build

To start over:

    $ cd activerecord
    $ bundle exec rake db:drop

## Running the tests

You shouldn't be running the tests from Rails main source directory. Instead, you should go to the individual directory and run the command from there. A full suite of Rails test might take a long time. For an example:

    $ cd actionpack
    $ rake test

For Active Record, you can run the test by specifying the adapter:

    $ cd activerecord
    $ rake test:sqlite3
    $ rake test:mysql2
    $ rake test:mysql
    $ rake test:postgresql

Run a test file:

    ruby -Ilib:test path/to/test_file.rb

Run a single test:

    ruby -Ilib:test path/to/test_file.rb -n test_name_of_test

For Active Record, SQLite3 will be used by default. So, if you want to change the adapter (for e.g MySQL), use this command:

    ARCONN=mysql2 ruby -Ilib:test path/to/test_file.rb -n test_name_of_test

Run single test will all adapters:

    bundle exec rake TEST=path/to/test_file.rb -n test_name

## Opening issue

When opening an issue, make sure include a test script too (which can be found [here](http://github.com/rails/rails/blob/master/guides/bug_report_templates)).

If you're sending a performance related pull request, use Benchmark/IPS. For an example:

    # Source: github.com/eileencodes/railsconf_scripts.git
    # Run it with: bundle exec ruby benchmark_ips_example.rb

    require 'benchmark/ips'
    ARRAY = (1..100).to_a
    def slow
      ARRAY.shuffle.first
    end
    def fast
      ARRAY.sample
    end
    Benchmark.ips do |x|
      x.report('slow') { slow }
      x.report('fast') { fast }
      x.compare!
    end

## Traversing unfamiliar code

### Use Source Location

Defined in `actionview/lib/action_view/template/error.rb`:

    def source_location
      if line_number
        "on line ##{line_number} of "
      else
        'in '
      end + file_name
    end

For an example, if we want to trace the `delete_all` method:

    class BugTest < Minitest::Test
      def test_delete_all
        post = Post.create!(title: "Post title", content: "Lots of content")
        comment = Comment.create!(content: "I am a comment", post_id: post.id)
        assert 1, post.comments.count
        post.comments.delete_all
        assert 0, post.comments.count
      end
    end

Replace that line of codes with:

    puts post.comments.method(:delete_all).source_location

Example of the output:

    (0.0ms) begin transaction
    SQL (0.1ms) INSERT INTO "comments" ("content", "post_id") VALUES (?, ?) [["content", "I am a comment"], ["post_id", 1]]
    (0.0ms) commit transaction
    (0.1ms) SELECT COUNT(*) FROM "comments" WHERE "comments"."post_id" = ? [["post_id", 1]]
    ../activerecord/lib/active_record/associations/ collection_proxy.rb 442
    (0.0ms) SELECT COUNT(*) FROM "comments" WHERE "comments"."post_id" = ? [["post_id", 1]] 

### Use Ctags

You can continue using source location, but you may want to use ctags:

    $ cd path/to/rails/
    $ ctags -R -f .git/tags .

Config for your `.vimrc`:

    map <Leader>rt :!ctags --tag-relative --extra=+f -Rf .git/tags --exclude=.git,pkg —languages=- javascript,sql<CR><CR>

    # Based on the previous shell command
    set tags+=.git/tags

To find method definition with vim, use `CTRL + ]` when the cursor is on that particular method. Use `:ts` to find similar methods in other files.

### Use Caller

To find out who's calling a method, we can use a Ruby method defined by Kernel module that will output the stack trace at the point the method is executed and it won't stop your code. For an example:

    class Project < ActiveRecord::Base
      after_create :call_me

      def call_me
        puts caller
        puts "======== i am a callback ========"
      end
    end

Output example:

    .../activesupport/lib/active_support/callbacks.rb:428:in `block in make_lambda'
    .../activesupport/lib/active_support/callbacks.rb:229:in `call'
    .../activesupport/lib/active_support/callbacks.rb:229:in `block in halting_and_conditional'
    .../activesupport/lib/active_support/callbacks.rb:502:in `call'
    .../activesupport/lib/active_support/callbacks.rb:502:in `block in call'
    .../activesupport/lib/active_support/callbacks.rb:502:in `each'
    .../activesupport/lib/active_support/callbacks.rb:502:in `call'
    .../activesupport/lib/active_support/callbacks.rb:90:in `run_callbacks'
    .../activerecord/lib/active_record/callbacks.rb:305:in `_create_record'
    .../activerecord/lib/active_record/timestamp.rb:57:in `_create_record'
    .../activerecord/lib/active_record/persistence.rb:506:in `create_or_update'
    .../activerecord/lib/active_record/callbacks.rb:301:in `block in create_or_update'
    .../activesupport/lib/active_support/callbacks.rb:86:in `run_callbacks'
    .../activerecord/lib/active_record/callbacks.rb:301:in `create_or_update'
    .../activerecord/lib/active_record/persistence.rb:151:in `save!' 

Notice the first line of the output:

    .../activesupport/lib/active_support/callbacks.rb:428:in `block in make_lambda'

### Use Tracepoint

Above methods won't work with dynamic method. For this purpose, we can use [Tracepoint](http://ruby-doc.org/core-2.0.0/TracePoint.html). For an example:

    def test_trace_point
      user = User.new(name: "My Name")

      # 1
      tp = Tracepoint.new(:call) do |*args|
        p args
      end

      tp.enable # 2
      user.avatar_attributes = { name: "I am a file name" }
      tp.disable # 3

      user.save!
    end

The output will be very long but we only care the top line which may look like this:

    `avatar_attributes='@.../activerecord/lib/active_record/ nested_attributes.rb:347

## Git

1. Fork the Rails source code from the [GitHub](https://github.com/rails/rails)
2. Checkout the fork into your workstation

Then Use these commands to add the original repo into your copy:

    $ cd path/to/rails/
    $ git remote add upstream https://github.com/rails/rails.git

    # Get changes from Rails master from GitHub
    # and push the update to our repo
    $ git pull --rebase upstream master
    $ git push origin master

### Git Bisect

Helpful in identifying when the regression is introduced in the code. It takes two points, good and bad. Both are subjective but bad point can means when the code added and the behaviour changed. Just make sure you keep it seperated in your head (more like behaviour exists and behaviour doesn't exist).

Since Rails tag every releases, it's easier to start by checking out the tag and see if the bug exists or not.

For an example, we want to find where Eileen added documentation about `git bisect` into the README. This is based on [RailsConf Script](https://github.com/eileencodes/railsconf_scripts):

    $ git checkout practising-git
    $ git bisect start
    $ git bisect bad
    $ git bisect good master
    $ cat README.md
    $ git bisect good
    $ cat README.md
    $ git bisect bad
    $ cat README.md
    $ git bisect bad

This will show the `git commit` that introduces the bisect documentations:

    967e214ab9813767871773a90269b97f68207e5d is the first bad commit
    commit 967e214ab9813767871773a90269b97f68207e5d
    Author: eileencodes <eileencodes@gmail.com>
    Date:   Fri Apr 10 09:53:37 2015 -0400

        Add section about bisecting

        This is the commit we want to find when we practice bisecting.

    :100644 100644 da91fa431505406e9c354e5b232036823f6ee781 50ba68331d55df483f334c1ea767d18f17eab18f M      README.md

Use `git show` for more info on the commit:

    $ git show 967e214ab9813767871773a90269b97f68207e5d

    commit 967e214ab9813767871773a90269b97f68207e5d
    Author: eileencodes <eileencodes@gmail.com>
    Date:   Fri Apr 10 09:53:37 2015 -0400

        Add section about bisecting

        This is the commit we want to find when we practice bisecting.

    diff --git a/README.md b/README.md
    index da91fa4..50ba683 100644
    --- a/README.md
    +++ b/README.md
    @@ -66,3 +66,12 @@ lab on contributing to Rails. Please see that branch for git the git commands.
     #### Reflog

     `git reflog`
    +
    +### Using Git to Find Where Code was Introduced
    +
    +#### Bisect
    +
    +`git bisect start`
    +`git bisect bad`
    +`git bisect good ref`
    +`git bisect reset`

For Rails source codes, you can use the test scripts to check if the bug exists or not.

### Amending Commits

Change last commit message:

    git commit --amend

Undo amend commit:

    git reset --soft HEAD@{1}

Undo commits, changes are staged, but no longer commited:

    git reset --soft HEAD~N

To unstage those changes:

    git reset HEAD

Reset the current branch to the original state and discard any changes:

    git reset --hard origin/practicing-git

For modifying previous commit messages, squash and others, we can use:

    git rebase -i master

We might get something like this:

    pick b7b78d1 Add README headings
    pick 059743f Fix title for undoing things in git
    pick 026e843 Add commands to each section
    pick 967e214 Add section about bisecting
    pick bc23d29 Add missing sections
    pick f644446 Fix spacing on bisect commands

    # Rebase 8c381e5..f644446 onto 8c381e5
    #
    # Commands:
    #  p, pick = use commit
    #  r, reword = use commit, but edit the commit message
    #  e, edit = use commit, but stop for amending
    #  s, squash = use commit, but meld into previous commit
    #  f, fixup = like "squash", but discard this commit's log message
    #  x, exec = run command (the rest of the line) using shell
    #
    # These lines can be re-ordered; they are executed from top to bottom.
    #
    # If you remove a line here THAT COMMIT WILL BE LOST.
    #
    # However, if you remove everything, the rebase will be aborted.
    #
    # Note that empty commits are commented out

Change the word `pick` to other things such as `squash` for squashing commits and edit for amending commit message.

It's OK to force push into your own branch. In fact it's recommended to force push instead of opening another pull request. To force push, use:

    git push -f origin your-branch

Git keeps track of updates to the tip of branches using a mechanism called reflog. This allows you to go back to changesets even though they are not referenced by any branch or tag. After rewriting history, the reflog contains information about the old state of branches and allows you to go back to that state if necessary [2].

An example of `git reflog` output:

    f644446 HEAD@{0}: rebase: aborting
    8c381e5 HEAD@{1}: rebase -i (start): checkout master
    f644446 HEAD@{2}: reset: moving to origin/practicing-git
    91979dc HEAD@{3}: rebase -i (finish): returning to refs/heads/practicing-git
    91979dc HEAD@{4}: rebase -i (start): checkout master
    91979dc HEAD@{5}: rebase -i (finish): returning to refs/heads/practicing-git
    91979dc HEAD@{6}: rebase -i (squash): Add README headings
    ab7a378 HEAD@{7}: rebase -i (squash): # This is a combination of 5 commits.
    04bb631 HEAD@{8}: rebase -i (squash): # This is a combination of 4 commits.
    4fc54ed HEAD@{9}: rebase -i (squash): # This is a combination of 3 commits.
    410319c HEAD@{10}: rebase -i (squash): # This is a combination of 2 commits.
    f521dd3 HEAD@{11}: rebase -i (start): checkout master
    c6f43a6 HEAD@{12}: rebase -i (finish): returning to refs/heads/practicing-git
    c6f43a6 HEAD@{13}: commit (amend): Fix spacing on bisect commands

I guess that's it. Thanks for reading :)

## References

1. [http://www.eileencodes.com/posts/getting-your-local-environment-setup-to-contribute-to-rails](http://www.eileencodes.com/posts/getting-your-local-environment-setup-to-contribute-to-rails)
2. [https://www.atlassian.com/git/tutorials/rewriting-history/git-reflog](https://www.atlassian.com/git/tutorials/rewriting-history/git-reflog)

