---
title: Trick to Make Telegram Bot Private
date: 2019-12-19
tags: [telegram, ruby]
---

Recently, I learned a trick to make my Telegram bot private to certain users.

I tried not to create the whole CRUD thingy for the membership and after
Googling I found out about one of the API provided.

<!--more-->

https://core.telegram.org/bots/api#getchatmember

This would allow us to get info of a user with a given `chat_id`. It can be a
channel or a group.

Basically your membership for your bot will be based on the group of your bot
and the allowed users are in. So, both of them need to be in the same
group/channel.

The code would look like the screenshot.

```ruby
bot.api.get_chat_member(chat_id: -10012345678, user_id: message.from_id)
```

There're a few things to note:

**We need to get the channel and id of the group**

For group:

Invite https://t.me/RawDataBot and on the first entry, it'll output some JSON.
You can get the group's ID from `message.chat.id`.

It should look like `-10012345678`. Remove the bot after that. But if you don't
trust the bot, you probably need to cook up some new code to get the group ID.

For channel:

Channel is a little bit different, you can use one of the methods mentioned
here:

https://stackoverflow.com/questions/33858927/how-to-obtain-the-chat-id-of-a-private-telegram-channel/56546442#56546442

**Output**

So, what's the output can we expect? Well for Ruby, we're expecting hash from
the output and `var["result"]["status"]` will give you the status of the user.

It can be many things, but if it's `left` then the user is not a member of the
group and that's what we want to know.

**Add the bot to a group/channel**

This also means you need to add the bot that's executing the code to be in the
same group as those users that you want to give access to.

So, any users who are in the same group/channel will be allowed to chat with the
bot based on the previous output.

Again, a channel is a little bit different, you need to add your bot as the
admin, compared to a group that can be added as a normal user.

**Exception**

Another note, the code will raise an exception if the given `chat_id` doesn't
exist.

As a summary,  with this trick, you don't have to build the whole CRUD and can
reuse the group/channel that you already have (assuming you have one).

That's it, folks, thanks for reading
