---
title: "Hack The Box - Investigation [Medium]"
date: 2023-02-10T19:42:27+03:00
draft: true
description: 
---

<iframe style="width:100%; height:400px;" src="https://www.youtube.com/embed/bYAHMY38kHE" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

This box consist of several vulnerabilities:

* [Command Injection](https://book.hacktricks.xyz/pentesting-web/command-injection) - Used a vulnerability in `exiftool` that allowed me to run arbitrary code.
* Leaked Credentials - Then we found the `.msg` file which contained an event logs from a Windows machine where we found the credentials for user `smorton`. I wasted a lot of time an effort to figure that one out, so don't be discouraged when you can't find it in the first 5 mins. 
* Sudo commands - We then found the mysterious `/usr/bin/binary` file that we could use sudo with and that led us to analyze it further where we found that it accepts 2 arguments, and it downloads a file, saves it with a specific name and runs it using `perl`.

# References
- https://blog.convisoappsec.com/en/a-case-study-on-cve-2021-22204-exiftool-rce/
- https://gist.github.com/ert-plus/1414276e4cb5d56dd431c2f0429e4429
