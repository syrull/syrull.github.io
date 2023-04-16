---
title: "Hack The Box - Inject [Easy]"
date: 2023-04-03T02:01:27+03:00
draft: true
tags: ["hackthebox"]
---

The machine is labeled misleadingly *easy*, but that can lead you to miss stuff, so make sure to check **everything**! 

A simple `nmap` scan shows us that `8080` port is open.

```bash
Nmap scan report for 10.10.11.204
Host is up (0.13s latency).
Not shown: 998 closed tcp ports (conn-refused)
PORT     STATE SERVICE     VERSION
22/tcp   open  ssh         OpenSSH 8.2p1 Ubuntu 4ubuntu0.5 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey:
|   3072 caf10c515a596277f0a80c5c7c8ddaf8 (RSA)
|   256 d51c81c97b076b1cc1b429254b52219f (ECDSA)
|_  256 db1d8ceb9472b0d3ed44b96c93a7f91d (ED25519)
8080/tcp open  nagios-nsca Nagios NSCA
|_http-title: Home
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel
```

Let's start by simply inspecting the website that is running on port `:8080`.

The website seems like it has an upload form that we can upload images, my initial thought was LFI vulnerability, so I've checked it and I found it.

```
http://10.10.11.204:8080/show_image?img=<vulnerable  to LFI>
```

Now I've wandered around exploring the website's source code and after a bit of digging and searching I was on the verge of giving up. Since the machine is labeled easy, I didn't exactly expect that the way to find a vulnerability is through https://spring.io/security/cve-2022-22963 (CVE-2022-22963) and I overlooked the versions that were listed in the maven build file (which you could exfiltrate from the LFI vulnerability).

After that, a reverse shell using this https://github.com/lemmyz4n3771/CVE-2022-22963-PoC POC was easy-peasy.

While enumerating the users, we can see that we have `root, phil ,frank` and a group that is called `staff`. So changing from `frank` to `phil` was through `/home/frank/.m2/settings.xml` which had the credentials to change the user to `phil`.

You can get your first flag after that.


Changing to root was a bit tricky at first since I was trying to create a new playbook, which caused some errors and I finally decided to use the currently created one with the following payload.

```bash
$ echo '[{hosts: localhost, tasks: [shell: /bin/sh </dev/tty >/dev/tty 2>/dev/tty]}]' > ./playbook_1.yml
<blabla>
$ bash -p
$ whoami
root
```

And there we have it!