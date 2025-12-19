---
title: "Subtrans SLRU Thrashing on PostgreSQL"
date: 2025-12-18T07:36:59+08:00
tags: [postgresql]
toc: true
typora-copy-images-to: ../../static/images/posts/${filename}
typora-root-url: ../../static
---

I had to look into this challenge recently and I think it's a complicated subject due to gaps in my own PostgreSQL internal knowledge.

Why am I even talking about this topic? Recently, we saw spikes for these two metrics on ALL of our DB replicas:

* <abbr title="A process is waiting to access the simple least-recently used (SLRU) cache for a subtransaction.">LWLock:SubtransBuffer</abbr>
* <abbr title="A process is waiting for I/O on a simple least-recently used (SLRU) buffer for a subtransaction">LWLock:SubtransSLRU</abbr>

Based on that incident, I started to dive deep into the issue to understand what happened. Additionally, I'm pretty sure I will forget the nuances of this problem in the future, so I might as well write what I understood. 

Be aware that this is written by a dev who is not a database administrator. So, it'd be great if anyone can correct me if there's anything wrong or needs to be improved. You can do that by replying to my [X post](#) about this article.

With those disclaimers out, let's get into it.

<!--more-->

If you search for this topic, two articles were in the top:

* [PostgreSQL subtransactions considered harmful](https://v2.postgres.ai/blog/20210831-postgresql-subtransactions-considered-harmful#problem-4-subtrans-slru-overflow)
* [Why we spent the last month eliminating PostgreSQL subtransactions](https://about.gitlab.com/blog/why-we-spent-the-last-month-eliminating-postgresql-subtransactions/)

Both are related as I think GitLab worked with PostgresAI to resolve their issue. So, both articles were my main references.

After going back and forth reading those "advanced" articles, I decided to use Claude to help me build the basic knowledge so I could understand them better. Claude gave me these topics to start:

1. **Tuple Visibility Basics** — How PostgreSQL decides if a row is visible
2. **XID Horizon** — What it is and why a pinned horizon is dangerous
3. **Subtransactions** — How they work and why they create Subtrans entries
4. **Subtrans SLRU Thrashing** — Putting it all together

To be clear, I also Googled what Claude gave me since I don't trust AI 100%. I will try to add as many references as possible to confirm what I learnt.

My post is tailored towards Postgres v15 on RDS. I tried not to include too much changes from older versions.

## Tuple Visibility Basics

### What is a tuple?

A tuple is a row in a PostgreSQL table. When you insert a row, PostgreSQL stores it as a tuple on disk.

```sql
CREATE TABLE users (
  id serial PRIMARY KEY,
  name text
);

INSERT INTO users (name) VALUES ('Alice');
```

This creates one tuple (row).

### Hidden system columns

Every tuple has hidden columns that PotgreSQL uses internally. The key ones for visibility are `xmin` and `xmax`:

```sql
INSERT INTO users (name) VALUES ('Bob');

SELECT xmin, xmax, id, name FROM users;
  xmin  | xmax | id |  name
--------+------+----+-------
  1001  |    0 |  1 | Alice
  1002  |    0 |  2 | Bob
```

`xmin` = The transaction ID (XID) that created this tuple

`xmax` = The transaction ID that deleted or updated this tuple (0 if still live). This is why dead tuples stick around until VACUUM

### What is an XID

XID (Transaction ID) is a running number that increments globally for every new transation. XID are never reused within a wraparound cycle. If a transaction aborts, it's XID is gone:

```
XID 1000 → Transaction A starts
XID 1001 → Transaction B starts
XID 1002 → Transaction C starts
XID 1001 → Transaction B aborts
```

Next transaction gets XID 1003, not 1001.

<details class="expandable">
<summary>More on wraparound</summary>

In PostgreSQL, a transaction ID takes 32 bits. Four billions seems to be quite a big number, but it can be exhausted very fast if the system is being actively used. For example, for an average load of 1,000 transactions per second (excluding virtual ones), it will happen in about six weeks of continuous operation.

Once all the numbers are used up, the counter has to be reset to start the next round (this situation is called a "wraparound"). But a transaction with a smaller ID can only be considered older than another transaction with a bigger ID if the assigned numbers are always increasing. So the counter cannot simply start using the same numbers anew after being reset.

</details>

## XID Horizon

## Subtransactions

## Subtrans SLRU Thrashing

## References

* [AWS User Guide - LWLock:SubtransSLRU (LWLock:SubtransControlLock)](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/wait-event.lwlocksubtransslru.html)
* [PostgreSQL subtransactions considered harmful](https://v2.postgres.ai/blog/20210831-postgresql-subtransactions-considered-harmful#problem-4-subtrans-slru-overflow)
* [Why we spent the last month eliminating PostgreSQL subtransactions](https://about.gitlab.com/blog/why-we-spent-the-last-month-eliminating-postgresql-subtransactions/)
* [Demystifying the Internals of PostgreSQL - Chapter 5](https://dev.to/nilelazarus/demystifying-the-internals-of-postgresql-chapter-5-2pe4)
