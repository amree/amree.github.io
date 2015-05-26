---
layout: post
title: Using Sybase with Ruby on Rails on Linux
meta-description: Configure your Ruby on Rails to work with Sybase on Linux
comments: false
---

# {{ page.title }}

	Updated: 22 May 2012

This guide will help you (mostly will help me in the future) to configure your Ruby on Rails to support connection to Sybase. I wrote this tutorial after everything’s good, so, I might miss a few steps that I’ve forgotten. Feel free to comment about it. With some adjustments, this guide **will also works with Mac OS X**.

1. Install FreeTDS. For Slackware users, you can get Slackbuild script at [http://slackbuilds.org/repository/13.37/development/freetds/](http://slackbuilds.org/repository/13.37/development/freetds/)

2. Edit `/etc/freetds/freetds.conf` and put your database configurations in it:

		[myserver]
			host = myserver.com
			port = 5000
			tds version = 5.0

3. Test the configuration, you should get something like this:

		$ tsql -S myserver -U username
		
		locale is "C"
		locale charset is "ANSI_X3.4-1968"
		using default charset "ISO-8859-1"
		Msg 5704 (severity 10, state 1) from ???:
			"Changed client character set setting to 'iso_1'.
		"
		1> 

4. Put this gems in your `Gemfile` and run `bundle`:

		gem 'arel-sybase-visitor', :git => 'https://github.com/ifad/arel-sybase-visitor'
		gem 'activerecord-sybase-adapter', :git => "https://github.com/ifad/activerecord-sybase-adapter"

5. An example configuration for your `database.yml`

		development:
		  adapter: sybase
		  dataserver: myserver
		  username: 
		  password: 
		  database: 
		  
6. You can try some query using your `rails console` to make sure everything works fine.

7. If you're trying to connect from your `irb` directly without using ActiveRecord you may want to put additional parameters. This works for me:

		client = TinyTds::Client.new(
					:username => '', 
					:password => '', 
					:dataserver => 'myserver',  
					:tds_version => '100', 
					:encoding => 'iso_1') 
