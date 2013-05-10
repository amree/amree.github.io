---
layout: post
title: Configuring Linux to work with NVidia Hybrid SLI Technology
meta-description: Configure your Linux to work with NVidia Hybrid SLI technology
comments: true
---

# {{ page.title }}

First of all, at the time of this writing, NVIDIA Hybrid SLI Technology is [not supported](http://www.nvnews.net/vbulletin/showpost.php?p=1613349&postcount=2) on Linux and without proper configuration, you won’t even be able to load your Desktop Environment such as Xfce.

That’s not the only problem, based on an [interview](http://www.nvnews.net/articles/hybrid_sli_interview/index.shtml) with NVIDIA’s Tom Petersen, one of its main feature is called HybridPower which basically allows users to shut off the graphics card when not needed and dramatically reduce power consumption. This means, there is a possibility that if we can’t find a way to turn off the second GPU, it will consume more power that it should be. 

But that’s another problem. Right now, we just want to boot into our Desktop Environment properly.

1. Running `startx` would show these error messages from `/var/log/Xorg.0.log`:

		(!!) More than one possible primary device found
		(--) PCI: (0:2:0:0) 10de:06e8:1028:0271 rev 161, Mem @ 0xae000000/16777216, 0xd0000000/268435456, 0xac000000/33554432, I/O @ 0x00004000/128
		(--) PCI: (0:3:0:0) 10de:0866:1028:0271 rev 177, Mem @ 0xaa000000/16777216, 0xb0000000/268435456, 0xcc000000/33554432, I/O @ 0x00005000/128, BIOS @ 0x????????/131072

1. Generate the default configuration for your X (using root):

		$ nvidia-xconfig


1. Get the list of the GPUs.

		$ lspci
		02:00.0 VGA compatible controller: nVidia Corporation G98 [GeForce 9200M GS] (rev a1)
		03:00.0 VGA compatible controller: nVidia Corporation C79 [GeForce 9400M G] (rev b1)

	You will get a long list of devices connected to your PCI buses. We are only 	interested with the VGA controller.

1. As you can see, we have two VGA controller, we just need to specify which one we would like to use.

		$ nano /etc/X11/xorg.conf

1. Go to your Device section and set Bus ID for your controller in it. So, in the end, if I chose the second controller, my `Xorg.conf` would somehow look like this:

		Section "Device"
		    Identifier     "Device0"
		    Driver         "nvidia"
		    VendorName     "NVIDIA Corporation"
		    BoardName      "GeForce 9400M G"
		    BusID          "PCI:3:0:0"
		EndSection

	The configuration is simple, you just need to **add the 6th line**. Just make sure 	you put it in the correct format `PCI:X:X:X`, X possibly refers to the last 3 	digit number in your error log.