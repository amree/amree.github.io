---
title: Tiny Guide to Webscaling
date: 2023-11-26
tags: [devops]
readingTime: true
toc: true
---

Someone on Twitter asked what if Khairul Aming wanted to set up his own website
for his sambal? For those who may not know, his product has gained fame and
typically sells out quickly once he opens orders. At present, he utilizes
Shopee.

From a business standpoint, it's advisable for him to stay with Shopee. My post
is primarily for educational purposes.

Disclaimer: I am not an SRE/DevOps professional, but rather someone eager to
share insights that might broaden understanding of web scalability, drawn from
my limited experiences. Therefore, there may be inaccuracies, though I hope
none too significant.

Expect some odd structuring in the paragraphs, as the content was initially
made for Twitter.

## Introduction

Firstly, traffic won’t spike up on day one. Even if the founder is a marketing
genius, he might prefer an established app over starting from scratch. However,
if he's starting anew, what’s the accepted baseline for stress tests?

If he already has good sales and no problems, what’s the business decision on
moving to a completely new platform?

Then, it circles back to the possibility of scaling what the owner currently
has, which is most likely his own custom platform. That means legacy baggage.

A small tip for those interviewing: don't simply throw tons of cloud jargon at
your interviewer. First, ask about any constraints. Your system design answer
will be more relatable.

The solution should be about improving the existing problem. Yes, it's not cool
and easy to improve old stuff. But we are not in school anymore. We rarely
start with something 100% new.

Ask and investigate the existing stack. Then, we can start working on it.

This article explained it best:
https://mensurdurakovic.com/hard-to-swallow-truths-they-wont-tell-you-about-software-engineer-job/

Understanding the process from the user typing the address to getting the
response back is important. I'd say we can simplify it to:

User -> Server -> Data Storage (DS) User -> DNS -> Load Balancer (LB) ->
Servers -> DS User -> DNS -> CDN -> LB -> Servers -> DS

It is important because we want to know which part of the section to look at
and fix when there is a problem.

Developers may not care as there are DevOps or someone else to take care of it,
but, in my humble opinion, it's good to understand the stack even at the
surface level to help the team.

## DNS

Let’s start with the DNS. Every part of the architecture is important, but DNS
is the first layer of the request that will be touched before it goes somewhere
else. This means you can do lots of interesting things here.

See the traffic sequence image if you use CloudFlare (CF).

From the image, you can see that CF can do lots of things such as DDoS
protection, redirections, caches, firewall (WAF), and others.

CF is not the only option. There's CloudFront as well. But I'm more used to CF
than CloudFront, so I'm going to talk more about this service.

Let's start from the top: DDoS. You can’t have a popular website without DDoS
protection. If you are big enough, that means you are popular enough for others
to do bad stuff, like bots, attacks, fake traffic, and so on.

There’s always a limit to what you can handle.

To protect from those attacks, we need to stop them before they reach your
servers. If they manage to get through, then you'll have bigger problems.

CF can help mitigate the attack. But not all of them. You have to get used to
tuning the knobs manually when needed.

So, remember, don’t trust the advertisements from the service providers. Test
them out, get attacked, gain experience in looking at the traffic, see the
anomalies, separate them, and control them by banning or throttling them so
that your servers can handle the incoming traffic.

Page Rules - You can override the behavior of certain pages without code. For
example, you might set cache-control to cache at CF for 5 minutes from the
code, then, for whatever reason, you need to make the cache stay longer, and
that can be done from this page.

WAF - My favorite. This is where you can ban, throttle the traffic based on
IP/ASN/country/custom matchers/etc. This page has saved me from sleepless
nights countless times.

Imagine having a sale and getting attacked at the same time?

Before moving on to the next layer, it's important to note that this is where
we point http://domain.com to an ALB / Load Balancer address / your server.
It's how CF will know how to route the request to the next step.

It will also go through the traffic sequence mentioned above.

I didn’t talk much about Content Delivery Networks (CDN). I think that’s the
lowest hanging fruit that one can do to ensure your assets are served by the
CDN servers located nearest to your visitors.

