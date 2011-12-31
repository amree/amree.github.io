---
layout: post
title: Using Sybase with Ruby on Rails on Linux
meta-description: Configure your Ruby on Rails to work with Sybase on Linux
comments: false
---

# {{ page.title }}

This guide will help you (mostly will help me in the future) to configure your Ruby on Rails to support connection to Sybase using sybase-ctlib in Linux. I wrote this tutorial after everything’s good, so, I might miss a few steps that I’ve forgotten. Feel free to comment about it.

My setup:

* Ruby v1.9.2p180
* Gem v1.8.5
* RVM 1.6.14
* Linux Slackware (32 bit)
* Sybase Adaptive Server Enterprise v15

Files you’ll need:

1. [unixODBC v2.3.0](http://www.unixodbc.org/download.html)
1. [FreeTDS v0.82](http://www.freetds.org/software.html)
1. [Sybase Adaptive Server Enterprise v15](http://www.sybase.com/)
1. [sybase-ctlib v0.2.12](http://raa.ruby-lang.org/project/sybase-ctlib/)

Alright, after you’ve downloaded all the files, let’s start by installing them.

**Install unixODBC**

	$ tar zxvf unixODBC-2.3.0.tar.gz
	$ cd unixODBC-2.3.0
	$ ./configure --prefix=/usr/local/unix-odbc
	$ make
	$ make install

**Install FreeTDS**

	$ tar zxvf freetds-stable.tar.gz
	$ cd freetds-0.8.2
	$ ./configure --prefix=/usr/local/freetds --with-unixodbc=/usr/local/unix-odbc
	$ make
	$ make install

Let’s do some testing with **FreeTDS**.

Edit `/usr/local/freetds/etc/freetds.conf`

{% highlight ini %}

[server]
host = www.server.com
port = 6060
tds version = 5.0

{% endhighlight %}

Run these commands:

	$ cd /usr/local/freetds/bin/
	$ ./tsql -S server -U username -P password
	locale is "C/UTF-8/C/C/C/C"
	locale charset is "UTF-8"Msg 2401, Level 11, State 2, Server SERVER, Line 0Character set conversion is not available between client character set 'utf8' and server character set 'iso_1'.
	
	Msg 2411, Level 10, State 1, Server SERVER, Line 0
	No conversions will be done.
	
	Msg 5704, Level 10, State 2, Server SERVER, Line 0
	Changed client character set setting to '<NULL>'.
	
	1>

That means everything’s good.

Edit `/usr/local/unix-odbc/etc/odbc.ini`:

{% highlight ini %}

[sybase]
Driver      = FreeTDS
Description = Sybase Database with FreeTDS
Trace       = No
Server      = www.server.com
Port        = 6060
TDS Version = 5.0

{% endhighlight %}

Edit `/usr/local/unix-odbc/etc/odbcinst.ini`:

{% highlight ini %}

[FreeTDS]
Description=v0.63 with protocol v8.0
Driver=/usr/local/freetds/lib/libtdsodbc.so
UsageCount=1

{% endhighlight %}

Time for testing, this time, it’s for **unixODBC**.

	$ cd /usr/local/unix-odbc/bin
	$ ./sql sybase username password
	+---------------------------------------+
	| Connected!                            |
	|                                       |
	| sql-statement                         |
	| help [tablename]                      |
	| quit                                  |
	|                                       |
	+---------------------------------------+

Install **Sybase Adaptive Server Enterprise** and export some variables:

{% highlight bash %}

export SYBASE=/opt/sybase
export SYBASE_OCS=/opt/sybase/OCS-15_0/

{% endhighlight %}

Install sybct-ruby

	$ tar zxvf sybct-ruby-0.2.12.tar.gz
	$ cd sybct-ruby-0.2.12
	$ vi extconf.rb

Edit your `extconf.rb`. Mine would look like this. After that, generate `Makefile` and compile it.

	$ ruby extconf.rb
	creating Makefile
	$ make
	gcc -shared -o sybct.so sybct.o -L. -L/home/amree/.rvm/rubies/ruby-1.9.2-p180/lib -Wl,-R/home/amree/.rvm/rubies/ruby-1.9.2-p180/lib -L/opt/sybase/OCS-15_0/lib   -lsybct -lsybcs -lsybtcl -lsybcomn -lsybintl -rdynamic -ldl -lnsl -lm -Wl,-R -Wl,/home/amree/.rvm/rubies/ruby-1.9.2-p180/lib -L/home/amree/.rvm/rubies/ruby-1.9.2-p180/lib -lruby  -lpthread -lrt -ldl -lcrypt -lm   -lc
	$

Everthing looks good. Time for Sybase’s configuration:

Edit `/opt/sybase/interfaces`:

	SERVER
	    master tcp ether www.server.com 6060
	    query tcp ether www.server.com 6060

Please be careful about the file’s whitespace. You can read more about the file settings at [here](http://www.outlands.demon.co.uk/sybase/index.html).

Time for some tests:

	$ cd sample
	$ ruby -I ../ ./sqlsample.rb -S SERVER -U username -P password

Just make sure you got connected, I did get some errors about privileges or something, but in the end I can query just fine. So, if you didn’t get any weird errors as if your Ruby cannot load sybsql, you should now put the necessary files into the correct path so that it can be loaded anywhere you want. To list down all your load path for Ruby, you can use `irb`.

Since the sample ran fine, it’s time to put all the necessary files in your Ruby’s load path.

	$ irb
	ruby-1.9.2-p180 :001 > $LOAD_PATH
	 => #... your load paths here
	ruby-1.9.2-p180 :002 > quit
	$ cp sybct.o sybct.so sybct.rb sybsql.rb /home/amree/.rvm/rubies/ruby-1.9.2-p180/lib/ruby/site_ruby/1.9.1/i686-linux
	$ irb
	ruby-1.9.2-p180 :001 > require "sybsql.rb"
	 => true
	ruby-1.9.2-p180 :002 > query=SybSQL.new( {'S'=>'SERVER', 'U'=>'username', 'P'=>'password'} )
	 => #... some weird things
	ruby-1.9.2-p180 :003 > raise "ERROR: use dbname ..." unless( query.sql_norow("use dbname") )
	 => nil
	ruby-1.9.2-p180 :004 > query.sql("select top 10 * from table")

The last line (query) should ran without any errors. It’s time for your Rails database configuration.

Edit `database.yml`:

	development:
	  adapter: sybase
	  host: SERVER
	  username: username
	  password: password
	  database: dbname

Install **activerecord-sybase-adapter** gem. You need to use this command to make sure there’s no error.

	gem install activerecord-sybase-adapter -s http://gems.rubyonrails.org

Put **activerecord-sybase-adapter** in your `Gemfile`:

	gem 'activerecord-sybase-adapter' 

Use bundler:

	$ bundle install

Everything should be working by now. However, I do notice that you can’t do queries that involve limiting the result. It’s most probably because of the way Sybase’s queries work. For an example, I have to use `table.find_all_by("col")` instead of `table.find_by("col")`.

That’s it folks and good luck! Remember, feel free to comment if you got something to improve or correct this guide :)
