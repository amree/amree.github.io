---
title: How to enable MySQL Support in Qt SDK for Windows
date: 2011-07-11
tags: [windows, qt, mysql]
---

It has been quite a while since I wrote the previous guide. Since that
particular post gained a lot of visitors, I decided to write a new guide based
on the new Qt SDK and MySQL so that it will help people with new version for
both softwares.

<!--more-->

Download Qt SDK and install it. In my case, I installed it at `C:\QtSDK`. You
must make sure that you’ve chosen to install Qt Sources. If you have Qt SDK
installed but you haven’t install Qt sources, just go to this path to install
it.

```txt
Start > All Programs > Qt SDK > Maintain Qt SDK
```

![image](/images/posts/2011-07-11/qt.png)

Download MySQL and install it. In my case, I choose to install it at:

C:\Program Files (x86)\MySQL\MySQL Server 5.5.

You don’t need to install everything if you want to compile the plugin. Make
sure you will at least choose to install Client C API Library.

![image](/images/posts/2011-07-11/mysql.png)

Open:

```txt
Start > All Programs > Qt SDK > Desktop > Qt 4.7.3 for Desktop (MingW)**
```

Run these commands (change according to your environment):

```bat
set mysql=C:\PROGRA~2\MySQL\MYSQLS~1.5
cd \
cd QtSDK\QtSources\4.7.3\src\plugins\sqldrivers\mysql\

qmake "INCLUDEPATH+=%mysql%\include" "LIBS+=%mysql%\lib\libmysql.lib" -o Makefile mysql.pro
mingw32-make

qmake "INCLUDEPATH+=%mysql%\include" "LIBS+=%mysql%\lib\libmysql.lib" -o Makefile mysql.pro "CONFIG+=release"
mingw32-make
```

You should be able to run these commands **without any error**.

You’ll find two directories (**debug** and **release**) created in the current
directory.

In **debug** directory, you’ll find `libqsqlmysqld4.a` and `qsqlmysqld4.dll`.

Meanwhile, in **release** directory, you’ll find `libqsqlmysql4.a` and
`qsqlmysql4.dll`.

**Copy all these 4 files into**:

```txt
C:\QtSDK\Desktop\Qt\4.7.3\mingw\plugins\sqldrivers
```

Copy `libmysql.dll` (found in your MySQL installation directory) into C:\Windows.

Create new project and put these codes to test your new plugin

```cpp
#include <QApplication>
#include <QtSql>

int main(int argc, char *argv[])
{
  QCoreApplication a(argc, argv);
  qDebug() << QSqlDatabase::drivers();
  return a.exec();
}
```

Make sure you have QtSql Module in your project configuration file (.pro file)

```txt
QT += sql
```

You’ll get these outputs showing that your Qt has supports for MySQL:

```txt
("QSQLITE", "QMYSQL3", "QMYSQL", "QODBC3", "QODBC")
```

Things to watch out for:

1. **You can’t use MySQL 64 Bit (at the moment)** to compile the plugin.

2. Make sure you’ll **use short path** type if you’ve installed MySQL into directory’s name containing spaces.

3. **Load sql module** in your .pro file.

Tested on:

* 11/7/2011 – Windows 64 Bit, MySQL Server 5.5.1 32 Bit (Community Version) and Qt 4.7.3.
