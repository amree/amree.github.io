---
title: How I used chained branches to help with the major upgrade
date: 2022-11-18
tags: [git]
---

I want to share how I manage multiple library/gem/package updates
simultaneously while doing big upgrades. But before we start, it’s important to
know why.

Significant upgrades require a more considerable change of files. The number of
files you need to change can get out of hand. You may have to replace some code
due to the deprecations, or you may have to deploy in multiple stages to avoid
breaking the production.

This is why I strive to have more minor changes that can help reduce the final
changes. In the end, the last Pull Request (PR) will only have small changes
that would help your colleagues to review them safely. Yeah, no one is going to
review 50+ changed files.

It’s common for me to have more than 30 PR opened (not at the same time) for
one upgrade project. It’s not weird to have 10+ PR(s) opened and waiting for
approval or deployment. So, it can be very confusing to maintain all those
PR(s) and branches.

It’s not just about having small changes. It’s also about getting into the
future, where you are in a state where you have everything merged so that you
can work on the future upgrade simultaneously.

In my case, I was working on upgrading v5.2.7 -> v5.2.8 -> v6.1.7 -> v7.0.4
(I’m also upgrading Ruby at the same time, but I won’t go into that to simplify
the explanation). The good thing is that I don’t have to wait for everything to
be ready before even working on the next upgrade. When I was working on v5.2.8,
I have already started to work on v7.0.4 at the same time while waiting for
code review and deployments. To me, that’s a BIG ADVANTAGE.

Let’s talk about how I’m doing it. Pretty sure someone else has done this
before. It doesn’t require tools (you can create a script if you want to); you
need some basic git commands and small notes. It’s hard to explain this without
a visualization, so I’ve created one. You guys can see it in the attachment.

![diagram](/images/posts/how-i-used-chained-branches-to-help-with-major-upgrade/01.png)


1. Every PR must be based on the master (master <- pkg-upgrade-1 )

This means you can ensure you won’t break production with this particular
change and always rebase from the master whenever needed. If things went wrong
when you deployed, you would immediately know the problem compared to having
multiple upgrades in one PR. If you have one PR with various upgrades, you’d
have to hunt down the part that is causing the problem.

2. If the change requires another change, use a different base (master <-
   pkg-upgrade-1 <- pkg-upgrade-2)

The world is always complex, and there’s always a chance that you’d have to
depend on a different package before you can work on another upgrade. You can
wait for the changes to be deployed, but why should you?

3. Use a ‘before’ branch before the big upgrade (master <- before-big-upgrade
   (upgrade1, upgrade2, ..) <- the-big-upgrade)

The big upgrades usually require multiple changes. We can’t use 2nd technique
here as that is only suitable for one or two upgrades. We handle this by
creating a branch that will combine every small changes that haven’t been
merged to the master.

That ‘before’ branch will be used as the base for the big/last upgrade PR. This
is HOW WE TRAVEL INTO THE FUTURE. You can even see if your final changes here.
The final branch/PR should pass your CI and work locally/staging. If you found
any problem, then you can always create small branch to fix it before we merge
the final branch.

4. Use the combination of those techniques to work on another major upgrade

We can combine them, and the result would look like this: master <-
major-upgrade-1 <- major-upgrade-2 <- major-upgrade-3.

It may look simple, but ‘major-upgrade-1’ PR combines techniques from 1 to 3.
It’s a bit hard to wrap your mind when you read it for the first time, but you
can look at the image for that. Hopefully, it will help.

![diagram](/images/posts/how-i-used-chained-branches-to-help-with-major-upgrade/02.png)

What kind of git command that I need to use?

![diagram](/images/posts/how-i-used-chained-branches-to-help-with-major-upgrade/03.png)

Is this the best way to do this? It helped me keep working without being
blocked by pending PR or deployments. Remember, I don’t deploy immediately to
ensure I can monitor for regressions. Usually, I’d put some gaps between
deployments.

Thanks for reading if you managed to get this far. I’m planning to do a
presentation on this in the future, and writing this will help me explain the
method better.
