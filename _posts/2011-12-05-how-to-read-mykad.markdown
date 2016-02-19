---
layout: post
title: How to Read MyKad
meta-description: How to read MyKad in Linux and Windows.  Application samples written in Java, Visual C and Visual Basic are included.
---

#{{ page.title }}

I've decided to merge posts about reading MyKad from my previous blog into a single post.

Notes:

1. The **original codes were written by Xenon** from [Lowyat.net](http://forum.lowyat.net/). Somehow, he managed to reverse engineer MyKad's APDU so that we can read it without buying any SDK.

2. This application **only** reads data from Jabatan Pendaftaran Negara (JPN).

Xenon also wrote two small example applications to read MyKad. I've listed them based on the programming language. Click on the link to download it:

1. [Visual C](https://github.com/amree/mykad-c)
2. [Visual Basic .NET](https://github.com/amree/mykad-vb.net)

Since there's no Java implementation of the code yet, I've decided to develop one. You can also get the source code from my [Github](http://github.com/amree/mykad-java). It's written using Netbeans.

I'm not going to give explanation about the code. Instead, I'm going to guide you guys on how to setup your system (Linux and Windows) so that you can read the Java application to read a MyKad.

# Windows

1. Download [Windows binary](http://www.musclecard.com/middle.html) of JPC/SC Java API.

2. Download the application which is in Netbeans project format from my Github.

3. You **must include** `jpcsc.jar` as the library. You can get the file from Step 1.

4. You also **must put** `jpcsc.dll` into your main project folder. Furthermore, if you want to distribute the application, you need to put it together with your main jar file. You can also get the file from Step 1.

5. Plug in your reader (obviously).

6. Run the application. I'd recommend you run it through Netbeans.

7. Insert a MyKad.

8. Wait until the application finish reading it (usually once the LED stop blinking).

9. A GUI will be displayed presenting your MyKad data.

10. If there's no data showing, there's a possibility that your MyKad chip is spoiled.

# Linux

1. Login as a **root**.

2. Download [PCSC Lite](http://pcsclite.alioth.debian.org/) and install it. You need to put some parameters in your `./configure` if you want to enable `libusb` support. Please check the `README`.

		tar xvjf pcsc-lite-1.8.1.tar.bz2
		cd pcsc-lite-1.8.1
		./configure --enable-libusb --disable-libudev
		make
		make install


3. Download and install your reader's driver. I'm using [OMNIKEY 5321 USB](http://www.hidglobal.com/prod_detail.php?prod_id=171).

4. Get [Windows binary](http://www.musclecard.com/middle.html) of JPC/SC Java API. It's for Windows but it also has a precompiled Linux library in it.

5. Extract, copy and update:

		unzip jpcsc-0.8.0.zip
		cd jpcsc/bin/linux
		cp libjpcsc.so /usr/lib
		ldconfig

6. Start the pcsc service:

		pcscd -d -f

	You should get something like this:

		00000000 pcscdaemon.c:233:main() pcscd set to foreground with debug send to stdout
		00000044 configfile.l:287:DBGetReaderList() Parsing conf file: /usr/local/etc/reader.conf.d
		00000008 pcscdaemon.c:518:main() pcsc-lite 1.8.1 daemon ready.
		00001566 hotplug_libusb.c:514:HPAddHotPluggable() Adding USB device: 4:2:0
		00008631 readerfactory.c:934:RFInitializeReader() Attempting startup of OMNIKEY CardMan 5x21 (USB iClass Reader) 00 00 using /usr/local/lib/pcsc/drivers/ifdokrfid_lnx_i
		00000179 readerfactory.c:824:RFBindFunctions() Loading IFD Handler 3.0 HID HID Global OMNIKEY RFID  IA32 v2.9.1
		00300863 readerfactory.c:296:RFAddReader() Using the reader polling thread
		00001975 readerfactory.c:934:RFInitializeReader() Attempting startup of OMNIKEY CardMan 5x21 (USB iClass Reader) 00 01 using /usr/local/lib/pcsc/drivers/ifdokrfid_lnx_i
		00000012 readerfactory.c:738:RFLoadReader() Reusing already loaded driver for /usr/local/lib/pcsc/drivers/ifdokrfid_lnx_i686-2.9.1.bundle/Contents/Linux/ifdokrfid.so
		00000014 readerfactory.c:824:RFBindFunctions() Loading IFD Handler 3.0 HID HID Global OMNIKEY RFID  IA32 v2.9.1
		00424985 readerfactory.c:453:RFAddReader() Using the reader polling thread
		00444313 readerfactory.c:1301:RFWaitForReaderInit() Waiting init for reader: OMNIKEY CardMan 5x21 (USB iClass Reader) 00 01

7. Run the Java application, it should be working right  now.

That's it, again, the full credit should goes to Xenon :)
