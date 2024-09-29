---
title: Minimizing Problems Before and When They Occur
date: 2023-05-09
tags: [others]
---

Although we use monolithic architecture, we actually "break down" the
application into several parts in production, such as:

- Web
- Free API
- Paid API
- Mobile API

Workers (background jobs)

Therefore, when we deploy, it does not mean that all servers will receive the
new application. If we deploy to the Web and there are issues, only the Web
will be affected. However, some applications may still have problems if they
manipulate shared data until it becomes corrupted.

For now, we have invested heavily in the database infrastructure. We have 7+
replicas and the primary/master database remains the same. Here, RDS Proxy
plays an important role in ensuring that the application does not take an
excessive number of connections to the database. RDS Proxy makes the decision
whether to allow a connection, not directly from the master. It may not be
enough for the application, but at least it does not affect the others.
Moreover, when we use too many connections, that could mean different kind of
problems. Sometimes we swap quotas, taking from the Web and giving to the Free
API.

You may wonder why there are 7 replicas but only 5 applications. Here,
redundancy plays an important role. Each application typically uses more than
one replica, but we load balance the load. How do we do it? We use Route 53
from AWS. So, we create one address and set the weight. For example, the Web
may read from Replica 1 and Replica 2, but in terms of weight, 40% goes to
Replica 1 and 60% goes to Replica 2. However, Replica 2 may also be used by the
Free API. The address does not need to be changed in the application because we
handle it at the DNS level. For now, only the Paid API does not share with
other applications. Of course, the income from it is important to pay salaries
😅

That's what's behind the scenes. Let's talk about the front. In front, we have
CloudFlare (CF). All traffic passes through here except for background jobs. CF
is very helpful in ensuring that incoming traffic is controlled. By default,
they provide automatic DDoS protection, but we still need to tune it when it's
too severe. AI can't help with that, for today at least, tomorrow we don't know
yet.

One of the main features we ensure for application stability is rate limiting.
For example, 100 requests within 1 minute based on IP. That's the easiest
example. These rules change depending on the application. For example, the Free
API has the strictest rules because many people often spam or perhaps
developers do not optimize how they call our API. Sometimes we set even larger
limits for certain endpoints at the application layer itself. We use
rack-attack, which is very specific to Rails/Rack applications. Maybe next time
we'll talk about a DDoS incident and how we "try" to handle it. Emphasize on
"try" because it's not always successful.

In conclusion, even though we use the same codebase, we can design our
application as if it has more than one. As usual, every choice has its
trade-offs, but we understand and are OK with them.

Congratulations and thank you for reading to the end. As a reward, we offer you
a link to apply for a job at CoinGecko: https://jobs.lever.co/coingecko. There
are various levels available. You can also tell your friends, and we'll give
you a referral fee. For levels L1-L3, we give RM 5k, and for L4 and above, we
give RM 10k.

I plan to write more content like this to help people gain a deeper
understanding of how we operate at CoinGecko (assuming I have the time).
