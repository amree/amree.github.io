---
layout: post
title: Upgrading to Kernel v3 for Slackware v13.37
meta-description: How to upgrade Slackware v13.37 to kernel v3.2.13
comments: true
---

#{{ page.title }}

1. Get all the necessary packages:

		wget http://slackware.osuosl.org/slackware-current/slackware/a/kernel-generic-smp-3.2.13_smp-i686-1.txz
		wget http://slackware.osuosl.org/slackware-current/slackware/a/kernel-modules-smp-3.2.13_smp-i686-1.txz
		wget http://slackware.osuosl.org/slackware-current/slackware/a/lilo-23.2-i486-1.txz

2. Change your run level:
 
		telinit 1

3. Install the kernel's package:

		installpkg kernel-generic-smp-3.2.13_smp-i686-1.txz
		kernel-modules-smp-3.2.13_smp-i686-1.txz

4. Create initial ramdisk images for preloading modules:

		cd /boot
		mkinitrd -c -k 3.2.2-smp -m ext4 -f ext4 -r /dev/sda1 -o initrd-3.2.2-smp
		
5. Edit your `lilo.conf`:

		# Linux bootable partition config begins 
		image = /boot/vmlinuz-generic-smp-3.2.2-smp 
		initrd = /boot/initrd-3.2.2-smp 
		  root = /dev/sda1 
		  label = slackware 
		  read-only # Partitions should be mounted read-only for checking 
		# Linux bootable partition config ends

6. Reload `lilo`:

		lilo -v
		
	You'll get:
   
		Fatal: Setup length exceeds 31 maximum; kernel setup will overwrite boot loader

	"It's because the kernel has grown so large. You can fix it by installing a fixed lilo from slackware-current, too" - from [LQ](http://www.linuxquestions.org/questions/slackware-14/using-slackware-3-2-kernel-package-from-current-on-13-37-a-927856/).
   
		upgradepkg /root/lilo-23.2-i486-1.txz
		lilo -v
		
7. Reboot.

8. Check your new kernel information:

		uname -a
		
	You should get something like this:
   
		Linux slackware 3.2.13-smp #1 SMP Fri Mar 23 23:21:11 CDT 2012 i686 Intel(R) Core(TM)2 Duo CPU     P8800  @ 2.66GHz GenuineIntel GNU/Linux
		
9. That's it.