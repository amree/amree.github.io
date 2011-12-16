---
layout: post
title: Printing to Zebra S4M Using Java and ZPL II
meta-description: Some code examples for Zebra S4M using Java and ZPL II
comments: false
---

#{{ page.title }}

Apparently there're some codes scattered on the net telling people that you can print to a Zebra printer by sending ZPL II codes using `PrintService`. But the problem is, it's not working, I don't know why, maybe because of a different version of printer or model but I'm pretty sure the thing that came out from the printer are just ordinary texts not barcode which is what the code was supposed to output.

##New Version

Thanks to Oleg (a commentator) for pointing out on how to print using Zebra S4M connected either via USB or network.

The solution is pretty simple, all you have to do is do not install Zebra S4M as a Zebra S4M (sounds weird, I know), instead, just install it as a local raw printer (Linux) or generic text printer (Windows).

For CUPS user in Linux, this is the example for the correct configurations:

**/etc/cups/printers.conf**

	<Printer Zebra>
	  Info
	  Location
	  DeviceURI socket://10.1.1.5:9100
	  State Idle
	  StateTime 1223445299
	  Accepting Yes
	  Shared Yes
	  JobSheets none none
	  QuotaPeriod 0
	  PageLimit 0
	  KLimit 0
	  OpPolicy default
	  ErrorPolicy stop-printer
	  Option orientation-requested 3
	</Printer>


You can always add the printer using the web interface, just make sure you choose RAW as the Make/Manufacturer and Model/Driver.

Test this Java code, it should print out a barcode:

{% highlight java %}
import javax.print.Doc;
import javax.print.DocFlavor;
import javax.print.DocPrintJob;
import javax.print.PrintException;
import javax.print.PrintService;
import javax.print.PrintServiceLookup;
import javax.print.SimpleDoc;
import javax.print.attribute.PrintServiceAttribute;
import javax.print.attribute.standard.PrinterName;

public class SimplePrint {

   public static void main(String[] args) {
       
       try {
           
           PrintService psZebra = null;
           String sPrinterName = null;
           PrintService[] services = PrintServiceLookup.lookupPrintServices(null, null);
           
           for (int i = 0; i < services.length; i++) {
               
               PrintServiceAttribute attr = services[i].getAttribute(PrinterName.class);
               sPrinterName = ((PrinterName) attr).getValue();
               
               if (sPrinterName.toLowerCase().indexOf("zebra") >= 0) {
                   psZebra = services[i];
                   break;
               }
           }
           
           if (psZebra == null) {
               System.out.println("Zebra printer is not found.");
               return;
           }
           DocPrintJob job = psZebra.createPrintJob();

           String s = "^XA^FO100,40^BY3^B3,,30^FD123ABC^XZ";

           byte[] by = s.getBytes();
           DocFlavor flavor = DocFlavor.BYTE_ARRAY.AUTOSENSE;
           Doc doc = new SimpleDoc(by, flavor, null);
           job.print(doc, null);
           
       } catch (PrintException e) {
           e.printStackTrace();
       }      
   }
}
{% endhighlight %}


Print using FTP:

{% highlight java %}
import java.io.FileInputStream;
import org.apache.commons.net.ftp.FTP;
import org.apache.commons.net.ftp.FTPClient;

public class FtpPrint {

   public static void main(String[] args) {

       try {

           FTPClient f = new FTPClient();            

           f.connect("10.1.127.3");
           f.login("anonymous", "");
           f.setFileType(FTP.ASCII_FILE_TYPE);                            

           FileInputStream in = new FileInputStream("/path/to/file");
           if (f.storeFile("filename", in)) {
               System.out.println("Upload ok");
           }                

           f.logout();
           f.disconnect();

       } catch (Exception e) {
           e.printStackTrace();
       }
   }
}
{% endhighlight %}

Print using socket:

{% highlight java %}
import java.io.DataOutputStream;
import java.net.Socket;

public class SocketPrint {

   public static void main(String argv[]) throws Exception {

       for (int i = 0; i &lt; 10; i++) {
           Socket clientSocket = new Socket("10.1.127.3", 9100);
           DataOutputStream outToServer = new DataOutputStream(clientSocket.getOutputStream());
           outToServer.writeBytes("^XA^FO100,40^BY3^B3,,30^FD123ABC^XZ");
           clientSocket.close();
       }
   }
}
{% endhighlight %}

(got it from [Zebra's website](https://support.zebra.com))

[Download guide to ZPL II](http://www.zebra.com/id/zebra/na/en/index/products/printers/industrial_commercial/s4m.4.tabs.html)
