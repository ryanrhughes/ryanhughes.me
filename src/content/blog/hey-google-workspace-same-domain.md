---
title: "How I Use HEY and Google Workspace on the Same Domain"
date: 2026-08-16
description: "Google Workspace stays the mailroom, Gmail keeps a copy, and my messages also land in HEY. Here's the unsupported dual-delivery setup."
tags: ["email", "hey", "google-workspace", "infrastructure"]
draft: false
---

I love HEY. My team loves Gmail. DNS would prefer that we stop arguing and pick one.

When [HEY for Domains](https://www.hey.com/domains/) launched, I wanted my work email there immediately. Convincing my entire team to abandon Google Workspace because I was excited about the Screener proved challenging. It's my company, but "I like this inbox better" is not much of a migration plan.

So I made Google Workspace the mailroom and HEY my actual inbox.

Mail hits Google first. Gmail keeps its copy. Google's dual-delivery routing sends another copy to HEY. Everyone else keeps working exactly as before, while I get to pretend the company made the correct email decision.

> Disclaimer: This is not an officially sanctioned or recommended HEY and Google Workspace configuration. It is, however, the setup I've been using for a couple of years without issue. Use it at your own discretion.

## What This Setup Actually Does

The domain's MX record points to Google Workspace, so Google remains the primary mail server. A Gmail routing rule then copies mail for selected addresses to HEY's mail server.

I chose dual delivery for three reasons:

1. I had no idea whether this would work.
2. I had no idea how long it would keep working.
3. I like backups.

You can route mail away from Gmail entirely, but keeping both copies makes this experiment much easier to reverse. It also means you are storing the same mail in two systems, which may be a feature, a compliance problem, or both. Know which one applies before touching anything.

You will need admin access to Google Workspace, control of the domain's DNS, and a working HEY for Domains account. More importantly, you need enough comfort with mail routing to undo your changes if the internet decides to teach you humility.

## Set Up HEY First

This guide assumes the HEY for Domains account is already activated and the domain is verified. That was true when I built the route.

If you are starting fresh, the activation cutover is the dangerous part. HEY's normal setup eventually asks you to point the domain's MX record at its servers. Do not do that casually on a live company domain: mail can split during DNS propagation, and any recipient who does not exist in HEY may stop receiving mail there. Use a test domain, provision every recipient, or plan a real change window with a rollback. If the company cannot tolerate a mail interruption, stop here and use a supported setup instead.

HEY's own setup flow is the source of truth for its DNS records and mail host. Do not blindly copy the hostname from my screenshot because infrastructure has an annoying habit of changing after a blog post is published.

In Google Workspace, add and verify the domain as a primary or secondary domain. I used a proper Workspace domain, not a domain alias. Then confirm the public MX record points to Google again before continuing.

## Give Google a Route to HEY

In the [Google Admin console](https://admin.google.com/), go to **Apps → Google Workspace → Gmail → Hosts**.

1. Click **Add Route**.
2. Give the route a useful name. Mine is imaginatively called `HEY`.
3. Choose **Single host**.
4. Enter the HEY mail host shown during your HEY for Domains setup. Mine was `work-mx.app.hey.com`.
5. Use port `25`.
6. If you entered a mail-server hostname, leave **Perform MX lookup on host** off.
7. Keep Google's recommended TLS and certificate checks enabled, then run **Test TLS connection**.
8. Save the route.

![Google Workspace mail route pointed at the HEY mail host](/images/blog/hey-google-workspace-dual-delivery/01-hey-mail-route.png)

If the TLS test fails, stop there. Google warns that a saved route with failed certificate validation can bounce messages, which is a fairly dramatic way to discover you copied the wrong hostname.

## Tell Google Which Mail to Copy

Now go to **Apps → Google Workspace → Gmail → Routing**. The current [dual-delivery guide](https://support.google.com/a/answer/9228551) describes the same underlying setup, but its internal-message choice differs from the one shown in my 2025 screenshot.

1. Add a new routing rule and give it a name.
2. Select **Inbound** so messages from outside the company are included.
3. Select the internal-message option Google currently calls **Internal outbound** so mail sent by coworkers is included too.
4. Set the action to **Modify message**.
5. Under **Also deliver to**, enable **Add more recipients** and click **Add**.
6. Switch the recipient dialog to **Advanced**.
7. Enable **Change route** and select the HEY route you created.
8. Leave **Do not deliver spam to this recipient** and **Suppress bounces from this recipient** enabled unless you have a specific reason not to.

![The message types selected in my 2025 Google Workspace routing rule](/images/blog/hey-google-workspace-dual-delivery/02-routing-message-types.png)

*My old Admin console showed and used Internal - Receiving. Google's current dual-delivery instructions say Internal outbound. Follow the current written instructions, not the historical checkbox label in this screenshot.*

![Adding HEY as the additional recipient route](/images/blog/hey-google-workspace-dual-delivery/03-add-recipient-and-address-list.png)

If Google and HEY use the exact same domain, leave the envelope recipient alone. `you@example.com` can stay `you@example.com`.

I was also receiving mail on additional Workspace domains. For those, I enabled **Change envelope recipient → Replace domain** and supplied the domain hosted by HEY. That turns something like `ryan@old-domain.example` into `ryan@hey-domain.example` while preserving the username.

![Changing the route and replacing the recipient domain for an alternate address](/images/blog/hey-google-workspace-dual-delivery/04-change-route-and-domain.png)

## Limit the Blast Radius

I did not want every mailbox copied to HEY. Only mine.

Expand the routing rule's options, enable **Use address lists to bypass or control application of this setting**, and choose **Only apply this setting to specific addresses/domains**. Create an address list containing every address that should land in HEY, including aliases on any additional domains.

This is the difference between "Ryan is trying a weird email setup" and "Ryan has accidentally volunteered the entire company for a weird email setup."

Save the recipient, save the routing rule, and remember that Google says routing changes can take a few hours to propagate.

## I Made Gmail the Backup

Once I trusted the route, I stopped treating Gmail as a second inbox. I added a Gmail filter matching `to:(*)` and told it to **Skip the Inbox**.

![Gmail filter that archives matching incoming mail](/images/blog/hey-google-workspace-dual-delivery/05-gmail-skip-inbox-filter.png)

That gave me a searchable copy in Gmail without two places demanding attention. It worked for my mail patterns, but do not assume a broad Gmail filter catches every BCC, Group, alias, and automated message. Test it before declaring the inbox dead.

## Test the Boring Cases

Email routing is not finished when one message from your personal Gmail account arrives successfully. Test the paths you will forget about until they fail during something important:

- An external sender to your main address
- A coworker on the same Workspace domain
- A Google Group or shared address
- Every alias and secondary domain you added
- Replies sent from HEY with the correct From address
- Reply-all messages with non-HEY recipients CCed
- BCC messages and automated notifications
- Spam handling and bounces

Also check SPF, DKIM, and DMARC after the change. Google and HEY may both send mail for the domain, so both systems need to authenticate correctly. One bad DNS edit can make a setup look perfect from your inbox while everyone else's spam folder tells a different story.

## The Known CC Quirk

When you reply to an email in HEY, anyone CCed who is not a user in your HEY account is automatically removed. That makes complete sense when HEY is being used as intended and the whole company lives there. In this hybrid setup, it means coworkers who stayed in Google Workspace can quietly disappear from the reply.

Check the CC field before sending. If those people still need to be part of the conversation, add them back manually.

I have come to appreciate this as a useful little checkpoint: does everyone on this email actually need to be here? Often the answer is no. When the answer is yes, it takes a few seconds to put them back.

## What You Give Up

This gets one person most of the HEY experience without moving the company. It does not turn a mixed Google/HEY setup into a normal, supported HEY for Domains deployment.

HEY's team features assume the team uses HEY. Extensions, shared threads, private comments, and the other collaboration pieces will not magically include coworkers who stayed in Gmail. HEY explicitly says a company using HEY for Domains should switch everyone.

There are more edge cases here than in a normal mail setup, support may reasonably point at the other provider, and either company can change behavior later. If email retention, legal discovery, or guaranteed vendor support matters more than my desire to use the Screener, use the boring supported configuration.

For me, the trade was worth it. My team kept Google Workspace. I kept HEY. Gmail became a silent backup instead of a daily argument.

Not elegant. Not official. Surprisingly durable.

## References

- [Google Workspace: Deliver email to multiple inboxes with dual delivery](https://support.google.com/a/answer/9228551)
- [Google Workspace: Add mail servers for Gmail email routing](https://support.google.com/a/answer/2614757)
- [Google Workspace: Add Gmail routing settings](https://support.google.com/a/answer/6297084)
- [HEY: Does our whole company have to switch?](https://help.hey.com/article/753-does-our-whole-company-have-to-switch)
- [HEY for Domains setup](https://www.hey.com/domains/get-started/)
