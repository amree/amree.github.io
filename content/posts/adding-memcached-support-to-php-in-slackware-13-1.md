---
title: Adding memcached support to PHP in Slackware 13.1
date: 2010-10-09
tags: [php, slackware]
---

I just started learning Zend Framework and in one of the tutorials I read, I
need to enable memcached in my PHP which is not available by default.

<!--more-->

1. Install [libevent](http://slackbuilds.org/repository/13.1/libraries/libevent/).

1. Install [memcached](http://slackbuilds.org/repository/13.1/network/memcached/).

1. Install [libmemcached](http://slackbuilds.org/repository/13.1/libraries/libmemcached/).

1. Install memcache.

    ```bash
    wget http://pecl.php.net/get/memcache-2.2.6.tgz
    tar -zxvf memcache-2.2.6.tgz
    cd memcache-2.2.6
    phpize && ./configure --enable-memcache && make
    cp modules/memcache.so /usr/lib/php/extensions/
    ```

1. Load the module using .ini files in /etc/php

    ```bash
    touch /etc/php/memcached.ini
    echo 'extension=memcache.so' > /etc/php/memcached.ini
    ```

1. Run memcached as a daemon (d = daemon, m = memory, u = user, l = IP to listen to, p = port).

    ```bash
    memcached -d -m 1024 -u root -l 127.0.0.1 -p 11211
    ```

1. Put this file in your web directory and run it. It should be rendered without any error.

    ```php
    <?php
    $memcache = new Memcache;
    $memcache->connect('localhost', 11211) or die ("Could not connect");

    $version = $memcache->getVersion();
    echo "Server's version: ".$version."<br/>\n";

    $tmp_object = new stdClass;
    $tmp_object->str_attr = 'test';
    $tmp_object->int_attr = 123;

    $memcache->set('key', $tmp_object, false, 10) or die ("Failed to save data at the server");
    echo "Store data in the cache (data will expire in 10 seconds)<br/>\n";

    $get_result = $memcache->get('key');
    echo "Data from the cache:<br/>\n";

    var_dump($get_result);
    ?>
    ```

References:

* [http://my2.php.net/manual/en/memcache.installation.php](http://my2.php.net/manual/en/memcache.installation.php)
* [http://stackoverflow.com/questions/1442411/using-memcache-vs-memcached-with-php](http://stackoverflow.com/questions/1442411/using-memcache-vs-memcached-with-php)
