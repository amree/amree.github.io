---
layout: post
title: Corosync and Pacemaker in Slackware
meta-description: How to setup and use Corosync and Pacemaker in Slackware
---

# {{ page.title }}

This will be multi part post about high availability solution for Slackware. My first post will be about Corosync and Pacemaker.

You need to combine Corosync and Pacemaker with other distributed storage system such as [DRBD](http://www.drbd.org/)/[OCFS2](http://oss.oracle.com/projects/ocfs2/)/[GFS](http://docs.redhat.com/docs/en-US/Red_Hat_Enterprise_Linux/5/html-single/Global_File_System_2/). I'll talk about these stacks in another post.

**Goal:**

* A MySQL server will always be available at the same IP even though it's actually down (another server will take over automatically without the needs for manual intervention).

**Environments:**

* Slackware v13.37
* Two nodes will be used:

		Node 1:
		192.168.1.101

		Node 2:
		192.168.1.102

		Cluster/Main/Failover IP:
		192.168.1.100

The MySQL data is not syncronized, this post is just about [Corosync](http://www.corosync.org/) and [Pacemaker](http://www.clusterlabs.org/).

**Guides:**

1. Download and install these packages (by this order) in both nodes:
	* [http://slackbuilds.org/repository/13.37/libraries/libnet/](http://slackbuilds.org/repository/13.37/libraries/libnet/)
	* [http://slackbuilds.org/repository/13.37/libraries/libesmtp/](http://slackbuilds.org/repository/13.37/libraries/libesmtp/)
	* [http://slackbuilds.org/repository/13.37/system/clusterglue/](http://slackbuilds.org/repository/13.37/system/clusterglue/)
	* [http://slackbuilds.org/repository/13.37/system/clusterresourceagents/](http://slackbuilds.org/repository/13.37/system/clusterresourceagents/)
	* [http://slackbuilds.org/repository/13.37/system/corosync/](http://slackbuilds.org/repository/13.37/system/corosync/)
	* [http://slackbuilds.org/repository/13.37/system/pacemaker/](http://slackbuilds.org/repository/13.37/system/pacemaker/)

	I strongly suggest you build these packages one by one just to be sure there are no missing dependencies. BTW, some script adjustments are needed for Cluster Resource Agents but I'm sure you guys can handle it ;-)

2. It would be easier for the next steps if [password-less](http://www.debian-administration.org/articles/152) login with OpenSSH is enabled. In your `Node 1`:

		ssh-keygen -t rsa
		ssh-copy-id -i ~/.ssh/id_rsa.pub root@192.168.1.102

3. Generate an authentication key for Corosync:

		corosync-keygen

	If you're connecting remotely, pressing your keyboard won't do any good. The fastest way would be typing directly into the server. The other way is running `find .` on your `/` directory (press `Control + C` when the key has been generated).

4. Copy the new generated authentication key to `Node 2`:

		scp /etc/corosync/authkey 192.168.1.102:/etc/corosync

5. Copy the default `corosync` configuration file:

		cp /etc/corosync/corosync.conf.example /etc/corosync/corosync.conf

6. Replace `bindnetaddr` and `logfile` (optional):

		bindnetaddr: 192.168.1.0
		logfile: /var/log/corosync

	You can checkout the [reference](http://www.corosync.org/doku.php?id=faq:configure_openais) about those values. From corosync:

		If the local interface was 10.12.12.93 and the netmask was 255.0.0.0, Totem would execute the logical operation 10.12.12.93 & 255.0.0.0 and produce the value 10.0.0.0. This value would be compared against bindnetaddr and bind Totem to the NIC that matches.
		This can cause confusion if netmask or bindnetaddr are not set properly.
		In the example above, if bindnetaddr is 10.12.12.0, the network interface will never be matched. If bindnetaddr is 10.0.0.0 the interface will be matched.

7. Copy `corosync.conf` to `Node 2`:

		scp /etc/corosync/corosync.conf 192.168.1.102:/etc/corosync

8. Create `pacemaker` file so that `Corosync` will automatically load `Pacemaker` when it's started:

		touch /etc/corosync/service.d/pacemaker

	Put these configs in that file:

		service {
		  # Load the Pacemaker Cluster Resource Manager
		  name: pacemaker
		  ver:  0
		}

9. Copy the `pacemaker` file to Node 2:

		scp /etc/corosync/service.d/pacemaker 192.168.1.102:/etc/corosync/service.d/

10. Start your Corosync and let the magic begins:

		/etc/rc.d/rc.corosync start

11. Check your log for any error:

		tail -f /var/log/corosync

	Check your process list:

		ps auxf

	Corosync should also load other processes automatically:

		root      2008  0.5  3.4  52668  3964 ?        Ssl  13:55   0:00 corosync
		root      2015  0.0  1.9  12140  2248 ?        S    13:55   0:00  \_ /usr/lib/heartbeat/stonithd
		226       2016  0.3  3.3  13004  3796 ?        S    13:55   0:00  \_ /usr/lib/heartbeat/cib
		root      2017  0.0  1.6   6812  1848 ?        S    13:55   0:00  \_ /usr/lib/heartbeat/lrmd
		226       2018  0.1  2.2  12404  2540 ?        S    13:55   0:00  \_ /usr/lib/heartbeat/attrd
		226       2019  0.0  1.7   8664  2032 ?        S    13:55   0:00  \_ /usr/lib/heartbeat/pengine
		226       2020  0.1  2.5  12528  2904 ?        S    13:55   0:00  \_ /usr/lib/heartbeat/crmd

12. Monitor your cluster using Pacemaker tools:

		crm status

	It should be something like this:

		============
		Last updated: Sun May 13 13:57:43 2012
		Stack: openais
		Current DC: node1 - partition with quorum
		Version: 1.1.1-b9b672590e79770afb63b9b455400d92fb6b5d9e
		2 Nodes configured, 2 expected votes
		0 Resources configured.
		============

		Online: [ node1 node2 ]

	Give them some time to online if they're offline.

13. Put some main configurations to your cluster:

		crm
		configure
		property stonith-enabled=false
		property no-quorum-policy=ignore
		commit
		quit

	If you're getting some errors such as `ERROR: cib-bootstrap-options: attribute last-lrm-refresh does not exist`, just proceed. It maybe a [bug](http://www.gossamer-threads.com/lists/linuxha/users/63183).

	We had to disable `stonith` since we just want our Pacemaker to be running. However, in real production environment, you really need to configure `stonith`, you can read more about it [here](http://www.novell.com/support/kb/doc.php?id=7004817).

	We also need to ignore quorum policy since we're only using 2 nodes and you can read more about it [here](http://www.clusterlabs.org/wiki/FAQ#I_Killed_a_Node_but_the_Cluster_Didn.27t_Recover).

	You can see your new configuration by running:

			crm configure show

	Which will output:

			node node1
			node node2
			property $id="cib-bootstrap-options" \
				dc-version="1.1.1-b9b672590e79770afb63b9b455400d92fb6b5d9e" \
				cluster-infrastructure="openais" \
				expected-quorum-votes="2" \
				stonith-enabled="false" \
				last-lrm-refresh="1336919205" \
				no-quorum-policy="ignore"

	If you accidentally put some wrong configurations and don't know how to edit it, you can use `crm configure edit` to change your configurations directly but this method is highly not recommended since it's error-prone.

14. It's time to configure our main/failover/cluster IP (our client will use this IP, not the nodes IP):

		crm
		configure
		primitive ip ocf:heartbeat:IPaddr params ip="192.168.1.100" op monitor interval=10s
		commit

15. If everyting goes well, you should be able to ping the cluster IP (`192.168.1.100`) and `crm status` should yield this result:

		============
		Last updated: Sun May 13 14:28:19 2012
		Stack: openais
		Current DC: node1 - partition with quorum
		Version: 1.1.1-b9b672590e79770afb63b9b455400d92fb6b5d9e
		2 Nodes configured, 2 expected votes
		1 Resources configured.
		============

		Online: [ node1 node2 ]

		ip     (ocf::heartbeat:IPaddr):        Started node1

16. We'll now setup MySQL monitoring with `Pacemaker`. But before that, make sure you:

	Installed MySQL in both of the nodes.

	Able to connect to your MySQL from other than `localhost`:

			mysql -u root -p -h 192.168.1.101
			mysql -u root -p -h 192.168.1.102

	You can use this command to allow any host to connect to your MySQL:

			GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' IDENTIFIED BY 'password' WITH GRANT OPTION;
			FLUSH PRIVILEGES;

	Created a database in `Node 1` and `Node 2`. For an example, a databased named `node1` in `Node 1` and `node2` in `Node 2`. This is just for verification.

17. Add this resource:

		crm
		configure
		primitive mysql ocf:heartbeat:mysql \
		params binary="/usr/bin/mysqld_safe" config="/etc/my.cnf" user="mysql" pid="/var/run/mysql/mysql.pid" datadir="/var/lib/mysql" socket="/var/run/mysql/mysql.sock" \
		op monitor interval="30s" timeout="30s" \
		op start interval="0" timeout="120" \
		op stop interval="0" timeout="120"
		commit
		quit

	The parameter above is purely based on the standard Slackware's MySQL package. So make sure you've created `/etc/my.cnf` which is not available by default. Just copy from the default file:

		cp /etc/my-small.cnf /etc/my.cnf

18. Your latest `crm status` would show something like this:

		============
		Last updated: Mon May 14 01:13:23 2012
		Stack: openais
		Current DC: node1 - partition with quorum
		Version: 1.1.1-b9b672590e79770afb63b9b455400d92fb6b5d9e
		2 Nodes configured, 2 expected votes
		2 Resources configured.
		============

		Online: [ node1 node2 ]

		 ip	(ocf::heartbeat:IPaddr):	Started node1
		 mysql	(ocf::heartbeat:mysql):	Started node2

	As you can see, `mysql` has been started on `Node 2`. Actually it doesn't matter in which node it will start first (for this tutorial, not for the production server), what important is that if one of the nodes is down, the other node should start its MySQL automatically. You can test this situation by running these commands in your `Node 2` to simulate a node failure:

		crm
		node
		standby
		quit

	`crm status` would show something like this (give `Node 1` some time before it starts its MySQL):

		============
		Last updated: Mon May 14 01:21:12 2012
		Stack: openais
		Current DC: node1 - partition with quorum
		Version: 1.1.1-b9b672590e79770afb63b9b455400d92fb6b5d9e
		2 Nodes configured, 2 expected votes
		2 Resources configured.
		============

		Node node2: standby
		Online: [ node1 ]

		 ip	(ocf::heartbeat:IPaddr):	Started node1
		 mysql	(ocf::heartbeat:mysql):	Started node1

	Right now, your client can use the cluster IP (`192.168.1.100`) to connect to your MySQL. The client won't realize which node it connected to. In this case, he/she will connect to `Node 2` if both of them (the nodes) are online. If `Node 2` is offline, `192.168.1.100` will automatically connect the client to MySQL in `192.168.1.101`. If `Node 1` is offline, `192.168.1.100` will automatically uses MySQL in `Node 2` which is in `192.168.1.102`.

	To reonline `Node 2`, just use these commands in your `Node 2`:

		crm
		node
		online
		quit

19. However, usually you want to control which MySQL will be up first, either in `Node 1` or in `Node 2`. To make this happen, you need to use `colocation`:

		crm
		configure
		colocation ip-mysql inf: ip mysql
		commit
		quit

	`crm status` would show something like this:

		============
		Last updated: Mon May 14 01:26:41 2012
		Stack: openais
		Current DC: node1 - partition with quorum
		Version: 1.1.1-b9b672590e79770afb63b9b455400d92fb6b5d9e
		2 Nodes configured, 2 expected votes
		2 Resources configured.
		============

		Online: [ node1 node2 ]

		 ip	(ocf::heartbeat:IPaddr):	Started node1
		 mysql	(ocf::heartbeat:mysql):	Started node1

	That means, your `mysql` has been started on `Node 1`. So, everytime `corosync` is started on both of the nodes, `mysql` will be started on `Node 1` due to the `colocation` configuration.

20. Try turning off `Node 1` or `Node 2` and see how MySQL switches side from both of the nodes.

I think that's it, next tutorial should be mainly about DRBD. Good luck!





