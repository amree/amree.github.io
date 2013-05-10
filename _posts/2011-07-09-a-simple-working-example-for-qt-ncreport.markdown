---
layout: post
title: A Simple Working Example for Qt NCReport
meta-description: A Simple Working Example for Qt NCReport (with source codes)
comments: true
---

# {{ page.title }}

## Windows

1. Download NCReport with MingW for Windows.

1. Install NCReport at 

		C:\NCReport\2.6.1.mingw.eval

1. Get the full [source code](https://github.com/amree/ncreport-example) of the project at my Github.

1. Go to Projects (bar at the left) > Run Settings > Click Details on the Run Environment > Edit PATH’s variable and append the following line at the end of the string.

		;C:\NCReport\2.6.1.mingw.eval\bin

1. Run the project in **Debug** and **Release** mode. You should be able to run the report by clicking the button.

Tested on:

* Windows 7 (64 bit), NCReport 2.6.1 with MingW for Windows, QtSDK 1.1.2, Qt 4.7.3 and Qt Creator 2.2.1.

## Linux

1. Download NCReport for Linux.

1. Install NCReport at `/opt/ncreport`

1. Get the full [source code](https://github.com/amree/ncreport-example) of the project at my Github.

1. Run the project in **Debug** and **Release** mode. You should be able to run the report by clicking the button.

Tested on:

* Slackware 13.37 (32 Bit), NCReport 2.6.1 for Linux, QtSDK 1.1.2, Qt 4.7.3 and Qt Creator 2.2.1