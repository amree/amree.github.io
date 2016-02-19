---
layout: post
title: Redmine with Git and Subversion in HUSM
meta-description: The status of Redmine with Git and Subversion implementation in Hospital Universiti Sains Malaysia
---

# {{ page.title }}

It's official, almost every piece of our codes in Hospital Universiti Sains Malaysia (HUSM) has been versioned in either Git or Subversion (mostly the latter). We've also linked all of the repositories into Redmine for easier project management. It's not really a walk in the park for us since this is the first time we tried to do it this big.

We're hoping we can document our workloads using issues feature in Redmine. Maybe we're a few years late (most of our projects are already matured where no big features added every week), but IMHO this is the perfect time since we're in the process of upgrading our core application in the hospital which is Lifeline. 

So, here are some fun facts about our Redmine + (Git/Subversion):

1. We're using the latest Redmine v1.3.2 (through its Git's distribution). 

2. It's being served through Apache on our Slackware v13.37 box. 

3. The Ruby and the gems are being managed with RVM for easier installation. 

4. It's using an old desktop PC model Acer M460 (2.4 GHz).

5. With advance Git and Subversion integrations, the repositories authentication are using the usernames and passwords from the Redmine itself. 

6. Our Git repositories are being served using Smart HTTP Git protocol. 

7. There are about 56 repositories in it which comprises different type of code languages such as Java, C++, Ruby, HTML, JavaScript, CSS and Pascal. 

8. For backups, we're using RAID 1 for the hardisks. `rsync` and `mysqldump` are being ran three times a day. There's no offsite backup yet.

9. There're about 40++ projects in the Redmine right now (still increasing).

10. The repositories are hosting codes from different programming languages such as Pascal, Java, C++, Ruby and PHP. So, we need to be extra careful about the `.gitigore` and `svn:ignore` configurations.

11. Tutorials has been written for newcomers on how to use version control for Netbeans, Delphi and also Qt Creator. For the time being, everyone is encourage to use their IDE to do all the commits and not doing it through command line unless they know what they are doing.

12. Most developers chose Subversion due to its low lurning curve.

In the next few days (or weeks), I'm going to post the configuration that I used to make the intergration between Git/Subversion with Redmine. It seems that the wiki from Redmine itself is not complete enough and I had to dig deeper into other websites. So, hopefully it will help anyone who's lost just like me before. 

By the way, you can view a screenshot from the Redmine's projects page [here](https://twitter.com/#!/aurorius/status/187829585759580160).

