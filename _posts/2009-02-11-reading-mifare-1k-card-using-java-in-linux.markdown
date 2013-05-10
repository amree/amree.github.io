---
layout: post
title: Reading Mifare 1K Card using Java in Linux
meta-description: How to read Mifare 1K card using Java in Linux
comments: true
---

# {{ page.title }}

## The Story

In the end of last year, my friends and I were tasked to read our staff card. The main objective was pretty simple which is to create a library where we don’t have to depend on the vendor every time we want to read our own staff card and the library should also work in Linux and Windows (that means Java to us).

Working environment:

* Slackware 12.2
* JDK 6 Update 11
* Netbeans 6.5
* libusb 0.1.12
* Windows Binary of JPC/SC Java API 0.8.0
* Smartcard Reader

Let’s talk about the reader first. You need to get a reader that supports Mifare 1K card (obviously) which to be exact a reader that supports ISO14443A/B or ISO15693 (contactless standard). Now, to make your life easier, you should get a reader that can read contactless standards compliant using the same framework as ISO7816 compliant contact cards. In simple terms, you can use APDU to get the data that you want.

So, for this little project, we use **OMNIKEY CardMan 5321** RFID reader. It has everything that we need, Linux/Windows supports, APDU calls to the contactless card, it even comes a contact card’s reader too and it’s also inexpensive.

Make sure you choose the correct reader or you won’t be able to use this tutorial. Some reader requires you to read using their own specific code, which means you can only use the code you wrote on that particular reader, unlike readers that support APDU calls to contactless cards.

## The Card

1024 byte memory is organised as sixteen sectors, each of which is made up of four blocks and each block is 16 bytes long. The first block in the memory (Block 0) is read-only and is set in the factory to contain the four-byte serial number (UID), check bytes and manufacturers data. The last block of each sector (Blocks 3, 7, 11, 15 … 59, 63) is the Sector Trailer Block which contains the **two security Key codes (KeyA and KeyB**) and the Access bits that define how the sector can be accessed.

Taking into account the Serial Number/Manufacturers Block and the Sector Trailer Blocks then there are 752 bytes of free memory for user storage. For all Read and Write operations the Mifare card memory is addressed by Block number (in hexadecimal format).

## The Installation

Before you begin coding your codes, you need to make sure your environment is ready for you. To do that, just follow steps from my previous tutorial which is pretty much the same.

## General Steps to Read the Card

1. Load Mifare key

2. Authenticate

3. Read

## The Code

{% highlight java linenos %}
package my.husm.mifare;

import java.nio.ByteBuffer;
import java.util.List;
import javax.smartcardio.Card;
import javax.smartcardio.CardChannel;
import javax.smartcardio.CardException;
import javax.smartcardio.CardTerminal;
import javax.smartcardio.TerminalFactory;

public class Read {

   public Read() {
       
       try {

           CardTerminal terminal = null;

           // show the list of available terminals
           TerminalFactory factory = TerminalFactory.getDefault();
           List<CardTerminal> terminals = factory.terminals().list();

           String readerName = "";

           for (int i = 0; i < terminals.size(); i++) {

               readerName = terminals.get(i).toString().substring(
                                   terminals.get(i).toString().length() - 2);

               if (readerName.equalsIgnoreCase("01")) {
                   terminal = terminals.get(i);
               }
           }

           // Establish a connection with the card
           System.out.println("Waiting for a card..");
           terminal.waitForCardPresent(0);

           Card card = terminal.connect("T=0");
           CardChannel channel = card.getBasicChannel();

           // Start with something simple, read UID, kinda like Hello World!
           byte[] baReadUID = new byte[5];

           baReadUID = new byte[]{(byte) 0xFF, (byte) 0xCA, (byte) 0x00,
                                  (byte) 0x00, (byte) 0x00};

           System.out.println("UID: " + send(baReadUID, channel));
           // If successfull, the output will end with 9000

           // OK, now, the real work
           // Get Serial Number
           // Load key
           byte[] baLoadKey = new byte[12];

           baLoadKey = new byte[]{(byte) 0xFF, (byte) 0x82, (byte) 0x20,
                                     (byte) 0x1A, (byte) 0x06, (byte) 0xFF,
                                     (byte) 0xFF, (byte) 0xFF, (byte) 0xFF,
                                     (byte) 0xFF, (byte) 0xFF};

           System.out.println("LOAD KEY: " + send(baLoadKey, channel));
           // If successfull, will output 9000

           // Authenticate
           byte[] baAuth = new byte[7];

           baAuth = new byte[]{(byte) 0xFF, (byte) 0x88, (byte) 0x00,
                               (byte) 0x09, (byte) 0x60, (byte) 0x00};

           System.out.println("AUTHENTICATE: " + send(baAuth, channel));
           // If successfull, will output 9000

           // Read Serial
           byte[] baRead = new byte[6];

           baRead = new byte[]{(byte) 0xFF, (byte) 0xB0, (byte) 0x00,
                               (byte) 0x09, (byte) 0x10};

           System.out.println("READ: " + send(baRead, channel));
           // If successfull, the output will end with 9000

       } catch (Exception ex) {
           ex.printStackTrace();
       }
   }

