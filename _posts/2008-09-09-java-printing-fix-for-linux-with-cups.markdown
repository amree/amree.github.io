---
layout: post
title: Java Printing Fix for Linux
meta-description: A fix for CUPS for your printings in Linux
comments: false
---

#{{ page.title }}

Apparently, there's a bug in Java where people using newer version of CUPS cannot print (can't even display the print dialog) due to a null pointer exception and this is actually a known bug. So, how do we fix this? For people who use Gnome, you can refer to this [page](https://bugs.launchpad.net/ubuntu/+source/sun-java6/+bug/156191/comments/18)

However, for people who uses non desktop environment such as Fluxbox, Openbox and etc (Gnome and KDE user can use these steps too), you can fix it by editing your CUPS printers configuration file. You can get edit the file at `/etc/cups/printers.conf`

	<DefaultPrinter Printer>
	# Printer configuration file for CUPS v1.3.7
	# Written by cupsd on 2008-09-08 11:24
	.
	.
	.
	Option orientation-requested 3
	</Printer>

Make sure you `Option orientation-requested 3` to every configuration for every printer you've installed. If you cannot find the file, it's possible that you haven't configured any printer yet.

This fix is simply to make sure CUPS will provide a page orientation setting to Java.

The exception:

	Caused by: java.lang.NullPointerException: null attribute
	        at sun.print.IPPPrintService.isAttributeValueSupported(IPPPrintService.java:1147)
	        at sun.print.ServiceDialog$OrientationPanel.updateInfo(ServiceDialog.java:2121)
	        at sun.print.ServiceDialog$PageSetupPanel.updateInfo(ServiceDialog.java:1263)
	        at sun.print.ServiceDialog.updatePanels(ServiceDialog.java:437)
	        at sun.print.ServiceDialog.initPrintDialog(ServiceDialog.java:195)
	        at sun.print.ServiceDialog.(ServiceDialog.java:124)
	        at javax.print.ServiceUI.printDialog(ServiceUI.java:188)
	        at sun.print.RasterPrinterJob.printDialog(RasterPrinterJob.java:855)
	        at sun.print.PSPrinterJob.printDialog(PSPrinterJob.java:421)</code>

Please refer to some of the discussions here:

* [Ubuntu Bugs Report](https://bugs.launchpad.net/ubuntu/+source/sun-java6/+bug/156191/)
* [Java Bugs Report](http://bugs.sun.com/bugdatabase/view_bug.do?bug_id=6633656)

FYI, you need to **restart your CUPS** after editing the configuration (Thanks to Brandon Bell).
