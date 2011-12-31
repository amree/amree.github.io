---
layout: post
title: How to Enable MySQL Support in Qt SDK for Linux
meta-description: Enable MySQL plugin in Qt SDK for Linux
comments: false
---

#{{ page.title }}

1. Download Qt SDK for Linux/X11 at Qt Software.

2. Install it anywhere you want, just make sure you remember the path.

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

4. For Slackware v12.2, it should be at:

		# Headers directory
		/usr/include/mysql  

		# Libraries directory
		/usr/lib/mysql      

5. Go your main Qt SDK installation's path:

		cd /opt/qtsdk-2009.03/
		cd qt/src/plugins/sqldrivers/mysql/
		# Replace all the path based on your computer environment. 
		# Make sure 'qmake' can be run from anywhere or you'd have to specify the full path for it.
		qmake -o Makefile "INCLUDEPATH+=/usr/include/mysql" "LIBS+=-L/usr/lib/mysql -lmysqlclient" mysql.pro
		make

6. You should have these files created for you

		Makefile
		README
		libqsqlmysql.so*
		main.cpp
		main.o
		moc_qsql_mysql.cpp
		moc_qsql_mysql.o
		mysql.pro
		qsql_mysql.moc
		qsql_mysql.o

7. Copy MySQL plugin to your Qt’s plugins directory,

		cp libqsqlmysql.so /opt/qtsdk-2009.03/qt/plugins/sqldrivers

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


	You should get these outputs when you ran the application:

		("QSQLITE", "QMYSQL3", "QMYSQL")

That's it, good luck!