   public String send(byte[] cmd, CardChannel channel) {

       String res = "";

       byte[] baResp = new byte[258];
       ByteBuffer bufCmd = ByteBuffer.wrap(cmd);
       ByteBuffer bufResp = ByteBuffer.wrap(baResp);

       // output = The length of the received response APDU
       int output = 0;

       try {

           output = channel.transmit(bufCmd, bufResp);

       } catch (CardException ex) {
           ex.printStackTrace();
       }

       for (int i = 0; i < output; i++) {
           res += String.format("%02X", baResp[i]);
           // The result is formatted as a hexadecimal integer
       }

       return res;
   }

   public static void main(String[] args) {
       new Read();
   }
}

{% endhighlight %}

Make sure you have set the right connection protocol at line 43, as pointed out by Animesh (previous commentator).

These codes use Java API to read the smartcard, but I suggest you use the jpcsc library. It’s much more robust when it comes to error handling. 

## The APDU Commands

	# Load Key
	+--------+--------+--------+--------+--------+--------+--------+--------+--------+--------+--------+
	|   FF   |   82   |   20   |   1A   |   06   |   FF   |   FF   |   FF   |   FF   |   FF   |   FF   |
	+--------+--------+--------+--------+--------+--------+--------+--------+--------+--------+--------+
	|   1    |   2    |   3    |   4    |   5    |   6    |   7    |   8    |   9    |   10   |   11   |
	+--------+--------+--------+--------+--------+--------+--------+--------+--------+--------+--------+
	
	1   = CLA : (Fixed)
	2   = INS : (Fixed)
	3   = P1  : (Fixed)
	4   = P2  : Key type, could be 00, 1A, 1B
	5   = LC  : Key length, usually 6 for 6 byte
	6   = XX  : ----+
	7   = XX  :     |
	8   = XX  :     |__ The Key (eg. FF FF FF FF FF FF)
	9   = XX  :     |
	10  = XX  :     |
	11  = XX  : ----+
	
	# Autenthicate
	+--------+--------+--------+--------+--------+--------+
	|   FF   |   88   |   00   |   01   |   60   |   00   |
	+--------+--------+--------+--------+--------+--------+
	|   1    |   2    |   3    |   4    |   5    |   6    |
	+--------+--------+--------+--------+--------+--------+
	
	1   = CLA : (Fixed)
	2   = INS : (Fixed)
	3   = P1  : (Fixed)
	4   = P2  : Block Number you want to authenticate in Hex
	5   = P3  : Mifare Block Number LSB
	6   = XX  : Key type, could be 00, 1A, 1B
	
	# Read
	+--------+--------+--------+--------+--------+
	|   FF   |   B0   |   00   |   01   |   10   |
	+--------+--------+--------+--------+--------+
	|   1    |   2    |   3    |   4    |   5    |
	+--------+--------+--------+--------+--------+
	
	1   = CLA : (Fixed)
	2   = INS : (Fixed)
	3   = P1  : (Fixed)
	4   = P2  : Block Number that you want to read in Hex
	5   = Le  : (Fixed)

So, that’s it, good luck!