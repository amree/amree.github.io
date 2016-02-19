---
layout: post
title: Getting Started with Rails on Windows
meta-description: Running your first Rails app on Windows
---

# {{ page.title }}

First of all, let's get one thing straight. This is not a guide for those who are trying their best to not use Unix like environment in develop Rails application. This is more like a guide to do almost everything in Linux without replacing your Windows.

So, I need to teach my colleagues in the next two weeks on Ruby on Rails introductionary class. Since all of the computer labs are installed with Windows 7, I had to find a way to ensure a proper working environment for the students, hence, this article.

## Installation

After researching for a while, I decided to go with [Vagrant](http://vagrantup.com).

1. First of all, install [Oracle VM VirtualBox](http://virtualbox.org). Vagrant will depend on it.

2. Next, you need to install [Git](http://git-scm.com) for Windows. We actually just need `ssh` executable in the Git package. After comparing available options, I think it is the easiest way. Besides, we'll now have Git enabled in our Windows. By the way, make sure you'll select the third option (the one with with the warning) during Adjusting your PATH environment section.

3. Download [Vagrant](http://downloads.vagrantup.com) and install it.

## Vagrant Setup

Create a working directory (use Windows prompt):

    $ mkdir rails
    $ cd rails

Initiate Vagrant:

    $ vagrant init

Install a Debian box:

    $ vagrant box add debian https://dl.dropboxusercontent.com/u/197673519/debian-7.2.0.box

You can select other box if you want to, but for this guide, I'll be using a Debian based box. There are a lot more in the [Wiki](https://github.com/mitchellh/vagrant/wiki/Available-Vagrant-Boxes).

Open `Vagrantfile` and make sure you put these lines:

    Vagrant.configure("2") do |config|
      # Specify our box's name
      config.vm.box = "debian"

      # Forward Rails default server port
      config.vm.network :forwarded_port, guest: 3000, host: 3000
    end

Boot the box:

    $ vagrant up

SSH into it to start working in the box:

    $ vagrant ssh

## Box Setup

We're going to setup the box for Rails development which includes MySQL as the database.

Install required packages (when asked about the password, leave it empty):

    $ sudo su
    $ apt-get install build-essential mysql-server mysql-client libmysqlclient-dev

Create a file at `/etc/gemrc` and add this line:

    $ gem: --no-ri --no-rdoc

Install all of the necessary gems:

    $ gem install rails
    $ gem install therubyracer

## Create a Rails Application

Make sure we're in `/vagrant/` directory. Anything done here will reflect back the directory in the Windows.

    $ cd /vagrant/

Generate the Rails application:

    $ rails new myapp --database=mysql

Specify a `javascript runtime`:

    $ cd myapp
    $ nano Gemfile

Uncomment this line:

    gem 'therubyracer', platforms: :ruby

Run this command:

    $ bundle

Create the database based on the default configuration:

    $ rake db:create

Run the app:

    $ rails s

Open it using this URL: [http://localhost:3000](http://localhost:3000).

## Rails Development

If you haven't noticed, you should see that everything that was changed in `/vagrant` will reflect your `rails` directory in Windows. This means, you can just use your favourite editor to load that particular directory and start coding. It's as if you're doing development directly in the server. For everything else, make sure you'll do it through Putty or through `vagrant ssh`.

I guess that's it. Good luck !
