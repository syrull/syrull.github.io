---
title: "Tracking Down the Bulgarian Marketplace Scams"
date: "2024-12-19"
tags:
  - investigation
  - analysis
  - research
  - scam
  - Bulgaria
toc: true
math: true
bold: true
nomenu: false
---

## Introduction

This is rather an unusual article that I would be publishing. I usually don't do threat hunting or any amount of hunting outside work, but this one got personal.

> This is probably a good place to state that this is not related to my work activities and that I am doing this of my own accord!

## Research

Let's start from the beginning. A little while ago, I was contacted by a person in a marketplace for an item that I was selling. The first rather odd thing was that he contacted me on Viber. You may not know, but Viber is really popular in my country, and people use it for most things, even some government entities use Viber bots to inform people. The person spoke good Bulgarian, and there wasn't anything striking at first. There was no punctuation or dots, so it’s not something that is being generated. Also, the particular words that he was using indicated that he was not a bot. He asked me if the item was available, and we kept the conversation short. He didn't reply immediately; I think he even went to sleep for the rest of the night, but he was right back in the morning. After we exchanged some messages back and forth, he agreed on the price that I had posted and offered to send a courier to pick up the item.

Now, this is the point where I would usually spot that something was off, but the nature of this item actually required someone to come pick it up, so that offer made sense at the time. I agreed, and the next thing I knew, he was asking me to click on a link and enter my details for the courier. At this point, I knew that someone was trying to scam me, but I wanted to see how they operated before cutting the rope. Their flow was as follows:

1. They claim to have made a request on the courier's website and send you a link to a phishing site.
2. They make you believe it is legitimate by sending edited screenshots from the actual website, where their claim is seemingly "confirmed" by the courier.
3. You enter your details.
4. PROFIT!!

When they sent me the website, it was specific to my item. It had the title of my item and the agreed price. I got even more interested. I went back and checked their profile. It was a legitimate name with a legitimate profile picture (probably taken from Facebook), and they even had a proper phone number within the country. It was a bit sophisticated, and I could see how some people might actually be deceived by the scam.

I wanted to investigate further. I went back to the messenger and typed in English, asking something along the lines of, "How successful is this scam?" However, the person responded in very broken language, wished me luck, and then blocked me. The interesting part was that their previously non-bot-like messages suddenly changed, and they started typing like someone who did not speak the language fluently. That was fine, I still had the website (at least for the next couple of hours).

![Scam - Screenshot 01](/images/scamscr01.png)

In the screenshot, this is an item I found through a sequential ID. The address appears to be random, and the Viber user matches the one specified on the website, "Роселина Сопаджиева." This is a rather specific name, it’s not the usual "John Doe," which is interesting!