Remember, the less traffic goes to the origin, the better.

This is also why some people tweak their WordPress/Web to be served by the CDN
as much as possible.

What’s the catch? Once cached, how do you expire the cache? Cache is also less
usable if your traffic is too random. You have to understand your traffic
before reaching for it.

Before moving to the next layer, learn about the Cache-Control header as much
as you can. Learn to leverage it not just for your assets, but also for your
normal pages. Figure out how to get the most out of it and understand the
downside as well, then you'll have a very fast website.

## Load Balancer

Let's move on to the Load Balancer (LB). Its purpose is to distribute incoming
traffic across various servers, typically using a round-robin algorithm. In our
example, traffic comes from CF and goes to the LB. In AWS, this is known as the
Application Load Balancer (ALB).

Focusing on the ALB, which operates at the Layer 7 or application layer
(HTTP/HTTPS), it represents the last point before traffic is distributed to the
servers. This is why the ALB address is entered into CF.

Securing the ALB address is critical because attackers might launch direct
attacks, bypassing the protections set up in CF. Normally, traffic is only
allowed from trusted sources like CF, with all other traffic denied.

ALB is just one of AWS's services; you can also use other open-source software
(OSS) as your LB. Even nginx can handle load balancing, but whether it can
withstand the traffic is another matter. AWS ALB, in my experience, is very
reliable.

Discussing scalability leads us to Auto Scaling Groups (ASG) and Target Groups
(TG). Some believe these services will solve all scaling problems, but it's not
that straightforward. They are helpful, but endless scaling isn't the goal,
right?

In summary: Traffic from the ALB is forwarded to the TG. The ASG, using a
Launch Template (LT), manages the addition of servers as needed—this much I'm
sure of.

The criteria for adding servers, such as a server's CPU usage hitting 60% for
10 minutes, can be based on various factors. When triggered, AWS launches more
servers according to the LT specifications. To reduce costs, many opt for auto
spot instances, which are notably cheaper. New servers are registered to the TG
for the ALB's utilization.

The servers will be terminated once the preset conditions are no longer met,
allowing resources to fluctuate based on demand. This is the essence of
'autoscaling.'

To be clear, autoscaling isn't mandatory. It's for teams who anticipate sudden
spikes in traffic that require additional server capacity. The thought of
managing this manually is daunting. It's wise to research the pros and cons of
auto spot instances as well.

But it's not a magic solution; there are always trade-offs. Adding servers
impacts other resources—nothing comes without cost.

Specifically, there are implications for storage, but let's discuss the servers
and application first, or perhaps address them simultaneously since they're
interconnected.

And if anyone is still reading this, kudos to you lol 🤷

## Servers

After the ALB routes the data, it's up to the servers to push it to the
application layer. 'Servers' could refer to either physical hardware or
application servers. My expertise lies with EC2 rather than serverless, so
that's where I'll concentrate.

EC2 is a service from AWS where you deploy your application. AWS offers various
server types optimized for compute, memory, storage, etc. The best choice
depends on your workload. Understanding your server's specs is crucial.

Without knowing a server's limits, we may inadvertently overuse it. Recognizing
when a server is at capacity is a skill in itself.

Cost is a significant factor. AWS provides regular, spot, and dedicated
instances, among others. Upfront payment can also offer cost savings. Tools
like spot.io assist in cost optimization, but understanding your workload is
fundamental.

Spot instances are economical but can be terminated unexpectedly, so it might
be prudent to start with dedicated instances and then transition to spot
instances based on usage and requirements. These concepts warrant further
research for a comprehensive understanding.

Cost considerations become even more critical when auto-scaling because you
could potentially spin up many servers. It's essential to determine a
reasonable limit. I haven't even begun to discuss the impact on other
resources.

Now, let's delve into the server itself. The software stack depends on your
application. For Ruby on Rails, a classic setup might include nginx, puma, and
then your code. Understanding this flow is vital.

You should consider how your application server uses resources, as this will
dictate the necessary memory and CPU. Optimizing a single server might mean you
don't need to spin up ten servers for the same load.

