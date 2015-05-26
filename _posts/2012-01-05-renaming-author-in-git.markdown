---
layout: post
title: Renaming Author in Git
meta-description: Renaming Author in Git
comments: false
---

#{{ page.title }}

In Linux, I use Netbeans a lot as a diff viewer. For now, I think it's the best diff viewer in Linux with side by side comparison and its easy to navigate UI. Plus, it's free.

Recently, I noticed that there are other authors with a different name in my Git's history. Apparently, I've accidentally committed into the repository using a different author's name and email. This is mainly due to the way Netbeans stores author's information history.

<img src="/images/posts/2011-01-05-diff.png" width="584">

So, in order to fix it, I ran this little script from Github in my master branch.

{% highlight bash %}

#!/bin/sh

git filter-branch --env-filter '

an="$GIT_AUTHOR_NAME"
am="$GIT_AUTHOR_EMAIL"
cn="$GIT_COMMITTER_NAME"
cm="$GIT_COMMITTER_EMAIL"

if [ "$GIT_COMMITTER_EMAIL" = "your@email.to.match" ]
then
    cn="Your New Committer Name"
    cm="Your New Committer Email"
fi
if [ "$GIT_AUTHOR_EMAIL" = "your@email.to.match" ]
then
    an="Your New Author Name"
    am="Your New Author Email"
fi

export GIT_AUTHOR_NAME="$an"
export GIT_AUTHOR_EMAIL="$am"
export GIT_COMMITTER_NAME="$cn"
export GIT_COMMITTER_EMAIL="$cm"
'

{% endhighlight %}

To push it into the server, I need to use `git push -f` instead of `git push`. If you use the latter command, you'll end up with a merged history (every commit will have another one identical to it). 

If you use Redmine, you may need to fetch change set. Just run this command in your Redmine's directory:

	script/runner "Repository.fetch_changesets" -e production

Netbeans committer's info are stored in (change the path based on your version):

	~/.netbeans/7.0/config/Preferences/org/netbeans/modules/git.properties

## References:

* [http://theelitist.net/git-change-revision-author](http://theelitist.net/git-change-revision-author)
* [http://help.github.com/change-author-info/](http://help.github.com/change-author-info/)
