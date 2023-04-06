---
title: "Hack The Box - Broscience [Medium]"
date: 2023-02-09T19:42:27+03:00
draft: false
description: 
---

<iframe style="width:100%; height:400px;" src="https://www.youtube.com/embed/VBwhq7JRn_U" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

# Short Overview

The video consist of my process of enumeration and overall hacking the machine, please use this as a walkthrough.

This box consist of several vulnerabilities:
* [Local File Inclusion/Path traversal](https://book.hacktricks.xyz/pentesting-web/file-inclusion) - The query string `path=` in the `img.php` file is vulnerable to that, with that we can download the site map that I've discovered using Burp
* [Deserialization](https://book.hacktricks.xyz/pentesting-web/deserialization) / [PHP Object Injection](https://owasp.org/www-community/vulnerabilities/PHP_Object_Injection) - I saw that in the `utils.php` file, and I've prepared a payload for the `AvatarInterface` since this is the class that is using magic methods, and it has the `file_get_contents` function that we are going to use to pull the PHP reverse shell.
* [Linux Privilege Escalation](https://book.hacktricks.xyz/linux-hardening/privilege-escalation) - By pure luck, I noticed the `renew_cert.sh` in the `/opt/` folder, and I immediately noted that this must be the vector that needs to be leveraged to gain privilege escalation. A much better way to figure out this can be the [pspy](https://github.com/DominicBreuker/pspy) tool, which could have shown me this command that is being run as root: `timeout 10 /bin/bash -c /opt/renew_cert.sh /home/bill/Certs/broscience.crt` and I did look up for some hints, thanks to [gatogamer1155](https://gatogamer1155.github.io/htb/broscience/)and his writeup for this machine.