I recall a 'fixer' at a seminar who explained how he calculated the required
RAM based on active processes during a nationwide application outage years ago,
using just basic Linux tools, without AWS.

Web scaling isn't merely about adding more servers. It's about understanding
why resources are being strained. At my work, the recent incident made me
question if the resource usage was high because we couldn't pinpoint the
underlying issue.

I highly recommend this article from Judoscale, https://bit.ly/46yg8hF. It
offers excellent visuals on data flow from the ALB to the application server.
It's a valuable read, even for those not using Ruby on Rails, as the principles
apply broadly.

## Application

At the application layer, it’s clear that handling substantial traffic isn’t
solely the server team's responsibility. Developers must ensure that the code
is optimized to handle the load, necessitating close collaboration across the
team to minimize or eliminate downtime.

The infrastructure team can do a lot, but if developers consistently push
two-second queries, the servers will inevitably struggle. We must acknowledge
limits, particularly financial ones. Short-term solutions might work, but the
key question is: How short is our short-term?

Applications vary, but certain best practices apply universally, such as
deferring non-critical tasks to background jobs. Even simple actions like
voting can be processed in the background, leading to quicker responses.

As previously stated, use a CDN whenever possible to serve assets and cache
pages. Understanding and leveraging cache-control can significantly reduce the
load on your servers.

For heavy database queries, consider caching results in faster storage
solutions like Redis. The goal is to minimize the workload during the main
request. Fewer tasks during the request equate to quicker response times.

Beyond simply caching, it's crucial to understand how caching works. For
instance, what happens if a cache expires just as a thousand requests per
second hit? Strategizing for such scenarios is key to reducing origin server
load.

Addressing the original scalability question, particularly in e-commerce, one
of the biggest challenges is managing stock availability during high demand,
akin to new iPhone releases or limited event tickets.

Locking stock without causing database lockups is a delicate process. I’ve
implemented a solution for this, but I cannot guarantee it could handle the
intense traffic like @khairulaming's sales events.

In a Malaysian context, holding stock for a brief period is essential to allow
users to complete transactions, especially when they must navigate to their
banks’ payment interfaces.

When payment failures occur, it's necessary to return the unclaimed stock to
the pool for others to purchase. This often involves coupon systems and
requires updating user wallets concurrently, which is resource-intensive due to
the need for transactions and row locking.

These operations are costly, and while they may handle a substantial number of
requests, the scalability to the level of something like @khairulaming’s order
volume or COVID-19 appointment systems remains uncertain.

Rapid deployment capability is also critical, particularly for CI/CD processes.
This ensures that any issues can be addressed quickly, which is vital during
high-traffic events to avoid frustrating users.

From my experience, database optimization is frequently the bottleneck.
Developers unfamiliar with tuning and structuring their databases will
encounter issues well before traffic peaks. With an adequately optimized
database, excessive caching might be unnecessary.

At a minimum, developers should utilize tools like EXPLAIN to diagnose slow
queries. Eliminating N+1 queries and applying appropriate indexing are
fundamental skills that remain vital across all database platforms.

## Database

The database is often the most challenging aspect, not because other areas are
problem-free, but due to its complexity and the impact of its performance.
Let's explore some straightforward infrastructural optimizations.

Implement connection pooling, whether it's HA Proxy, RDS Proxy, pgPool,
pgBouncer, or similar. It's crucial to comprehend the nuances between
application and server-side pooling. Connections are costly in terms of memory,
so monitor usage and set appropriate quotas.

Pooling allows your application to reuse open connections, which can be more
memory-efficient. However, you'll need to understand how these applications
work and may need to adjust them based on your specific application needs.

Employ replicas and balance the load between them. It's ideal to dedicate a
server to a single application and split read operations based on usage.
Adjusting the master server for writes is more complex; I've seen professionals
split a primary server to support an increased number of write operations.

Splitting the master server and data partitioning or sharding are advanced
solutions that require careful configuration. These methods are complex and
should not be your first line of approach—start with simpler solutions.

