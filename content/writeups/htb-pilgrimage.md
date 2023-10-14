---
title: "Hack The Box - Pilgrimage [Easy]"
date: 2023-06-25T10:42:27+03:00
draft: false
tags: ["hackthebox"]
---

I started off with `rustscan`

```bash
$ rustscan -a 
Open 10.10.11.219:22
Open 10.10.11.219:80
```

Then I ran `ffuf` to brute force some directories.

```bash
$ ffuf -u http://10.10.11.219/FUZZ -w ~/tools/SecLists/Discovery/Web-Content/common.txt
```

That yielded the `.git` folders, I used `git-dumper` to dump the whole repository. Upon investigating the source code of the application, I've noticed a user called `emily`. I also discovered an executable `magick` and this fragmet of code:

```php
$newname = uniqid();
exec("/var/www/pilgrimage.htb/magick convert /var/www/pilgrimage.htb/tmp/" . $upload->getName() . $mime . " -resize 50% /var/www/pilgrimage.htb/shrunk/" . $newname . $mime);
unlink($upload->getFullPath());
```

The program seems to be invoking this binary to shrink the image that is being uploaded through the website, the program itself is `ImageMagick 7.1.0-49 beta` we discover that by invoking it with `-version`.

```bash
$ ./magick -version
Version: ImageMagick 7.1.0-49 beta Q16-HDRI x86_64 c243c9281:20220911 https://imagemagick.org
Copyright: (C) 1999 ImageMagick Studio LLC
License: https://imagemagick.org/script/license.php
Features: Cipher DPC HDRI OpenMP(4.5) 
Delegates (built-in): bzlib djvu fontconfig freetype jbig jng jpeg lcms lqr lzma openexr png raqm tiff webp x xml zlib
Compiler: gcc (7.5)
```

This version is vulnerable to Arbitrary Remote Leak, https://www.metabaseq.com/imagemagick-zero-days/.

Furthermore, we notice some files of interest in the source code as well, such as the database file.

```php
$db = new PDO('sqlite:/var/db/pilgrimage');
```

# Exploiting

I've used this PoC to generate my payload: https://github.com/Sybil-Scan/imagemagick-lfi-poc 

I've crafted my malicious image to read the database file `/var/db/pilgrimage` and shrink it through the website, I've then downloaded the file and converted the bytes, opened it and after some digging I found the password for user `emiliy`. Then you can login with `ssh`.

# Getting root

I've used `linpeas.sh` to enumerate the system, and I've noticed a process running:

```bash
root         726  0.0  0.0   6816  3072 ?        Ss   15:00   0:00 /bin/bash /usr/sbin/malwarescan.sh
```

I checked the permissions of the script:

```bash
emily@pilgrimage:~$ ls -la /usr/sbin/malwarescan.sh
-rwxr--r-- 1 root root 474 Jun  1 19:14 /usr/sbin/malwarescan.sh
```

And then I saw the script itself:

```bash
emily@pilgrimage:~$ cat /usr/sbin/malwarescan.sh
#!/bin/bash

blacklist=("Executable script" "Microsoft executable")

/usr/bin/inotifywait -m -e create /var/www/pilgrimage.htb/shrunk/ | while read FILE; do
	filename="/var/www/pilgrimage.htb/shrunk/$(/usr/bin/echo "$FILE" | /usr/bin/tail -n 1 | /usr/bin/sed -n -e 's/^.*CREATE //p')"
	binout="$(/usr/local/bin/binwalk -e "$filename")"
        for banned in "${blacklist[@]}"; do
		if [[ "$binout" == *"$banned"* ]]; then
			/usr/bin/rm "$filename"
			break
		fi
	done
done
```

This script seems to be invoking `binwalk`, I searched for some exploits and I found this one: https://www.exploit-db.com/exploits/51249 following the steps in the exploit, I've set up a listener and placed the malicious `png` crafted by the exploit in the `/var/www/pilgrimage.htb/shrunk/` directory.

```bash
emily@pilgrimage:/tmp/syl$ cp ./binwalk_exploit.png /var/www/pilgrimage.htb/shrunk/
```

After a couple of seconds, my listener got a connection, which was with `root` privileges.

# Conclusions

I wanted to investigate a little further how the `magick` binary includes the file that it converts and this article explains it perfectly.

https://www.metabaseq.com/imagemagick-zero-days/

The exploit targets the `tEXt` chunk of the PNG file, and this chunk is being used for storing key-value metadata for the PNG file. The problem comes whenever you use the "profile" string into that metadata, if that is being used as "key" the "value" is being interpreted as a filename, that then the functions `FileToStringInfo` → `FileToBlob` will fetch from the system, and it will populate the "value" with the file's contents.

And to add some speculation on top of it, this almost feels like a backdoor ;).
