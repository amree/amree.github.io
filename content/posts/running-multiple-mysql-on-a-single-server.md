---
title: Running Multiple MySQL on a Single Server
date: 2011-03-15
tags: [linux, mysql]
---

I’m pretty sure I’m going to forget these steps, so, just to be safe, I’m
putting it here. I’m dividing this tutorial into two sections, one for default
MySQL that comes from Slackware and the other one is for new MySQL.

<!--more-->

## Using the Default MySQL

We need to create separate (different from the default) directory for the data
to be stored. I’m going to create a new one for it. I’m going to name the
directory as `mysql-1`. Make sure you use full path when running
`mysql_install_db`.

```bash
cd /var/lib
mkdir mysql-1
chown -R mysql.mysql mysql-1
mysql_install_db --datadir=/var/lib/mysql-1 --user=mysql
```

We also need a new configuration file so that it won’t clash with the default
MySQL.

```bash
cp /etc/my-small.cnf /etc/my-1.cnf
nano /etc/my-1.cnf
```

These are the settings that I’ve changed from the default file (other settings
remain unchanged).

```ini
[client]
port = 3307
socket = /var/run/mysql/mysql-1.sock

[mysqld]
port = 3307
socket = /var/run/mysql/mysql-1.sock
server-id = 10

innodb_data_home_dir = /var/lib/mysql-1/
innodb_log_group_home_dir = /var/lib/mysql-1/
```

To run our newly configured MySQL instance, use this command:

```bash
/usr/bin/mysqld_safe --defaults-file=/etc/my-1.cnf --datadir=/var/lib/mysql-1 &
```

By checking background process, you should see something like this

```bash
$ ps ax | grep mysql

23416 pts/1    S      0:00 /bin/sh /usr/bin/mysqld_safe --defaults-file=/etc/my-1.cnf --datadir=/var/lib/mysql-1
23515 pts/1    Sl     0:00 /usr/libexec/mysqld --defaults-file=/etc/my-1.cnf --basedir=/usr --datadir=/var/lib/mysql-1 --user=mysql --log-error=/var/lib/mysql-1/eebox.err --pid-file=/var/lib/mysql-1/eebox.pid --socket=/var/run/mysql/mysql-1.sock --port=3307
```

Time for some test, we need to make sure we’re connecting to the correct server. One way to do this is by checking the `server_id`.

```bash
$ mysql -u root -h 127.0.0.1 -P 3307
mysql> SHOW VARIABLES LIKE "server_id";
+---------------+-------+
| Variable_name | Value |
+---------------+-------+
| server_id     | 10    |
+---------------+-------+
1 row in set (0.00 sec)
```

As you can see, we have the same server_id as we specified in our my-1.cnf. You can use this command to shut it down.

```bash
mysqladmin -h 127.0.0.1 -P 3307 shutdown
```

## Using new Downloaded MySQL

Download [MySQL Download](http://dev.mysql.com/downloads/) > MySQL Community Server > Linux Generic > Linux – Generic 2.6 (x86, 32-bit), Compressed TAR Archive

```bash
cp mysql-5.5.9-linux2.6-i686.tar.gz /opt
cd opt
tar zxvf mysql-5.5.9-linux2.6-i686.tar.gz
mv mysql-5.5.9-linux2.6-i686 mysql
cd mysql
chown -R mysql.mysql .
./scripts/mysql_install_db --user=mysql
cp support-files/my-small.cnf /etc/my-2.cnf
nano /etc/my-2.cnf
```

/etc/my-2.cnf

```ini
[client]
port = 3308
socket = /var/run/mysql/mysql-2.sock

[mysqld]
port = 3308
socket = /var/run/mysql/mysql-2.sock
server-id = 20

innodb_data_home_dir = /var/lib/mysql-1/
innodb_log_group_home_dir = /var/lib/mysql-1/
```

To run it, you need to specify some parameters

```bash
/opt/mysql/bin/mysqld --defaults-file=/etc/my-2.cnf --basedir=/opt/mysql --datadir=/opt/mysql/data --plugin-dir=/opt/mysql/lib/plugin --user=mysql --log-error=/opt/mysql/data/eebox.err
```

To shut it down, you can use the following command

```bash
./bin/mysqladmin -h 127.0.0.1 -P 3308 shutdown
```

You can test the server connection just like the method I used above.

That's it, good luck!
