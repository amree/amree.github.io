---
layout: post
title: Git Remote Commands
meta-description: Some useful commands for git remote branches
---

View some remote **information**:

	git remote show origin

**List** all remote branch:

	git branch -r

**Pushing** a branch to the remote:

	git push origin newfeature

Or when you want to **push in the checkout branch**:

	git push origin HEAD

And use `-u` to **push and track** the remote branch:

	git push -u origin newfeature

Make an existing git branch to **track a remote** branch:

	git branch --set-upstream newfeature1 origin/newfeature1

**Deleting** a remote branch:

	git push origin :newfeature

**Refresh** remote branch list:

	git remote prune origin

**Checkout** a remote branch and **track** it:

	git checkout -t origin/newfeature
