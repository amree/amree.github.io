---
title: Order Update with Two-Step Payment
date: 2020-05-09
tags: [stripe]
---

I was asked about this from my latest job application. Didn't realize it's going
to be this long so I thought I should share it publicly, easier for me to show
it to the next interviewer. The exact question was:

<!--more-->

> Describe a recent technical solution or achievement that you are proud of.
Anything goes, from a tiny one hour ticket to a large system, we are just
interested in how you think.

The answer:

It's just order updating, how complex can it be? I realized I was wrong about
the complexity when I started my investigation. The complexity comes from the
two-step payment system that we're going to implement to make sure the whole
order editing work smoothly. It was actually my first time hearing the two-step
payment words.

In case you didn't know: A two-step payment system is where you hold a certain
amount of money on someone's credit card. Depending on the requirement, you'll
charge the credit card later. We're using Stripe for our payment system.

A little bit of background: We don't want to charge the credit card until the
cut-off date of the food delivery, which will then allow the customer to change
their order online without contacting us. So, a customer can keep on changing
the menu (which will affect the price) as much as he wanted without us having to
deal with the credit card refund and charge manually.

The simplest workflow would be:
- Customer checkout from our websites with a date far in the future
- We'll queue the card authorization 7 days before the cut off date
- Customer didn't make any changes
- When the time comes, we authorized the amount, queue another job for the card
capture process
- On the day of the cut off date, we'll capture the amount automatically
- No order update from the web will be allowed at this point. They need to
contact our customer support for this


The complexity keeps on compounding as you need to think about these scenarios:
- During the checkout we need to know whether we should authorize, capture, or
  process the card immediately (one-step payment).
- The biggest one would be the editing part. We need to think what's the current
  state of the order and what action that was made. Is the order in the
  authorized state? Capture state? When is the cut off date? Do we need to
  refund everything? Do we need to do a partial refund? Do we need to refund and
  charge a new amount?

So, I was given this task alone (we don't have many devs last time). There were
too many things that need to be done, so I had to break it up by phases:
- Update existing checkout to support two-step payment system (this is when the
  order was created)
- I need to update/add the code to handle cancel, refund, authorize and capture
  the card. Each action has its own complexity, but that's the high overview.
- Alter the database to support the new payment state
- Figure out the best time to capture the payment (e.g: cut off date - weekend).
  I also need to give some buffer for the customer support to handle if there's
  an error during any of the processes above.

At the end of the project, I got helps from my awesome team for things like
mailers and other kinds of updates. So, I still need to work on the core parts.
I don't think I can meet the deadline without those helps lol.

I'd love to tell you more about the whole process, but it was pretty long. But
you can see the branch conditions that I've drawn here:

![diagram](/images/posts/order-update-with-two-step-payment/two-step-payment.jpg)

```txt
P = Pending Authorization
A = Authorized
C = Capture
R = Refund
H = Amount higher
L = Amount lower
```

But the biggest thing I learned with this project is that visualization will
help a lot. It doesn't have to be in a standard format like when you study in
the university. Just draw however you want as long it can help you see the
problem and possible blockers.

In terms of the code itself, I had to dive into React and Redux to implement the
whole update (we have complex menu selections). Of course, testing is very
important. With lots of new and updated code, I need to make sure none were
broken every time I added/updated new ones. At first, I mocked a lot of API
requests, but it doesn't feel safe, so I used VCR library to record the
interactions and the result feels more accurate and safe. For the front end
part, I used Capybara/Chrome for the feature tests.

Together with a feature flag in place, I can safely deploy the changes every day
without having to do one big rollout. In terms of the backend code, I used a lot
of service objects to keep the classes small. It's also easier to read and find,
e.g: ChargeProcessor, AuthorizeProcessor, etc. Everything was also namespaced to
ensure I don't pollute the main service directory.

With this feature implemented, we improved further with other features as well
such as the ability to save and delete credit cards. The checkout is also easier
as the customer can just select from the previous credit card. The support
couldn't be happier as well as they don't have to handle manual order updates.

I think I better stop here lol
