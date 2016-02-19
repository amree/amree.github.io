---
layout: post
title: Getting Started with Xen on Slackware
meta-description: How to install and setup Dom0 + DomU in Slackware
---

# {{ page.title }}

## Install Slackware

I'll be doing this on Slackware v13.37 64 bit.

* Create 1 partition for the whole disk
* Set its type to `8e` (Linux LVM)

Run these commands to setup the LVM partitions:

    $ pvcreate /dev/sda1
    $ vgcreate vg01 /dev/sda1
    $ lvcreate -L 20G -n root vg01
    $ lvcreate -L 20G -n iso vg01
    $ lvcreate -L 8G -n swap vg01
    $ mkswap /dev/vg01/swap
    $ setup

* Mount `/dev/vg01/root` as `/`
* Mount `/dev/vg01/iso` as `/iso`
* Install all packages from a, ap, d, f, l, n, t, tcl, x

Create custom `initrd` after the setup complete:

    $ chroot /mnt
    $ /usr/share/mkinitrd/mkinitrd_command_generator.sh > init
    $ sh init
    $ ln -sf /boot/vmlinuz-generic-2.6.37.6 /boot/vmlinuz

Add `initrd` option in your `/etc/lilo.conf`:

    # /etc/lilo.conf

    image = /boot/vmlinuz
      initrd = /boot/initrd.gz # Add this line
      root = /dev/vg01/root
      label = slackware
      read-only  # Partitions should be mounted read-only for checking

Install the new bootloader and reboot:

    $ lilo
    $ exit
    $ reboot

## Setup Dom0 (Host)

### Install Xen

