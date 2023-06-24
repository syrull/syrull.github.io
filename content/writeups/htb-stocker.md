---
title: "Hack The Box - Stocker [Easy]"
date: 2023-02-09T19:42:27+03:00
draft: false
description: Hack The Box - Stocker [Easy]
---

<iframe style="width:100%; height:400px;" src="https://www.youtube.com/embed/yUWk88U55_M" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

# Short Overview

This box consist of several vulnerabilities:
* [NoSQL Injection](https://book.hacktricks.xyz/pentesting-web/nosql-injection) - Specifically the part with sending the payload using JSON, we use this vulnerability to bypass the login process.
* [Server Side Template Injection](https://book.hacktricks.xyz/pentesting-web/ssti-server-side-template-injection) - We could directly use HTML and then inject an `iframe` which `src` is set to `/etc/passwd` and after that we traverse the application itself to find the MongoDB user/password, and we used those to connect successfully to the machine using the password provided there. With that, we owned the User.
* [Linux Privilege Escalation](https://book.hacktricks.xyz/linux-hardening/privilege-escalation) - Then we use `sudo -l` to check what commands are we allowed to execute with root privileges. And we exploited the `node` executable, which runs with root privileges, to own the System.
