---
title: "Hack The Box - MetaTwo [Easy]"
publishedAt: 2023-08-20
description: "HTB Writeup"
isPublish: true
---

Starting out with `rustscan`

```bash
Open 10.10.11.186:21
Open 10.10.11.186:22
Open 10.10.11.186:80
[~] Starting Script(s)
[~] Starting Nmap 7.93 ( https://nmap.org ) at 2023-04-21 16:34 EEST
Initiating Ping Scan at 16:34
Scanning 10.10.11.186 [2 ports]
Completed Ping Scan at 16:34, 0.05s elapsed (1 total hosts)
Initiating Parallel DNS resolution of 1 host. at 16:34
Completed Parallel DNS resolution of 1 host. at 16:34, 0.23s elapsed
DNS resolution of 1 IPs took 0.23s. Mode: Async [#: 1, OK: 0, NX: 1, DR: 0, SF: 0, TR: 1, CN: 0]
Initiating Connect Scan at 16:34
Scanning 10.10.11.186 [3 ports]
Discovered open port 21/tcp on 10.10.11.186
Discovered open port 22/tcp on 10.10.11.186
Discovered open port 80/tcp on 10.10.11.186
Completed Connect Scan at 16:34, 0.05s elapsed (3 total ports)
Nmap scan report for 10.10.11.186
Host is up, received syn-ack (0.050s latency).
Scanned at 2023-04-21 16:34:41 EEST for 0s

PORT   STATE SERVICE REASON
21/tcp open  ftp     syn-ack
22/tcp open  ssh     syn-ack
80/tcp open  http    syn-ack
```

We can see that we have an FTP open, this will be of use later on. Going to the main website on port `80` we can see that there is a some sort of blog site. Using `whatweb` we can get some versions:

```
http://metapress.htb/events/ [200 OK] Cookies[PHPSESSID], Country[RESERVED][ZZ], HTML5, HTTPServer[nginx/1.18.0], IP[10.10.11.186], MetaGenerator[WordPress 5.6.2], PHP[8.0.24], PoweredBy[--], Script, Title[Events &#8211; MetaPress], UncommonHeaders[link], WordPress[5.6.2], X-Powered-By[PHP/8.0.24], nginx[1.18.0]
```

We can see that this is a WordPress and the booking thing certainly looks like a plugin, so let's see the name of the plugin:

```
GET /wp-content/plugins/bookingpress-appointment-booking/images/front-confirmation-vector.svg HTTP/1.1
Host: metapress.htb
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.5615.50 Safari/537.36
Accept: image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8
Referer: http://metapress.htb/thank-you/?appointment_id=NA==
Accept-Encoding: gzip, deflate
Accept-Language: en-US,en;q=0.9
Cookie: PHPSESSID=cdoa77oamq1dbr9puh51s108jq
Connection: close
```

From this request, we can see that the plugin name is `bookingpress`, a simple google search would yield that this plugin is vulnerable to SQL Injection (`CVE-2022-0739`).

Using that vulnerability, we can get the password for the `manager` user

```
admin $P$BGrGrgf2wToBS79i07Rk9sN4Fzk.TV.
manager $P$B4aNM28N0E.tMy/JIcnVMZbGcU16Q70:partylikearockstar
```

We can now log in into the `wp-admin` using the `manager` account.

From there we can see that the dashboard is pretty simple and the only pivoting point would be the upload of the media, so googling around I found `CVE-2021-29447` that exposes a XXE vulnerability in the Media Library.

[More Information](https://blog.wpsec.com/wordpress-xxe-in-media-library-cve-2021-29447/)

I've used the exact exploit used in the article (with adjusted payloads). The exploit returned some files such as `/etc/passwd` from where I got the user `jnelson`, the `nginx` config `etc/nginx/sites-available/default`, and the `wp-config.php`. 

Using the config from the `nginx` I saw the path to the WordPress site.

```
root /var/www/metapress.htb/blog;
```

And I've got the `wp-config` on this location `/var/www/metapress.htb/blog/wp-config.php`

```php
define( 'FS_METHOD', 'ftpext' );
define( 'FTP_USER', 'metapress.htb' );
define( 'FTP_PASS', '9NYS_ii@FyL_p5M2NvJ' );
define( 'FTP_HOST', 'ftp.metapress.htb' );
define( 'FTP_BASE', 'blog/' );
define( 'FTP_SSL', false );
```

From there we can log into the FTP, and there we can see the `send_email.php` file, inspecting it we will see the password for the `jnelson`. Now, we can log in using `ssh`. 

The root credentials are in the `~/pass` file.

```bash
jnelson@meta2:~$ cat user.txt
<hash>
jnelson@meta2:~$ cat pass
credentials:
- comment: ''
  fullname: root@ssh
  login: root
  modified: 2022-06-26 08:58:15.621572
  name: ssh
  password: !!python/unicode 'p7qfAZt4_A1xo_0x'
- comment: ''
  fullname: jnelson@ssh
  login: jnelson
  modified: 2022-06-26 08:58:15.514422
  name: ssh
  password: !!python/unicode 'Cb4_JmWM8zUZWMu@Ys'
handler: passpie
version: 1.0
jnelson@meta2:~$ su - root
Password: 
root@meta2:~# cat /root/root.txt
<hash>
root@meta2:~# 
```