* Install [acpica](http://slackbuilds.org/repository/13.37/development/acpica/)
* Install [xen](http://slackbuilds.org/repository/13.37/system/xen/)

### Build Xen Kernel

We'll be using kernel v3.2.28 so that no patching will be required to enable Xen and for that we'll get the one from Slackware's repo. By the time of this writing, Slackware v14 has not been released yet (it's in the current).

    $ wget http://slackware.osuosl.org/slackware-current/source/k/linux-3.2.28.tar.xz
    $ tar Jxvf linux-3.2.28.tar.xz
    $ mv linux-3.2.28 linux-3.2.28-xen
    $ mv linux-3.2.28-xen/ /usr/src/
    $ cd /usr/src
    $ rm linux
    $ ln -s linux-3.2.28-xen linux

Get Slackware's default kernel config for a start. From there, you must add all Xen's related kernel configs. You can refer to [Xen's wiki](http://wiki.xen.org/wiki/Mainline_Linux_Kernel_Configs) on what kernel config that needs to be enabled.

You can also get my configs from this [gist](https://gist.github.com/3695518). It's based on 3.2.28 kernel (you can use Gist's diff to see what config I've added).

Whatever you chose, make sure you'll change the LOCALVERSION so that you won't replace your current kernel. Use `cat /proc/cpuinfo | grep -i 'processor' | wc -l` + 1 to get your cpu core count to be used with `make -j`.

    $ cd linux
    $ wget http://slackware.osuosl.org/slackware-current/source/k/config-x86_64/config-generic-3.2.28.x64
    $ cp config-generic-3.2.28.x64 .config
    $ make oldconfig
    $ make menuconfig
    $ make -j13 bzImage modules
    $ make modules_install
    $ cp System.map /boot/System.map-xen-3.2.28
    $ cp .config /boot/config-xen-3.2.28
    $ cd /boot
    $ rm System.map
    $ ln -s System.map-xen-3.2.28 System.map

### Xen + Dom0 + Initrd

Since LILO doesn't support "module" directive of Grub, we need to use `mbootpack`.

* Install [mbootpack](http://slackbuilds.org/repository/13.37/system/mbootpack/)

You can use `/usr/share/mkinitrd/mkinitrd_command_generator.sh` for `mkinitrd` recommendation. Create an initrd for Xen's kernel:

    $ depmod 3.2.28-xen
    $ mkinitrd -c -k 3.2.28-xen -f ext4 -r /dev/vg01/root -m mptbase:mptscsih:mptsas:usbhid:ehci-hcd:uhci-hcd:jbd2:mbcache:ext4 -L -u -o /boot/initrd-xen.gz

Create the boot image using `mbootpack`:

    $ cd /boot
    $ gzip -d -c /boot/xen-4.1.2.gz > /boot/xen-4.1.2
    $ gzip -d -c /boot/initrd-xen.gz > /boot/initrd-xen
    $ mbootpack -o /boot/vmlinuz-xen-3.2.28 -m /usr/src/linux-3.2.28-xen/vmlinux -m /boot/initrd-xen /boot/xen-4.1.2
    $ ln -s vmlinuz-xen-3.2.28 vmlinuz-xen

With `mbootpack`, we don't have to specify `initrd` option. Add these new configs into your `/etc/lilo.conf`:

    # /etc/lilo.conf

    image = /boot/vmlinuz-xen
      root = /dev/vg01/root
      label = slackware-xen
      append="-- nomodeset"
      read-only

Put these configs on the top of your `lilo.conf`:

    default = slackware-xen
    timeout = 30

Run `lilo` and make sure there's no error from the output:

    $ lilo
    Warning: LBA32 addressing assumed
    Added slackware
    Added slackware-xen *
    One warning was issued.

Put these settings in your `/etc/rc.d/rc.local`:

    # /etc/rc.d/rc.local

    if [ -d /proc/xen ]; then
      if [ -x /etc/rc.d/rc.xencommons ]; then
        echo "Starting XEN commons:  /etc/rc.d/rc.xencommons"
        /etc/rc.d/rc.xencommons start
      fi
      if [ -x /etc/rc.d/rc.xendomains ]; then
        echo "Starting XEN domains:  /etc/rc.d/rc.xendomains"
        /etc/rc.d/rc.xendomains start
      fi
    fi

And these commands in your `/etc/rc.d/rc.local_shutdown`:

    # /etc/rc.d/rc.local_shutdown

    if [ -d /proc/xen ]; then
      if [ -x /etc/rc.d/rc.xendomains ]; then
        echo "Stopping XEN domains:  /etc/rc.d/rc.xendomains"
        /etc/rc.d/rc.xendomains stop
      fi
      if [ -x /etc/rc.d/rc.xencommons ]; then
        echo "Stopping XEN commons:  /etc/rc.d/rc.xencommons"
        /etc/rc.d/rc.xencommons stop
      fi
    fi

After the reboot, you should get something like this:

    $ uname -r
    3.2.28-xen

    $ cat /proc/xen/capabilities
    control_d

    $ cat /sys/hypervisor/properties/capabilities
    xen-3.0-x86_64 xen-3.0-x86_32p hvm-3.0-x86_32 hvm-3.0-x86_32p hvm-3.0-x86_64

    $ xl list
    Name                                        ID   Mem VCPUs  State Time(s)
    Domain-0                                     0 15243    12     r-----       9.0

Disable autosave and restore of `DomU`:

    # /etc/default/xendomains

    XENDOMAINS_RESTORE=false
    XENDOMAINS_SAVE=""

## Setup DomU (Guest)

I'm going to install a Slackware v13.37 64 bit as the first guest. I'll be using an ISO image that I've copied into my `/iso`.

    $ cd /iso
    $ wget http://mirrors.xmission.com/slackware/slackware64-13.37-iso/slackware64-13.37-install-dvd.iso

For a start, we need to create a config file for the Slackware installation:

    $ mkdir ~/machines
    $ cd ~/machines
    $ vim slackware-install

Put these initial configs in your `/root/machines/slackware-install`:

    kernel = 'hvmloader'
    builder='hvm'
    memory = 1024
    name = "slackware"
    vif = [ 'mac=00:16:3E:AD:81:AE, bridge=virbr0, model=e1000' ]
    dhcp = "dhcp"
    disk = ['phy:/dev/vg01/slackware,hda,w', 'file:/iso/slackware64-13.37-install-dvd.iso,hdc:cdrom,r']
    boot='dc'
    sdl=0
    opengl=1
    vnc=1
    vncpasswd=''
    serial='pty'

As you can see, there're various of thing thats we need to take care of before we start the installation. First of all the networking.

### Generate Random MAC

Use this command (thanks to [Unixtitan](http://unixtitan.net/main/2009/12/01/xen-mac-generator/)):

    perl -e 'printf "00:16:3E:%02X:%02X:%02X\n", rand 0xFF, rand 0xFF, rand 0xFF'

### Setup Networking Bridging

There are a few methods for a DomU to access the network. For this guide, I'll use network bridging.

Put these configs (before starting anything related to Xen) into your `/etc/rc.d/rc.local` to enable network bridge:

    # /etc/rc.d/rc.local

    ifconfig eth0 up
    ifconfig eth0 0.0.0.0

    brctl addbr virbr0
    brctl addif virbr0 eth0
    ifconfig virbr0 192.168.1.10 netmask 255.255.255.0
    route add default gw 192.168.1.1

Clear out any values set in your `/etc/rc.d/rc.inet1.conf`. Usually the value of `IPADDR[0]`, `NETMASK[0]` and `GATEWAY`.

    # /etc/rc.d/rc.inet1.conf

    # Config information for eth0:
    IPADDR[0]=""
    NETMASK[0]=""
    USE_DHCP[0]=""
    DHCP_HOSTNAME[0]=""

    # Default gateway IP address:
    GATEWAY=""

This configs assume your main networking interface is `eth0`. Change other settings based on your network environment. Reboot your `Dom0`.

You'll get something that looks like this after the reboot (if you got it right).

    $ ifconfig

    eth0      Link encap:Ethernet  HWaddr bc:30:5b:db:e2:99
              inet6 addr: fe80::be30:5bff:fedb:e299/64 Scope:Link
              UP BROADCAST RUNNING MULTICAST  MTU:1500  Metric:1
              RX packets:163836 errors:0 dropped:0 overruns:0 frame:0
              TX packets:337 errors:0 dropped:0 overruns:0 carrier:0
              collisions:0 txqueuelen:1000
              RX bytes:18347806 (17.4 MiB)  TX bytes:30535 (29.8 KiB)
              Interrupt:36 Memory:d6000000-d6012800

    lo        Link encap:Local Loopback
              inet addr:127.0.0.1  Mask:255.0.0.0
              inet6 addr: ::1/128 Scope:Host
              UP LOOPBACK RUNNING  MTU:16436  Metric:1
              RX packets:4 errors:0 dropped:0 overruns:0 frame:0
              TX packets:4 errors:0 dropped:0 overruns:0 carrier:0
              collisions:0 txqueuelen:0
              RX bytes:336 (336.0 B)  TX bytes:336 (336.0 B)

    virbr0    Link encap:Ethernet  HWaddr bc:30:5b:db:e2:99
              inet addr:192.168.1.10  Bcast:192.168.1.255  Mask:255.255.255.0
              inet6 addr: fe80::be30:5bff:fedb:e299/64 Scope:Link
              UP BROADCAST RUNNING MULTICAST  MTU:1500  Metric:1
              RX packets:147426 errors:0 dropped:506 overruns:0 frame:0
              TX packets:129 errors:0 dropped:0 overruns:0 carrier:0
              collisions:0 txqueuelen:0
              RX bytes:12417385 (11.8 MiB)  TX bytes:16779 (16.3 KiB)

### Enable X11 Forwarding in Dom0

* Install [vncviewer](http://slackbuilds.org/repository/12.2/system/vncviewer/)

Uncomment or create these options in your `/etc/ssh/sshd_config`:

    # /etc/ssh/sshd_config

    X11Forwarding yes

Restart your `ssh` server:

    $ /etc/rc.d/rc.sshd restart
    $ exit

Reconnect to `Dom0` using `-Y` option:

    $ ssh -Y root@192.168.1.10
    $ xclock

If you can see a clock ticking, that means the X11 forward is working.

### Prepare space for DomU

I'm going to store my `DomU` in the a new logical volume.

    $ lvcreate -L 15G -n slackware vg01

### Install Slackware in DomU

    $ cd machines
    $ xl create slackware

If everything is good, you should see `slackware` when you run `xl list`.

    $ xl list
    Name                                        ID   Mem VCPUs  State Time(s)
    Domain-0                                     0 13988    12     r-----      40.0
    slackware                                    2  1019     1     -b----       4.6

Install Slackware through VNC:

    $ xl vncviewer slackware

Just install as if you're installing on a normal server. `halt` after you've finished your installation.

### Start Slackware in DomU

    $ cd ~/machines
    $ cp slackware-install slackware
    $ vim slackware

Change these two lines in your config file to make sure it'll boot from the hardisk:

    # /root/machines/slackware

    disk = ['phy:/dev/vg01/slackware,hda,w']
    boot='c'

Start the guest:

    $ xl create slackware

### Enable Console in DomU

It's pretty annoying to use vnc everytime we need to access our `DomU` directly. It's possible to connect to our `DomU` using console connection:

Uncomment these lines:

    # /etc/inittab
    s1:12345:respawn:/sbin/agetty -L ttyS0 9600 vt100

    # /etc/securetty
    ttyS0

    $ reboot

For Ubuntu's `DomU`, please check out [https://help.ubuntu.com/community/SerialConsoleHowto](https://help.ubuntu.com/community/SerialConsoleHowto).

You can now connect to your Slackware DomU using:

    $ xl console slackware

## Additional Info

Disable auto save and restore of domUs on host reboot:

    $ vim /etc/default/xendomains

    XENDOMAINS_RESTORE=false
    XENDOMAINS_SAVE=""

In order to run `xl shutdown guest` so that your `DomU` will shutdown gracefully, you need to use [PVHVM drivers](http://wiki.xen.org/wiki/Xen_Linux_PV_on_HVM_drivers). You can refer [here](http://wiki.xen.org/wiki/Mainline_Linux_Kernel_Configs) for the related kernel configs that you need to enable in your kernel.

There are still many things that I'd like to add, but I think it's good enough for now. After all, this post is about getting started, not a complete guide. I'll update this post if I found anything worth of sharing.

Good luck!

More references:

* [http://wiki.xen.org/wiki/XenCommonProblems](http://wiki.xen.org/wiki/XenCommonProblems)
* [http://wiki.xen.org/wiki/Xen_Best_Practices](http://wiki.xen.org/wiki/Xen_Best_Practices)
* [http://wiki.xen.org/wiki/Xen_Linux_PV_on_HVM_drivers](http://wiki.xen.org/wiki/Xen_Linux_PV_on_HVM_drivers)
* [http://alien.slackbook.org/dokuwiki/doku.php?id=linux:kernelbuilding](http://alien.slackbook.org/dokuwiki/doku.php?id=linux:kernelbuilding)
