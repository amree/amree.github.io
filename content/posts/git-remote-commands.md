---
title: Git Remote Commands
date: 2011-12-11
tags: [git]
---

These are some of the `git` commands that I usually use.

<!--more-->

View some remote **information**:

```bash
git remote show origin
```

**List** all remote branch:

```bash
git branch -r
```

**Pushing** a branch to the remote:

```bash
git push origin newfeature
```

Or when you want to **push in the checkout branch**:

```bash
git push origin HEAD
```

And use `-u` to **push and track** the remote branch:

```bash
git push -u origin newfeature
```

Make an existing git branch to **track a remote** branch:

```bash
git branch --set-upstream newfeature1 origin/newfeature1
```

**Deleting** a remote branch:

```bash
git push origin :newfeature
```

**Refresh** remote branch list:

```bash
git remote prune origin
```

**Checkout** a remote branch and **track** it:

```bash
git checkout -t origin/newfeature
```
