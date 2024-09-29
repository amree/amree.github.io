---
title: Caching 101
date: 2023-12-31
tags: [others]
---

Caching is something we use to reduce the access to the original source. To do
that, we store the data temporarily on another medium. We can use various tech
to achieve that, but whatever we choose should be faster or lighter than the
original source. This will help our users to retrieve our data faster than
before. It will also help lower the initial resource utilization. Depending on
what we choose, we can save some costs.

What kind of data can we cache? I am unsure if there's a limitation, but
anything retrieved can be cached. The only question is, where do you store
them? That highly depends on what kind of data that we have.

Let's start with something basic first. When we retrieve data from our
database, we might not realize there's a cache happening there, too. But is it
good enough? Depending on your use case, it won't since the cache can easily
get busted due to changes in the data. You should retrieve the data and cache
it on the application layer to have a proper cache. But where would you store
it? This is the part where we choose something faster than the database itself
because if we don't, there's no point in caching, right?

To make it short, I suggest storing it on an in-memory database such as Redis.
Consequently, the web server doesn't have to contact the database whenever
someone requests the endpoint that calls for the query. The response time will
be faster since the data is stored in the memory instead of files. The endpoint
doesn't have to compute or do additional work to get the data. We are supposed
to store precomputed data close to the final form anyway. As you can see, we
have freed the database to work on something else. It is also a technique we
can use to avoid expensive computations on the database.

With the previous implementation, we have reduced the requests that go to the
database, but you might have noticed that the requests will still reach our
servers. It's good to stop here for most use cases. However, that is different
with high-traffic websites. The key to handling many requests from your
websites is shifting the responsibility to something else. It's quite similar
to how we avoid access to the database by asking Redis to store the data. What
kind of options do we have?

There are various ways to do this, such as HAProxy or Nginx. However, I would
like to discuss how we can use a Content Delivery Network (CDN) such as
CloudFlare (CF) to do this.

"A CDN, or Content Delivery Network, is a system of distributed servers that
deliver web content and other web services to users based on their geographic
location, the origin of the web page, and a content delivery server. The
primary purpose of a CDN is to improve access speed and efficiency by reducing
the distance between the user and the content." - ChatGPT.

We can do so many things with CDN, but in this context, we would like to
temporarily store the cache on the CDN itself. When we put the content on the
CDN, depending on how we configure the cache, the CDN will serve the requests
instead of the "origin" servers (our servers). As you might have guessed, we
just freed the servers from serving those requests, which, as a result, reduced
the server utilizations. So, now, the CDN servers, which are strategically
located around the world, will serve the data. Normally, this is done by
setting the proper "Cache-Control" header.

Everything sounds so good, but remember, our decisions always have trade-offs,
and these are some of them:

"There are only two hard things in Computer Science: cache invalidation and
naming things" - Phil Karlton.

When we temporarily store the data, we must determine how long it will be
considered fresh. Once we have all the right requirements, we must figure out
how to invalidate the data. The methods depend highly on the stack that you are
using. Some frameworks made it easy by specifying the Time to Live (TTL). We
can also use the Observer pattern to invalidate the data when an event happens,
but we need to know the key to store the cache. We can even configure the cache
TTL on the server level. For example, Redis has eviction policies such as Least
Recently Used (LRU), Least Frequently Used (LFU) and others. What about the
caches on the CDN? The basic is still the same: we either remove it based on
the TTL or force it by triggering an API call to the CDN.

One big disadvantage I want to point out when caching on the CDN is how we need
to use JavaScript to handle the dynamic portion of the cached page. Caching
means the CDN will save a snapshot of the page on its servers for a certain
period, which means everything that was rendered that time won't change any
more.

For example, we put a time on the page based on when the request comes in after
the cache has expired. The CDN will then cache that time based on that
particular request. Since the time code is coming from our server side, it
won't change anymore, as the next request will hit the CDN instead of our
servers. Remember, CDN is serving what has been saved. They won't re-render the
page from scratch as that's the job of our server. So, what do we do? We had to
move some code to JavaScript (JS) since JS is dynamic and can run on the user's
machine. Depending on the requirements, we can have the JS asynchronously load
some of the pages. At the same time, the CDN will handle the initial page load.
So, we can still cache the page on the CDN and update some of the content
anytime we want.

Alright, that's it for now. There is still more to discuss, but I will stop
here first. There are also more ways to approach the cache invalidation. Maybe
next time, it will be about the Dogpile Effect. Till then, happy New Year,
everyone!