Avoid default configurations. Pinpoint the issues you're facing, then focus on
the relevant settings. Be mindful of potential cascading effects when changing
configurations. Always monitor the changes and revert if they don't yield
improvements.

Understand your database's strengths and limitations. Your technology choice
may not be the best, but proficiency can help resolve most issues. For
instance, Uber switched to MySQL, although PostgreSQL advocates might disagree
with their reasons (https://bit.ly/3sG6I5S).

Utilize raw queries when necessary. ORMs are convenient but come with overhead,
often requiring more memory. Don't hesitate to write direct queries to leverage
your database's full capabilities.

Like with EC2, don't focus solely on CPU usage. Consider other metrics like
memory and IOPS, which can limit your database depending on the specifications
you choose.

Conduct schema and data migrations cautiously. Aim for zero downtime, even if
it means multiple stages or phases.

While proper database normalization is common, there are times when
denormalization is necessary to enhance performance. Step outside the standard
practices if needed, but ensure you understand the trade-offs.

Choose the right database for your needs, not just what's trendy. If a part of
your app benefits from key-value storage, consider Redis. Mixing and matching
technologies is fine, but be cognizant of the time and money costs for
maintenance.

I won't delve deeply into Redis. The principles are similar to other
technologies: use replicas, connection pooling, understand the tech and its
uses. Asking why Redis is faster can lead to a deeper understanding—it's not
just a key-value store; it offers much more.

## Observability

Let's approach the final chapter I hadn't planned on writing: Observability.

I believe that's the term, though I’m not a DevOps/SRE—so that's my disclaimer
for any inaccuracies, lols.

Assuming we've optimized our code and servers, there's still one crucial
element to consider, and it should be addressed concurrently: monitoring tools.
It's essential to have a system that alerts you to problems.

I'll share tools I'm familiar with, acknowledging my preference for paid
services—though I wasn't always like this. Discussing their use might lead to
identifying similar, free alternatives.

By combining these tools, we can gain the most benefit.

Application Performance Management (APM) is one category. I use @newrelic,
which offers a comprehensive suite for monitoring request queues, searching
logs, tracing details, historical performance, external call performance, among
other metrics.

For real-time server stats like CPU usage, network, and IOPS, I turn to AWS
CloudWatch. AWS Performance Insights is also a go-to as it provides a real-time
overview of database performance.

I’ve started using dashboards to consolidate AWS information, allowing me to
view everything, including ASG and ALB metrics, on one screen.

@pganalyze is another invaluable tool for identifying slow queries, underused
indexes, bloat stats, idle connections, and more. It offers insights into query
throughput and IOPS, though there's some overlap with Performance Insights. One
downside is its data refresh rate, which is every 10 minutes by default but
might be adjustable.

Error tracking is another critical area. While New Relic handles this,
dedicated error tracking services like Bugsnag and Sentry offer specialized
capabilities, though they can become costly with increased traffic.

Integration with notification services is also crucial. PagerDuty or even Slack
can be used to alert engineers of issues.

The goal of these tools is to provide immediate insights into what's happening,
enabling quick identification and response to issues for both short-term fixes
and long-term solutions.

## Summary

I think I have covered most of what I want to talk about. I would love to
elaborate more on some of them, but this is Twitter. So, let's go to the
summary.

I can't stress enough that what works at another place will not necessarily
work the same for you. Learn from others and use them as guidance, but don't
expect the same result 100%. This is the main reason I keep on using "it
depends". Same with this thread, it may work for you or it may not 🤷.

Keep on learning. Don't simply say "auto-scale" without understanding the
consequences and, of course, be humble. There are still too many things to
learn. I've made mistakes by thinking my way is the only way before, and once I
learned more, I realized the answer can be different.

Change the mindset. Most of the time, the solution is not that clear. There is
always a trade-off between them. But which one is I'm ok to go with? Win some,
lose some. It doesn't have to be perfect, but it has to work, if possible so
that we can return to our sleep lol.

Hopefully, this will help someone. I know it would have helped me three years
ago.

Thanks for reading and THE END.
