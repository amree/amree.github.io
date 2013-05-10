---
layout: post
title: Printing to PDF using CUPS
meta-description: How to print to PDF from your Linux
comments: true
---

#{{ page.title }}

1. **Install CUPS-PDF** based on your distro, you can download if from [here](http://www.physik.uni-wuerzburg.de/~vrbehr/cups-pdf/download.shtml).

2. Go to [http://localhost:631](http://localhost:631).

3. If the page requested a username and password, just enter your root as username and password for your root.

4. Go to **Administration > Add Printer**.

5. In the **Add Printer** page, **put a name** for your virtual PDF printe, any name will do. Then click **Continue**.

6. For the **Device for a**, you should **select CUPS-PDF** (Virtual PDF Driver). If it’s not there, then you haven’t executed **Step 1** successfully.

7. In the 3rd page, choose **Generic as the Make** and then click **Continue**.

8. In the 4th page, **choose Generic CUPS-PDF Printer (en)** as the model and then click **Add Printer**. For now, you’re done, but we need to customize where the file will be generated when you printed it.

9. Edit `/etc/cups/cups-pdf.conf`

10. Put these lines at the end of the file and save it (both can be customized):

		Out /home/${USER}/Desktop
		Label 1

	The first line actually tell CUPS to print your file to the Desktop and the second 	line will make sure your file won’t be overwritten by a newer one.

11. **Restart CUPS**.

So, that’s all and good luck !
