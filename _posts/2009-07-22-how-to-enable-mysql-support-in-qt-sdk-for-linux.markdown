---
layout: post
title: How to Enable MySQL Support in Qt SDK for Linux
meta-description: Enable MySQL plugin in Qt SDK for Linux
---

#{{ page.title }}

	Updated: 8 May 2012

**Known to work with:**

* Slackware v13.37, Qt SDK v1.1.5 (32 bit), Qt v4.8.0, MySQL v5.5.18

Please follow this guide properly:

1. Download Qt SDK for Linux/X11 at Qt Software.

2. Install it anywhere you want, just make sure you remember the path. I installed mine at `/opt`.

3. To build MySQL as a plugin, you need to know two other paths:

	* MySQL header directory's files example:
		
			decimal.h   m_string.h      my_dbug.h    my_list.h        my_sys.h     mysql_embed.h    mysqld_error.h  sql_state.h        typelib.h
			errmsg.h    my_alloc.h      my_dir.h     my_net.h         my_xml.h     mysql_time.h     raid.h          sslopt-case.h
			keycache.h  my_attribute.h  my_getopt.h  my_no_pthread.h  mysql.h      mysql_version.h  readline.h      sslopt-longopts.h
			m_ctype.h   my_config.h     my_global.h  my_pthread.h     mysql_com.h  mysqld_ername.h  sql_common.h    sslopt-vars.h
		
	* MySQL library directory's files example:

			libdbug.a    libmyisammrg.a      libmysqlclient.so@         libmysqlclient_r.a    libmysqlclient_r.so.15@      libmysys.a
			libheap.a    libmysqlclient.a    libmysqlclient.so.15@      libmysqlclient_r.la*  libmysqlclient_r.so.15.0.0*  libvio.a
			libmyisam.a  libmysqlclient.la*  libmysqlclient.so.15.0.0*  libmysqlclient_r.so@  libmystrings.a

4. I installed my MySQL at `/opt`, so those files will be in:

		# Headers directory
		/opt/mysql-5.5.18-linux2.6-i686/include/  

		# Libraries directory
		/opt/mysql-5.5.18-linux2.6-i686/lib      

5. Go to your main Qt SDK installation's path:

		cd /opt/QtSDK/
		cd QtSources/4.8.0/src/plugins/sqldrivers
		# Replace all the path based on your computer environment. 
		/opt/QtSDK/Desktop/Qt/4.8.0/gcc/bin/qmake -o Makefile "INCLUDEPATH+=/opt/mysql-5.5.18-linux2.6-i686/include/" "LIBS+=-L/opt/mysql-5.5.18-linux2.6-i686/lib -lmysqlclient" mysql.pro
		make
		/opt/QtSDK/Desktop/Qt/4.8.0/gcc/bin/qmake "INCLUDEPATH+=/opt/mysql-5.5.18-linux2.6-i686/include/" "LIBS+=-L/opt/mysql-5.5.18-linux2.6-i686/lib -lmysqlclient_r" mysql.pro
		make
		make install
		
6. Some files with `mysql` in the name will be copied in your sqldrivers path:

		/opt/QtSDK/Desktop/Qt/4.8.0/gcc/plugins/sqldrivers
		
7. Before trying your MySQL coding, please make sure `libmysqlclient.so` is in the`LD_LIBRARY_PATH`.

8. Create a new project and put these codes to test your new plugin. 
		
		QT       += core sql
		QT       -= gui
		
		TARGET    = mysql
		CONFIG   += console
		CONFIG   -= app_bundle
			
		TEMPLATE = app
		
		SOURCES += main.cpp

	Make sure you have `mysql` included in your `.pro` file.

		#include <QCoreApplication>
		#include <QtSql>
			
		int main(int argc, char *argv[])
		{
		    QCoreApplication a(argc, argv);
		
		    qDebug() << QSqlDatabase::drivers();
		
		    return a.exec();
		}


	You should get `QMYSQL` in the outputs when you ran the application:

		("QSQLITE", "QMYSQL3", "QMYSQL")

You can find my info at [http://qt-project.org/doc/qt-4.8/sql-driver.html](http://qt-project.org/doc/qt-4.8/sql-driver.html).