> _Note_: During my investigation of that name, I discovered it perfectly matches a generated name from the testing library `Faker`. I found the combination within their test data: [GitHub Link](https://github.com/fzaninotto/Faker/blob/master/src/Faker/Provider/bg_BG/Person.php).

I tried to gather as many indicators as possible, including the HTML of the page, any links to JavaScript files, etc. Afterward, I fuzzed the website for other resources and found a couple more artifacts, which I downloaded to keep as references. The link they sent me was along the lines of `track/318418341`. I noticed the number looked sequential, so I checked 3-4 numbers above and below it, and it worked. I found pages for other articles listed in the marketplace, so it wasn’t specifically tailored for my item... pity. Anyway, I wanted to learn more about the domain.

I quickly scanned it using `crt.sh`, `assetfinder`, and a couple more tools, and I discovered one additional subdomain.

```
alo.bg-inc63284.pics
```

**alo.bg** is another marketplace platform in our country. I got curious about what would happen if I created a list of all couriers and marketplaces we have, would they resolve? You bet they would!

```
speedy                  [Status: 302, Size: 0, Words: 1, Lines: 1, Duration: 177ms]
olx                     [Status: 302, Size: 0, Words: 1, Lines: 1, Duration: 186ms]
bazar                   [Status: 302, Size: 0, Words: 1, Lines: 1, Duration: 196ms]
alo                     [Status: 302, Size: 0, Words: 1, Lines: 1, Duration: 201ms]
econt                   [Status: 302, Size: 0, Words: 1, Lines: 1, Duration: 253ms]
dpd                     [Status: 302, Size: 0, Words: 1, Lines: 1, Duration: 241ms]
```

I found other subdomains that were not set up (blank pages). The only one working was the `econt` subdomain. I then tried to get the server IP, but the entire setup was protected by Cloudflare, so no luck there. With no other options left, I turned to VirusTotal to see if I could connect the indicators I had gathered (HTML/CSS/JS files) to anything else.

I uploaded a few samples but initially got nothing, until I uploaded one specific SVG file:

- [VirusTotal Link](https://www.virustotal.com/gui/file/51643c716a8f10f2ddf4c7469d7a337e3383fc6a9718a0c2b70bc68a87c83e8d/relations)

In the **Relations tab**, it showed how this file connected to the rest of VirusTotal’s database. To my surprise, it revealed a lot of ZIP files.

![Scam - Screenshot 02](/images/scamscr02.png)

I even found one tailored specifically for the Bulgarian platform: `OLX BG.zip`. I downloaded a few samples to explore their contents and discovered that these ZIP files contained the entire scam projects! Apparently, there isn’t much trust among the scammers, as there were so many results available.

Next, I wanted to understand what these projects were and how they related to the ongoing scam I was experiencing. So, I proceeded to download some of the samples, focusing on getting the most recent ones.

Before examining the systems, I looked for other similar websites to identify additional domains. One very useful feature of the website [urlscan.io](https://urlscan.io) is its ability to find structurally similar websites that have been scanned through it. By checking the original sample I had and exploring the related pages, I discovered many domains that looked similar:

![Scam - Screenshot 03](/images/scamscr03.png)

If we check some of the websites, we find:

![Scam - Screenshot 04](/images/scamscr04.png)

Which is extremely similar to the one we already have. Now, let’s begin by examining how these systems operate.
# Examining the systems

Now, returning to the Relations tab of the SVG file, I downloaded couple of ZIP files. 

![Scam - Screenshot 05](/images/scamscr05.png)

One of them, named:

```
eb09ee4f032eaefd5374f1b55a0fcee8b1f8f77739739cc9160a9e2aa4b00fcf
```

contained a folder titled "swarovsky (скрипт скам тимы по площадкам)," which translates to "Swarovsky (scam team's script for platforms)."

Now, a quick look at the system.

The system appears to be a complete phishing solution integrated with a Telegram bot that can perform various functions, such as:

- Creating Bitcoin wallets
- Sending SMS/Receiving SMS
- Generating Numbers (through various services)
- Adding or deleting domains from a pool of phishing domains

Additionally, I noticed the author of the system was listed in the `author` attribute of the `package.json` file.

```json
"name": "zerorent",
"version": "2.0.0",
...
"author": "t.me/zerorent",
```

In the `config.json` we have some interesting attributes such as "teamInfo" with the this information:

```json
"teamInfo": {
	"name": "SVAROVSKY",
	"admin_username": "halloset",
	"chat_link": "https://t.me/+qXQ4DjC1mpIwODIy",
	"profits_channel": "https://t.me/+76MdR782BHk4NzNi"
}
```

I've actually went my way to find other ZIPs and the others were for some other teams such as:

```json
"teamInfo": {
	"name": "DD Team",
	"admin_username": "pitbull_dev",
	"chat_link": "https://t.me/+W9cVKpb2G9UyNzdi",
	"profits_channel": "https://t.me/+pEIFN3rNpbdhZjcy"
}
```

So apparently this system is being sold to a different "Teams", more on that later.

I also noticed that there is some nginx configuration that are containing different domains for each server, for example:

```
eu-zr73gs.site
olx.eu-zr73gs.site
mbway.eu-zr73gs.site
...
```

> Full list of domains will be in the artifacts below the article!

To sum it up, this is a Node.js system that hosts both a web module with some web APIs and a Telegram bot.

I also explored other systems. The "ScamBotTg-main.zip" file stood out as particularly interesting because it contained numerous ZIP files, each seemingly tailored for different marketplace websites, such as:

```
Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
------         4/30/2022   6:37 AM         395107 ALLERGO.zip
------         4/30/2022   6:37 AM          92168 Alpha.zip
------         4/30/2022   6:37 AM         200695 AUTO.RU .zip
------         4/30/2022   6:37 AM         188942 AVITO RENT.zip
------         4/30/2022   6:37 AM         590225 avito.zip
------         4/30/2022   6:37 AM         404599 Bazos.zip
------         4/30/2022   6:37 AM        1479906 Belpost.zip
------         4/30/2022   6:37 AM        1344061 BlaBlaCar.zip
------         4/30/2022   6:37 AM          60557 Boxberry.zip
------         4/30/2022   6:37 AM         104168 Cdek.zip
------         4/30/2022   6:37 AM          30558 Dostavista.zip
------         4/30/2022   6:37 AM        1796004 Europost.zip
------         4/30/2022   6:37 AM        1582886 FanCourier.zip
------         4/30/2022   6:37 AM        1236207 Fargo.zip
------         4/30/2022   6:37 AM         382696 IZI.zip
------         4/30/2022   6:37 AM        1199455 Kazpost.zip
------         4/30/2022   6:37 AM         577890 Kufar.zip
------         4/30/2022   6:37 AM         883170 MVIDEO.zip
------         4/30/2022   6:37 AM         222145 O YANDEX.zip
------         4/30/2022   6:37 AM         265066 OLX BG.zip
------         4/30/2022   6:37 AM         378568 OLX KZ RENT.zip
------         4/30/2022   6:37 AM         437208 OLX KZ.zip
------         4/30/2022   6:37 AM         623993 OLX PL.zip
------         4/30/2022   6:37 AM        1507238 OLX RO.zip
------         4/30/2022   6:37 AM         276784 OLX UA.zip
------         4/30/2022   6:37 AM        1318365 PECOM.zip
------         4/30/2022   6:37 AM          30873 POCHTA.zip
------         4/30/2022   6:37 AM            139 README.md
------         4/30/2022   6:37 AM         247882 SBAZAR.zip
------         4/30/2022   6:37 AM         129725 Sberbank.zip
------         4/30/2022   6:37 AM         837544 Yandex.zip
------         4/30/2022   6:37 AM         193872 YOULA RENT.zip
------         4/30/2022   6:37 AM         595278 Youla.zip
------         4/30/2022   6:37 AM       13526272 Тинька бот.zip
```

And there’s also a `README.md` file. The naming convention of the file suggests that it was likely downloaded from GitHub or a similar repository.

The README:

```md
# ScamBotTg
Скамим ребятушек по Европе и СНГ через телеграм-бота и веб-часть на PHP
```

Meaning:

```
We're scamming kids across Europe and the CIS via a Telegram bot and a web part on PHP.
```

I understand the European part, but as you can see in the files, there are Russian-specific markets as well. CIS refers to countries like Russia, Belarus, Kazakhstan, Moldova, etc. As far as I know and understand the Russian cyberspace, hackers typically don’t cross the "redline" that is the CIS. However, these individuals aren’t hackers, are they? :)

Now, let’s take a look at what’s inside the `OLX BG.zip` file.

```
Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
d-----        11/20/2020   8:13 PM                assets
d-----        11/20/2020   8:13 PM                cgi-bin
d-----        11/20/2020   8:13 PM                img
-a----        10/27/2020  12:09 AM            302 .htaccess
-a----        10/27/2020  12:09 AM             51 3ds.php
-a----        10/27/2020  12:09 AM             51 buy.php
-a----        10/27/2020  12:09 AM             52 cash.php
-a----        10/27/2020  12:09 AM           4158 favicon.ico
-a----        10/27/2020  12:09 AM             43 index.php
-a----        10/27/2020  12:09 AM             83 logo.php
-a----        10/27/2020  12:09 AM           9673 logo.png
-a----        10/27/2020  12:09 AM             56 merchant.php
-a----        10/27/2020  12:09 AM             53 order.php
-a----        10/27/2020  12:09 AM             54 refund.php
-a----        10/27/2020  12:09 AM             25 robots.txt
-a----        10/27/2020  12:09 AM             54 unlock.php
-a----        10/27/2020  12:09 AM             56 _delivery.php
-a----        11/22/2020  12:02 PM           1292 _set.php
```

This one wasn’t interesting at all. It wasn’t connected to the app I was dealing with, as I noticed files that weren’t present in the assets I had. It was a completely different system. Essentially, it logged all POST/GET requests and sent them to `sh1327157.a.had.su/_remote.php`. The same behaviour is applied to every system included in the ZIP files. The remote domains also changed with each ZIP I examined.

Now, I noticed that `13526272 Тинька бот.zip` is the largest file in the collection, so let’s check that one out.

```
Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
d-----          2/6/2021   7:10 AM                bin
d-----          2/6/2021   7:10 AM                cards
d-----         12/7/2020   7:23 PM                cars
d-----          8/9/2020   5:47 PM                cgi-bin
d-----        12/11/2020   2:49 AM                checks
d-----          2/5/2021   8:57 PM                domains
d-----        12/11/2020   2:48 AM                edited
d-----         11/7/2020   3:16 PM                fonts
d-----         11/7/2020   3:16 PM                foredit
d-----          2/5/2021  10:08 PM                functions
d-----         11/7/2020   3:16 PM                images
d-----          2/6/2021   6:36 AM                items
d-----         6/10/2020   6:57 AM                keys
d-----         10/2/2020   9:55 AM                logs
d-----        10/12/2020  11:54 AM                mails
d-----          2/5/2021   9:38 PM                pages
d-----         8/13/2020   5:27 PM                pay.libs
d-----          2/6/2021   7:10 AM                pays
d-----        12/11/2020   2:48 AM                qrcode
d-----        12/11/2020   2:50 AM                rendering
d-----         12/7/2020   7:24 PM                rent
d-----        11/27/2020  11:50 PM                scripts
d-----          2/5/2021  10:13 PM                settings
d-----        12/11/2020   3:09 AM                stats
d-----        11/29/2020   5:36 PM                styles
d-----         11/7/2020   3:16 PM                temp
d-----        12/11/2020   2:48 AM                tracks
d-----          2/5/2021  10:02 PM                users
d-----         11/7/2020   3:16 PM                vendor
-a----        11/28/2020   7:15 PM            302 .htaccess
-a----        11/20/2020   2:43 PM            219 alert.php
-a----         10/5/2020  12:02 AM           5532 asd.php
-a----        11/22/2020   3:38 PM            831 cleaner.php
-a----         10/2/2020   4:00 PM           1454 data.php
-a----          8/9/2020   5:47 PM           3132 index.html
-a----         6/20/2020  11:54 AM             48 index.php
-a----         6/19/2020   9:46 AM             25 robots.txt
-a----          2/5/2021   9:31 PM            312 services.json
-a----          2/5/2021  10:18 PM         338043 tinkoff.php
-a----          2/6/2021   6:37 AM           5151 XML_daily.asp
-a----          2/6/2021   7:34 AM           4614 _config.php
-a----         8/14/2020   4:50 PM           2492 _mail.php
-a----        11/17/2020   7:42 AM           1672 _recvsmsPL_shb.php
-a----        10/24/2020   2:17 PM           1670 _recvsms_shb.php
-a----          2/5/2021   9:44 PM         158385 _remote.php
-a----        10/23/2020   7:58 AM            940 _sendsms_clk.php
-a----          2/5/2021  10:45 PM          59664 _set.php
```

There are a lot of interesting elements in `_config.php`, including functional email addresses registered in the US with fake phone numbers. There are also Telegram channels used for reporting various activities, such as `chatProfits`, `chatAlerts`, `chatCard`, `linkScreen`, and others. These contain Telegram Bot URLs and credentials.

Additionally, there are files used to send SMS for "verification" purposes, leveraging services like `smshub.org` and `clickatell.com`. The system also includes proxies with usernames and passwords. I noticed they heavily use `.txt` files as their "database," which is good for me since these files were scattered throughout the directory. This includes a `domains.txt` file listing various domains. Another interesting feature is a Telegram bot that seems to act as a "proxy," duplicating the functionality of the control panel file.

Overall, this system appears to be modular, with the ZIP files serving as individual modules for the main system.

The first few samples didn’t tell me much, so I went ahead and downloaded over 100 similar systems to get a better picture. I wanted to gather as many Indicators of Compromise (IOCs) as possible, so I wrote some automation scripts to extract the contents and scan for things like URLs, credentials, Telegram groups, Telegraph articles, and secrets. By the end of it, I had some massive lists of indicators to dig into further.

Since I found a ton of Telegram bot API keys, I decided to create a Telegram bot checker. My goal was to see which bots were still active and, hopefully, uncover more information about the people running them. This gave me a better understanding of how these systems work and who might be behind them. It resulted in a few active bots that were currently operating.

I found multiple chats and groups, which I exported and ran through ChatGPT to better understand what they were talking about. Looking back, it might seem a bit excessive, but it helped me uncover a lot of groups that can be reported. So, let’s take a closer look:

## Who are those people?

In summary, I have identified individuals who are either from Russia or Russian-speaking. I have uncovered more than 10,000 people involved in these types of scams. These individuals are scamming people across Europe and beyond. I found evidence of their activities in countries such as Germany, Spain, Italy, the Czech Republic, Romania, Bulgaria, and more.

The organization of these individuals operates within teams. Each team consists of multiple sub-teams, and every team has a "Вбивер." According to [minsknews.by](https://web.archive.org/web/20241218072847/https://minsknews.by/kto-takie-vorkery-i-vbivery-i-za-chto-im-grozit-surovoe-nakazanie/), a "Вбивер" is described as a person who, "having access to card details, uses them for their own purposes: stealing money from the account or purchasing goods, services, and other items."

However, I don’t think this is the case. Since I can see multiple "workers" connected to the same "Вбивер," I assume this refers more to the "system" they are using rather than a single individual.

Example given:

![Scam - Screenshot 06](/images/scamscr06.png)

As you can see the "Вбивер" is the same but the workers are different people. Some of the people having "Наставник" (Mentor) which I assume that those people are in a testing period.

Now I was a bit lost, since I haven't found anything about Bulgaria so far, one interesting thing however caught my attention and that is the tutorials that they are sharing are always exclusively on "telegra.ph," this is _an anonymous publishing platform by Telegram_ that lets anyone post stories without having to register an account.

They have multiple articles for various of things:

- How to use VPNs
- How to use the platforms that they are scamming (e.g.. OLX)
- Various platforms for getting phone numbers and setting WhatsApp/Viber Accounts

And I noticed that the titles are simply a slug followed by the date, I've seen some manuals for OLX and the URLs are typically like:

```
Manual-po-SUBITO-20-03-06
Rumyniya-OLX-20-03-06
```

So I thought that maybe with a bit of brute forcing we can find some articles, thankfully someone thought of that already.

[Telegcrack](https://telegcrack.com/) does exactly that, so I set out to uncover some names. Eventually, I came across a manual for scamming on OLX Bulgaria. It contained information on how to set up tools like "Bluestacks," an Android emulator for running Viber, obtaining phone numbers from "onlinesim.io," and a brief overview of the Bulgarian marketplaces where scammers target victims.

The listed marketplaces included:

- bazar.bg
- olx.bg
- alo.bg
- Facebook groups

The tutorial also advised focusing on large items such as "washing machines, fridges, pianos" to make the scam appear more credible. At the beginning of this article, I mentioned that the item I was selling was large, and it turns out I was right to suspect something.

Wanting to dig deeper, I discovered bots though some were no longer active. However, through other sources, I found active scam bots available for rent to scammers. One example is "AsyncRent," (not to be mistaken with AsyncRAT) which operates in Bulgaria via OLX and Econt, along with a tutorial I managed to find. I even identified the individuals "developing" these bots. But now what?

I shifted my focus to those using the bots. To my surprise (not really looking back), I uncovered a group of kids sharing memes and making their scam victims take photos or perform other humiliating acts. At this point, I decided to end my investigation.
## Conclusion

I did all this hunting simply because I hate scammers, and I hate that I found a "culture" that builds scammers and believes that doing something like that is "work." One can only speculate how those massive groups are still operating out in the open with their real names and profile pictures.

So... what’s next? Nothing, really. I don't think Telegram cares enough to do anything and even if they do, they will resurface again within days or even hours and will continue to operate. The best we can do is highlight the scams.

If you've made it this far into the article, it means a lot to me, and I thank you!

## Artifacts

| Artifacts | Description   |
|---        |---            |
|[domains.txt](/scam-artifcats/domains.txt)| Domains that I've encountered and extracted; most of them are probably inactive at this point. |
|[hashes.txt](/scam-artifcats/hashes.txt)| Samples that I've collected; I may have encountered more that I forgot to include, but this list should be fairly comprehensive. |
|[telegram_users_and_bots.txt](/scam-artifcats/telegram_users_and_bots.txt)| Users who are admins of some scam groups, along with a list of Telegram bots that are likely instances of the systems I analyzed. |
|[telegraph_articles.txt](/scam-artifcats/telegraph_articles.txt)| A collection of Telegraph articles about scamming, anonymity, and various tutorials. |
|[telegram_chats_groups.txt](/scam-artifcats/telegram_chats_groups.txt)| A collection of Telegarm channels/groups and so on, all related to scams. |


> Note: I've reported many of those it is very possible that some of them won't be working.

| Trackings | Description   |
|---        |---            |
| [urlscan.io - Booking Like](https://urlscan.io/result/9f3e25dd-6332-4a1e-bb47-e1517502e284/related/) | Structually similar websites in urlscan.io |
| [urlscan.io - Marketplaces Like](https://urlscan.io/result/1339ceb3-d10a-4840-a344-a2a2dcdc929b/related/) | Structually similar websites in urlscan.io |
| [VirusTotal - IOC Collection](https://www.virustotal.com/gui/collection/cc4b5a0cf8ac19151b795ba89c887a1b41c067f1b7c069b96da15a223c62c1d4/summary) | Collection of IOCs that I gathered, basically the TXTs in VT |
